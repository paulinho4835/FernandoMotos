-- 014_configuracion.sql
--
-- Configuración del negocio (tabla singleton: una sola fila, id siempre = 1).
-- Por ahora guarda el nombre del negocio que aparece en el recibo PDF.
-- Solo el admin puede modificarla; cualquier usuario autenticado puede leerla
-- (el vendedor necesita el nombre para imprimir el recibo).

CREATE TABLE IF NOT EXISTS configuracion (
  id              integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nombre_negocio  text NOT NULL DEFAULT 'Importadora de Motos Fernando',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Fila única inicial.
INSERT INTO configuracion (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS: lectura para autenticados, escritura solo admin.
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracion_select" ON configuracion;
CREATE POLICY "configuracion_select" ON configuracion FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "configuracion_update_admin" ON configuracion;
CREATE POLICY "configuracion_update_admin" ON configuracion FOR UPDATE
  USING (get_my_rol() = 'admin')
  WITH CHECK (get_my_rol() = 'admin');
