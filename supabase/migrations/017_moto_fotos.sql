-- Fotos de motos: columna de URLs + bucket de Storage público (lectura),
-- solo admin puede subir/borrar.

ALTER TABLE motos ADD COLUMN IF NOT EXISTS fotos text[] NOT NULL DEFAULT '{}';

INSERT INTO storage.buckets (id, name, public)
VALUES ('motos', 'motos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "motos_fotos_select" ON storage.objects;
CREATE POLICY "motos_fotos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'motos');

DROP POLICY IF EXISTS "motos_fotos_insert" ON storage.objects;
CREATE POLICY "motos_fotos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'motos' AND get_my_rol() = 'admin');

DROP POLICY IF EXISTS "motos_fotos_update" ON storage.objects;
CREATE POLICY "motos_fotos_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'motos' AND get_my_rol() = 'admin');

DROP POLICY IF EXISTS "motos_fotos_delete" ON storage.objects;
CREATE POLICY "motos_fotos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'motos' AND get_my_rol() = 'admin');
