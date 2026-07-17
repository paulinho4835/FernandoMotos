-- 022_modulo_toggles.sql
--
-- Super Admin puede ocultar/mostrar los módulos Pedidos y Agente de WhatsApp
-- para el resto de admins/vendedores (igual patrón que modulo_compradores_activo).
-- Por defecto quedan activos (true) para no romper el comportamiento actual.

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS modulo_pedidos_activo boolean NOT NULL DEFAULT true;

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS modulo_agente_wa_visible boolean NOT NULL DEFAULT true;
