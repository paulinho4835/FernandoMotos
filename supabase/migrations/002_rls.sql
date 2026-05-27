-- supabase/migrations/002_rls.sql

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE motos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas_motos ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT rol FROM perfiles WHERE id = auth.uid()
$$;

-- perfiles
CREATE POLICY "perfiles_select_own" ON perfiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "perfiles_update_own" ON perfiles FOR UPDATE
  USING (id = auth.uid());

-- clientes
CREATE POLICY "clientes_select" ON clientes FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "clientes_insert" ON clientes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "clientes_update_admin" ON clientes FOR UPDATE
  USING (get_my_rol() = 'admin');
CREATE POLICY "clientes_delete_admin" ON clientes FOR DELETE
  USING (get_my_rol() = 'admin');

-- productos
CREATE POLICY "productos_select" ON productos FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "productos_insert_admin" ON productos FOR INSERT
  WITH CHECK (get_my_rol() = 'admin');
CREATE POLICY "productos_update_admin" ON productos FOR UPDATE
  USING (get_my_rol() = 'admin');
CREATE POLICY "productos_delete_admin" ON productos FOR DELETE
  USING (get_my_rol() = 'admin');

-- motos
CREATE POLICY "motos_select" ON motos FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "motos_insert_admin" ON motos FOR INSERT
  WITH CHECK (get_my_rol() = 'admin');
CREATE POLICY "motos_update_admin" ON motos FOR UPDATE
  USING (get_my_rol() = 'admin');
CREATE POLICY "motos_delete_admin" ON motos FOR DELETE
  USING (get_my_rol() = 'admin');

-- ventas
CREATE POLICY "ventas_select_own" ON ventas FOR SELECT
  USING (vendedor_id = auth.uid() OR get_my_rol() = 'admin');
CREATE POLICY "ventas_insert" ON ventas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- detalle_ventas
CREATE POLICY "detalle_select" ON detalle_ventas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id
        AND (v.vendedor_id = auth.uid() OR get_my_rol() = 'admin')
    )
  );
CREATE POLICY "detalle_insert" ON detalle_ventas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- detalle_ventas_motos
CREATE POLICY "detalle_motos_select" ON detalle_ventas_motos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventas v
      WHERE v.id = venta_id
        AND (v.vendedor_id = auth.uid() OR get_my_rol() = 'admin')
    )
  );
CREATE POLICY "detalle_motos_insert" ON detalle_ventas_motos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
