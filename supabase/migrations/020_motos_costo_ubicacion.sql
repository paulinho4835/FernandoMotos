-- 020_motos_costo_ubicacion.sql
-- Motos: costo protegido en tabla aparte (solo admin/super_admin), ubicacion editable.
-- IMPORTANTE: get_inventory_value es LANGUAGE sql y depende de motos.costo, así que
-- debe recrearse ANTES de dropear la columna, o el DROP COLUMN falla por dependencia.

-- 1) Tabla de costos de motos, protegida por RLS.
CREATE TABLE IF NOT EXISTS motos_costos (
  moto_id     uuid PRIMARY KEY REFERENCES motos(id) ON DELETE CASCADE,
  costo       numeric(10,2) NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Copiar los costos existentes desde motos.
INSERT INTO motos_costos (moto_id, costo)
  SELECT id, costo FROM motos
  ON CONFLICT (moto_id) DO NOTHING;

ALTER TABLE motos_costos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "motos_costos_admin" ON motos_costos;
CREATE POLICY "motos_costos_admin" ON motos_costos FOR ALL
  USING (get_my_rol() IN ('admin','super_admin'))
  WITH CHECK (get_my_rol() IN ('admin','super_admin'));

-- 2) Ubicacion editable en motos.
ALTER TABLE motos ADD COLUMN IF NOT EXISTS ubicacion text;

-- 3) Recrear get_inventory_value leyendo costo de motos_costos (antes del DROP).
CREATE OR REPLACE FUNCTION get_inventory_value()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT jsonb_build_object(
    'costo_productos',    COALESCE((SELECT SUM(costo * stock)              FROM productos WHERE activo AND stock > 0), 0),
    'valor_productos',    COALESCE((SELECT SUM(precio_referencial * stock) FROM productos WHERE activo AND stock > 0), 0),
    'unidades_productos', COALESCE((SELECT SUM(stock)               FROM productos WHERE activo AND stock > 0), 0),
    'costo_motos',        COALESCE((SELECT SUM(mc.costo * m.stock)
                                      FROM motos m JOIN motos_costos mc ON mc.moto_id = m.id
                                      WHERE m.activo AND m.stock > 0), 0),
    'valor_motos',        COALESCE((SELECT SUM(precio_venta * stock) FROM motos    WHERE activo AND stock > 0), 0),
    'unidades_motos',     COALESCE((SELECT SUM(stock)               FROM motos     WHERE activo AND stock > 0), 0)
  )
$$;

-- 4) Recrear crear_venta_moto leyendo costo de motos_costos (plpgsql, SECURITY DEFINER).
CREATE OR REPLACE FUNCTION crear_venta_moto(payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_venta_id  uuid;
  v_item      jsonb;
  v_stock     integer;
  v_costo     numeric(10,2);
  v_precio    numeric(10,2);
  v_cantidad  integer;
  v_total     numeric(10,2) := 0;
  v_ganancia  numeric(10,2) := 0;
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

  -- Phase 4: insert details and decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT precio_venta INTO v_precio FROM motos WHERE id = (v_item->>'moto_id')::uuid;
    SELECT COALESCE(costo, 0) INTO v_costo FROM motos_costos WHERE moto_id = (v_item->>'moto_id')::uuid;
    v_costo := COALESCE(v_costo, 0);
    v_cantidad := (v_item->>'cantidad')::integer;

    INSERT INTO detalle_ventas_motos (venta_id, moto_id, cantidad, precio_unitario, costo_unitario)
    VALUES (v_venta_id, (v_item->>'moto_id')::uuid, v_cantidad, v_precio, v_costo);

    UPDATE motos
    SET stock = stock - v_cantidad, updated_at = now()
    WHERE id = (v_item->>'moto_id')::uuid;
  END LOOP;

  RETURN v_venta_id;
END;
$$;

-- 5) Ahora sí, sacar costo de motos (deja de viajar al cliente del empleado).
ALTER TABLE motos DROP COLUMN IF EXISTS costo;
