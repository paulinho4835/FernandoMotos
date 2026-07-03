-- Agrega dirección y teléfono del negocio a la configuración singleton,
-- para mostrarlos en el encabezado del recibo PDF.
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS telefono  text;
