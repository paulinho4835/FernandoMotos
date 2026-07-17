-- 024_perfiles_rol_check_drift.sql
--
-- El constraint perfiles_rol_check en producción estaba desincronizado del
-- repo: solo permitía ('admin','vendedor','empleado') -- 'empleado' es un
-- valor que se agregó directo en producción y nunca quedó en una migración
-- del repo; 'super_admin' (agregado en 019_compradores_modulo.sql) tampoco
-- había llegado a producción pese a existir en el repo desde esa migración.
--
-- Encontrado el 2026-07-17 al intentar promover una cuenta a super_admin:
-- "new row for relation perfiles violates check constraint perfiles_rol_check".

ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE perfiles ADD CONSTRAINT perfiles_rol_check
  CHECK (rol IN ('admin','vendedor','empleado','super_admin'));
