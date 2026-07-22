-- 028_eliminar_moto_al_vender.sql
--
-- Cada moto es única (chasis/motor no se repiten): al venderse (stock llega a 0),
-- la fila de `motos` se borra para no dejar inventario fantasma con stock=0.
-- El historial de venta sobrevive porque `detalle_ventas_motos` guarda una copia
-- ("snapshot") de los datos descriptivos de la moto en el momento de la venta.
-- Si la venta se elimina o devuelve después, la moto se reconstruye desde ese
-- snapshot (mismo id, para que los joins existentes sigan funcionando). Las
-- fotos NO se restauran (ya se borraron de Cloudflare R2).

-- 1) Columnas snapshot en detalle_ventas_motos.
ALTER TABLE detalle_ventas_motos
  ADD COLUMN IF NOT EXISTS codigo         text,
  ADD COLUMN IF NOT EXISTS marca          text,
  ADD COLUMN IF NOT EXISTS modelo         text,
  ADD COLUMN IF NOT EXISTS color          text,
  ADD COLUMN IF NOT EXISTS anio           integer,
  ADD COLUMN IF NOT EXISTS numero_chasis  text,
  ADD COLUMN IF NOT EXISTS numero_motor   text,
  ADD COLUMN IF NOT EXISTS motor_cc       integer,
  ADD COLUMN IF NOT EXISTS ubicacion      text,
  ADD COLUMN IF NOT EXISTS proveedor      text;

-- Backfill de ventas viejas: copiar desde la moto mientras todavía existe
-- (todas las motos vendidas antes de esta migración siguen vivas con stock=0).
UPDATE detalle_ventas_motos dvm
SET codigo = m.codigo, marca = m.marca, modelo = m.modelo, color = m.color,
    anio = m.anio, numero_chasis = m.numero_chasis, numero_motor = m.numero_motor,
    motor_cc = m.motor_cc, ubicacion = m.ubicacion, proveedor = m.proveedor
FROM motos m
WHERE dvm.moto_id = m.id AND dvm.marca IS NULL;

-- 2) crear_venta_moto: snapshotea, borra la moto si el stock queda en 0, y
-- devuelve las fotos a borrar de R2 (el borrado real lo hace la app, best-effort).
-- Cambia de RETURNS uuid a RETURNS jsonb, así que hay que dropear primero.
DROP FUNCTION IF EXISTS crear_venta_moto(jsonb);

