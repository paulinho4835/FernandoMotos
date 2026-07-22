-- 026_motos_proveedor.sql
-- Campo Proveedor en motos (texto libre), visible solo para admin en el UI.
ALTER TABLE motos ADD COLUMN IF NOT EXISTS proveedor text;
