-- Add measurement fields and reference price to productos
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS medida_interna  text,
  ADD COLUMN IF NOT EXISTS medida_externa  text,
  ADD COLUMN IF NOT EXISTS altura          text,
  ADD COLUMN IF NOT EXISTS precio_referencial numeric(10,2);
