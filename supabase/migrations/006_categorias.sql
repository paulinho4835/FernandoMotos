-- Tabla de categorías de productos
CREATE TABLE categorias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL UNIQUE,
  descripcion text,
  orden       integer NOT NULL DEFAULT 0,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES categorias(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_select" ON categorias FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "categorias_insert_admin" ON categorias FOR INSERT
  WITH CHECK (get_my_rol() = 'admin');
CREATE POLICY "categorias_update_admin" ON categorias FOR UPDATE
  USING (get_my_rol() = 'admin');
CREATE POLICY "categorias_delete_admin" ON categorias FOR DELETE
  USING (get_my_rol() = 'admin');

-- Categorías iniciales comunes en repuestos de motos
INSERT INTO categorias (nombre, orden) VALUES
  ('Llantas',         1),
  ('Retenes',         2),
  ('Luces',           3),
  ('Filtros',         4),
  ('Frenos',          5),
  ('Cadenas',         6),
  ('Aceites',         7),
  ('Eléctrico',       8),
  ('Carrocería',      9),
  ('Motor',           10),
  ('Suspensión',      11),
  ('Transmisión',     12);
