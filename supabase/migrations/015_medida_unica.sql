-- Consolidate medida_interna/medida_externa/altura into a single free-text "medida" field
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS medida text;

UPDATE productos
SET medida = NULLIF(TRIM(BOTH ' / ' FROM
  COALESCE(medida_interna || ' / ', '') ||
  COALESCE(medida_externa || ' / ', '') ||
  COALESCE(altura, '')
), '')
WHERE medida IS NULL
  AND (medida_interna IS NOT NULL OR medida_externa IS NOT NULL OR altura IS NOT NULL);

ALTER TABLE productos
  DROP COLUMN IF EXISTS medida_interna,
  DROP COLUMN IF EXISTS medida_externa,
  DROP COLUMN IF EXISTS altura;
