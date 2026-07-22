-- 027_modulo_fotos_motos.sql
-- Toggle de Super Admin para la subida de fotos de motos (Cloudflare R2).
-- Arranca desactivado hasta confirmar el flujo en producción.
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS modulo_fotos_motos_activo boolean NOT NULL DEFAULT false;
