-- 009_vendedor_nombre.sql
--
-- PROBLEMA 1 (vendedor): en el checkout se elige un vendedor de la tabla `vendedores`,
-- pero la venta se guardaba con vendedor_id = auth.uid() (la cuenta con la que se inició
-- sesión). En la lista de Ventas eso se mostraba como el email de la cuenta, no el
-- nombre del vendedor que realmente hizo la venta.
-- SOLUCIÓN: guardar el nombre del vendedor elegido en la columna `vendedor_nombre`.
-- El frontend (SalesTable) ya muestra `vendedor_nombre ?? perfiles.nombre`.
--
-- PROBLEMA 2 (precio/ganancia de repuestos): la migración 008 hizo que
-- crear_venta_repuesto calculara el total leyendo productos.precio_venta de la BD.
-- Pero en repuestos el precio de venta NO se guarda en el producto (el formulario
-- solo tiene costo y precio referencial); el precio real lo escribe el vendedor al
-- momento de vender (ProductSearch). Como productos.precio_venta siempre es 0, todas
-- las ventas de repuestos quedaban con total 0 y ganancia negativa (0 - costo).
-- SOLUCIÓN: crear_venta_repuesto usa el precio_unitario que manda el cliente (el que
-- escribió el vendedor) para el total y la ganancia, y mantiene el costo desde la BD
-- (autoritativo, lo fija el admin). Las motos NO cambian: ahí precio_venta sí es un
-- campo real del inventario, así que siguen leyéndose desde la BD.

-- 1) Nueva columna para el nombre del vendedor elegido en el checkout.
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS vendedor_nombre text;

-- 2) Reescribir crear_venta_repuesto:
--    - guarda vendedor_nombre del payload
--    - usa el precio_unitario del payload (precio negociado por el vendedor)
--    - mantiene el costo desde la BD para calcular la ganancia
CREATE OR REPLACE FUNCTION crear_venta_repuesto(payload jsonb)
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
  -- Phase 1: validate stock for all items (lock rows for concurrency safety)
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT stock INTO v_stock
    FROM productos
    WHERE id = (v_item->>'producto_id')::uuid AND activo = true
    FOR UPDATE;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Producto no encontrado o inactivo: %', v_item->>'producto_id';
    END IF;
    IF v_stock < (v_item->>'cantidad')::integer THEN
      RAISE EXCEPTION 'Stock insuficiente para: %', v_item->>'producto_id';
    END IF;
  END LOOP;

  -- Phase 2: calculate totals.
  --   precio_unitario viene del payload (precio que escribió el vendedor).
  --   costo viene de la BD (autoritativo, lo fija el admin).
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT costo INTO v_costo
    FROM productos WHERE id = (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;
    v_precio   := (v_item->>'precio_unitario')::numeric;

    IF v_precio IS NULL OR v_precio <= 0 THEN
      RAISE EXCEPTION 'Precio de venta inválido (0 o vacío) para: %', v_item->>'producto_id';
    END IF;

    v_total    := v_total    + (v_precio * v_cantidad);
    v_ganancia := v_ganancia + ((v_precio - v_costo) * v_cantidad);
  END LOOP;

  -- Phase 3: insert sale with server-authoritative values
  INSERT INTO ventas (vendedor_id, vendedor_nombre, cliente_id, tipo_venta, total, ganancia_neta, notas)
  VALUES (
    auth.uid(),
    NULLIF(payload->>'vendedor_nombre', ''),
    NULLIF(payload->>'cliente_id', '')::uuid,
    'repuesto',
    v_total,
    v_ganancia,
    NULLIF(payload->>'notas', '')
  ) RETURNING id INTO v_venta_id;

  -- Phase 4: insert details and decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT costo INTO v_costo
    FROM productos WHERE id = (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;
    v_precio   := (v_item->>'precio_unitario')::numeric;

    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, costo_unitario)
    VALUES (v_venta_id, (v_item->>'producto_id')::uuid, v_cantidad, v_precio, v_costo);

    UPDATE productos
    SET stock = stock - v_cantidad, updated_at = now()
    WHERE id = (v_item->>'producto_id')::uuid;
  END LOOP;

  RETURN v_venta_id;
END;
$$;

-- 3) Reescribir crear_venta_moto para guardar vendedor_nombre del payload.
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

  -- Phase 2: calculate totals from DB prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT costo, precio_venta INTO v_costo, v_precio
    FROM motos WHERE id = (v_item->>'moto_id')::uuid;
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
    SELECT costo, precio_venta INTO v_costo, v_precio
    FROM motos WHERE id = (v_item->>'moto_id')::uuid;
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
