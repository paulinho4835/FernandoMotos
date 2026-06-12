-- 008_security_hardening.sql
--
-- FIX 1: handle_new_user trigger — never trust client-supplied rol in metadata.
-- Before this fix, calling supabase.auth.signUp({ data: { rol: 'admin' } })
-- would create an admin user. Now rol is always 'vendedor'; promotion requires
-- direct DB access (Supabase dashboard → Table Editor).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO perfiles (id, rol, nombre)
  VALUES (
    NEW.id,
    'vendedor',
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- FIX 2: Tighten ventas INSERT policy — only the owner can create their own sale.
DROP POLICY IF EXISTS "ventas_insert" ON ventas;
CREATE POLICY "ventas_insert" ON ventas FOR INSERT
  WITH CHECK (vendedor_id = auth.uid());

-- FIX 3: Tighten detalle_ventas INSERT — require ownership of the parent sale.
DROP POLICY IF EXISTS "detalle_insert" ON detalle_ventas;
CREATE POLICY "detalle_insert" ON detalle_ventas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id AND v.vendedor_id = auth.uid()
    )
  );

-- FIX 4: Tighten detalle_ventas_motos INSERT — same as above.
DROP POLICY IF EXISTS "detalle_motos_insert" ON detalle_ventas_motos;
CREATE POLICY "detalle_motos_insert" ON detalle_ventas_motos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id AND v.vendedor_id = auth.uid()
    )
  );

-- FIX 5a: Add RLS to vendedores table (was missing entirely).
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendedores_select" ON vendedores;
DROP POLICY IF EXISTS "vendedores_insert_admin" ON vendedores;
DROP POLICY IF EXISTS "vendedores_update_admin" ON vendedores;
DROP POLICY IF EXISTS "vendedores_delete_admin" ON vendedores;
CREATE POLICY "vendedores_select" ON vendedores FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "vendedores_insert_admin" ON vendedores FOR INSERT
  WITH CHECK (get_my_rol() = 'admin');
CREATE POLICY "vendedores_update_admin" ON vendedores FOR UPDATE
  USING (get_my_rol() = 'admin');
CREATE POLICY "vendedores_delete_admin" ON vendedores FOR DELETE
  USING (get_my_rol() = 'admin');

-- FIX 5b: Rewrite crear_venta_repuesto
--   - Uses auth.uid() for vendedor_id (never trusts client-supplied value)
--   - Fetches costo and precio_venta from DB (never trusts client-supplied prices)
--   - Recalculates total and ganancia_neta server-side
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

  -- Phase 2: calculate totals from DB prices (not client payload)
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT costo, precio_venta INTO v_costo, v_precio
    FROM productos WHERE id = (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;
    v_total    := v_total    + (v_precio * v_cantidad);
    v_ganancia := v_ganancia + ((v_precio - v_costo) * v_cantidad);
  END LOOP;

  -- Phase 3: insert sale with server-authoritative values
  INSERT INTO ventas (vendedor_id, cliente_id, tipo_venta, total, ganancia_neta, notas)
  VALUES (
    auth.uid(),
    NULLIF(payload->>'cliente_id', '')::uuid,
    'repuesto',
    v_total,
    v_ganancia,
    NULLIF(payload->>'notas', '')
  ) RETURNING id INTO v_venta_id;

  -- Phase 4: insert details and decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT costo, precio_venta INTO v_costo, v_precio
    FROM productos WHERE id = (v_item->>'producto_id')::uuid;
    v_cantidad := (v_item->>'cantidad')::integer;

    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, costo_unitario)
    VALUES (v_venta_id, (v_item->>'producto_id')::uuid, v_cantidad, v_precio, v_costo);

    UPDATE productos
    SET stock = stock - v_cantidad, updated_at = now()
    WHERE id = (v_item->>'producto_id')::uuid;
  END LOOP;

  RETURN v_venta_id;
END;
$$;

-- FIX 5c: Rewrite crear_venta_moto (same logic)
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
  INSERT INTO ventas (vendedor_id, cliente_id, tipo_venta, total, ganancia_neta, notas)
  VALUES (
    auth.uid(),
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