CREATE FUNCTION crear_venta_moto(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_venta_id      uuid;
  v_item          jsonb;
  v_stock         integer;
  v_costo         numeric(10,2);
  v_precio        numeric(10,2);
  v_cantidad      integer;
  v_total         numeric(10,2) := 0;
  v_ganancia      numeric(10,2) := 0;
  v_moto          record;
  v_stock_restante integer;
  v_fotos_borrar  text[] := '{}';
BEGIN
  -- Phase 1: validate stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT stock INTO v_stock
    FROM motos
    WHERE id = (v_item->>'moto_id')::uuid AND activo = true
    FOR UPDATE;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Moto no encontrada o inactiva: %', v_item->>'moto_id';
    END IF;
    IF v_stock < (v_item->>'cantidad')::integer THEN
      RAISE EXCEPTION 'Stock insuficiente para moto: %', v_item->>'moto_id';
    END IF;
  END LOOP;

  -- Phase 2: calculate totals from DB prices (costo desde motos_costos)
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT precio_venta INTO v_precio FROM motos WHERE id = (v_item->>'moto_id')::uuid;
    SELECT COALESCE(costo, 0) INTO v_costo FROM motos_costos WHERE moto_id = (v_item->>'moto_id')::uuid;
    v_costo := COALESCE(v_costo, 0);
    v_cantidad := (v_item->>'cantidad')::integer;
    v_total    := v_total    + (v_precio * v_cantidad);
    v_ganancia := v_ganancia + ((v_precio - v_costo) * v_cantidad);
  END LOOP;

  -- Phase 3: insert sale
  INSERT INTO ventas (vendedor_id, vendedor_nombre, cliente_id, tipo_venta, total, ganancia_neta, notas)
  VALUES (
    auth.uid(),
    NULLIF(payload->>'vendedor_nombre', ''),
    NULLIF(payload->>'cliente_id', '')::uuid,
    'moto',
    v_total,
    v_ganancia,
    NULLIF(payload->>'notas', '')
  ) RETURNING id INTO v_venta_id;

  -- Phase 4: snapshot + insert details + decrement stock + borrar moto si stock llega a 0
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT * INTO v_moto FROM motos WHERE id = (v_item->>'moto_id')::uuid;
    SELECT COALESCE(costo, 0) INTO v_costo FROM motos_costos WHERE moto_id = v_moto.id;
    v_costo := COALESCE(v_costo, 0);
    v_precio := v_moto.precio_venta;
    v_cantidad := (v_item->>'cantidad')::integer;

    INSERT INTO detalle_ventas_motos (
      venta_id, moto_id, cantidad, precio_unitario, costo_unitario,
      codigo, marca, modelo, color, anio, numero_chasis, numero_motor, motor_cc, ubicacion, proveedor
    )
    VALUES (
      v_venta_id, v_moto.id, v_cantidad, v_precio, v_costo,
      v_moto.codigo, v_moto.marca, v_moto.modelo, v_moto.color, v_moto.anio,
      v_moto.numero_chasis, v_moto.numero_motor, v_moto.motor_cc, v_moto.ubicacion, v_moto.proveedor
    );

    UPDATE motos
    SET stock = stock - v_cantidad, updated_at = now()
    WHERE id = v_moto.id
    RETURNING stock INTO v_stock_restante;

    IF v_stock_restante <= 0 THEN
      IF v_moto.fotos IS NOT NULL AND array_length(v_moto.fotos, 1) > 0 THEN
        v_fotos_borrar := v_fotos_borrar || v_moto.fotos;
      END IF;
      DELETE FROM motos_costos WHERE moto_id = v_moto.id;
      DELETE FROM motos WHERE id = v_moto.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('venta_id', v_venta_id, 'fotos_a_borrar', to_jsonb(v_fotos_borrar));
END;
$$;

-- 3) eliminar_venta: si la moto ya no existe (se vendió y se borró), la
-- reconstruye desde el snapshot en vez de fallar en silencio con un UPDATE de 0 filas.
CREATE OR REPLACE FUNCTION eliminar_venta(p_venta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row record;
BEGIN
  IF get_my_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar ventas';
  END IF;

  -- Restaurar stock de repuestos
  UPDATE productos p
  SET stock = p.stock + dv.cantidad, updated_at = now()
  FROM detalle_ventas dv
  WHERE dv.venta_id = p_venta_id AND dv.producto_id = p.id;

  -- Restaurar (o reconstruir) motos
  FOR v_row IN SELECT * FROM detalle_ventas_motos WHERE venta_id = p_venta_id LOOP
    UPDATE motos SET stock = stock + v_row.cantidad, updated_at = now() WHERE id = v_row.moto_id;
    IF NOT FOUND THEN
      INSERT INTO motos (
        id, codigo, marca, modelo, anio, color, motor_cc, numero_motor, numero_chasis,
        precio_venta, stock, stock_minimo, ubicacion, proveedor, fotos, activo
      ) VALUES (
        v_row.moto_id, v_row.codigo, v_row.marca, v_row.modelo, v_row.anio, v_row.color,
        v_row.motor_cc, v_row.numero_motor, v_row.numero_chasis,
        v_row.precio_unitario, v_row.cantidad, 1, v_row.ubicacion, v_row.proveedor, '{}', true
      );
      INSERT INTO motos_costos (moto_id, costo) VALUES (v_row.moto_id, v_row.costo_unitario)
        ON CONFLICT (moto_id) DO UPDATE SET costo = EXCLUDED.costo;
    END IF;
  END LOOP;

  DELETE FROM detalle_ventas WHERE venta_id = p_venta_id;
  DELETE FROM detalle_ventas_motos WHERE venta_id = p_venta_id;
  DELETE FROM ventas WHERE id = p_venta_id;
END;
$$;

-- 4) devolver_venta: misma reconstrucción, pero no destructiva (no borra filas).
CREATE OR REPLACE FUNCTION devolver_venta(p_venta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado text;
  v_row    record;
BEGIN
  IF get_my_rol() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Solo los administradores pueden devolver ventas';
  END IF;

  SELECT estado INTO v_estado FROM ventas WHERE id = p_venta_id FOR UPDATE;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Venta no encontrada: %', p_venta_id;
  END IF;
  IF v_estado = 'devuelta' THEN
    RAISE EXCEPTION 'La venta ya fue devuelta';
  END IF;

  UPDATE productos p
  SET stock = p.stock + dv.cantidad, updated_at = now()
  FROM detalle_ventas dv
  WHERE dv.venta_id = p_venta_id AND dv.producto_id = p.id;

  FOR v_row IN SELECT * FROM detalle_ventas_motos WHERE venta_id = p_venta_id LOOP
    UPDATE motos SET stock = stock + v_row.cantidad, updated_at = now() WHERE id = v_row.moto_id;
    IF NOT FOUND THEN
      INSERT INTO motos (
        id, codigo, marca, modelo, anio, color, motor_cc, numero_motor, numero_chasis,
        precio_venta, stock, stock_minimo, ubicacion, proveedor, fotos, activo
      ) VALUES (
        v_row.moto_id, v_row.codigo, v_row.marca, v_row.modelo, v_row.anio, v_row.color,
        v_row.motor_cc, v_row.numero_motor, v_row.numero_chasis,
        v_row.precio_unitario, v_row.cantidad, 1, v_row.ubicacion, v_row.proveedor, '{}', true
      );
      INSERT INTO motos_costos (moto_id, costo) VALUES (v_row.moto_id, v_row.costo_unitario)
        ON CONFLICT (moto_id) DO UPDATE SET costo = EXCLUDED.costo;
    END IF;
  END LOOP;

  UPDATE ventas
  SET estado = 'devuelta', devuelta_at = now()
  WHERE id = p_venta_id;
END;
$$;
