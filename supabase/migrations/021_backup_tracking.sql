-- 021_backup_tracking.sql
--
-- Registra la fecha del último backup manual descargado desde Super Admin,
-- para mostrar "Último backup: hace X días" en el panel.

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS ultimo_backup_at timestamptz;
