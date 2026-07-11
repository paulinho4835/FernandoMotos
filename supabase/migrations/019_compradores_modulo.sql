-- 019_compradores_modulo.sql
-- Rol super_admin, adelanto en pedidos, y toggle del módulo de compradores.

-- 1) Ampliar rol para incluir super_admin.
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('admin','vendedor','super_admin'));

-- 2) Adelanto (depósito) por pedido. Lo registra el bot o el staff.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS adelanto numeric(10,2) NOT NULL DEFAULT 0;

-- 3) Toggle del módulo de compradores (separado de agente_wa_activo).
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS modulo_compradores_activo boolean NOT NULL DEFAULT false;

-- 4) Marcar el perfil dueño como super_admin (correr manual con el id real):
-- UPDATE perfiles SET rol='super_admin' WHERE id='<uuid-del-dueño>';

-- 5) La escritura de configuracion la hacen admin Y super_admin (el panel
--    /super-admin y los toggles viven ahí). La policy original (014) solo
--    permitía 'admin', lo que bloqueaba silenciosamente al super_admin.
DROP POLICY IF EXISTS "configuracion_update_admin" ON configuracion;
CREATE POLICY "configuracion_update_admin" ON configuracion FOR UPDATE
  USING (get_my_rol() IN ('admin','super_admin'))
  WITH CHECK (get_my_rol() IN ('admin','super_admin'));
