-- 029_fix_moto_id_fk_bloquea_borrado.sql
--
-- BUG (producción, 2026-07-24): crear_venta_moto (migración 028) inserta la
-- fila de detalle_ventas_motos ANTES de borrar la moto vendida. El FK
-- detalle_ventas_motos.moto_id -> motos(id) es NO ACTION e inmediato (no
-- diferible): la fila que acabamos de insertar bloquea el DELETE de la
-- moto en la misma transacción -> toda la venta se revierte con un 23503
-- silencioso. pedidos.moto_id tiene el mismo problema (cualquier pedido
-- histórico que referencie esa moto también bloquea el borrado).
--
-- Fix: moto_id pasa a ser nullable con ON DELETE SET NULL en ambas tablas.
-- El snapshot de detalle_ventas_motos (marca, modelo, chasis, etc. de la
-- migración 028) ya no depende de esta columna para mostrarse en historial/
-- clientes/CSV, así que perder la referencia no rompe nada.

ALTER TABLE detalle_ventas_motos ALTER COLUMN moto_id DROP NOT NULL;
ALTER TABLE detalle_ventas_motos DROP CONSTRAINT detalle_ventas_motos_moto_id_fkey;
ALTER TABLE detalle_ventas_motos
  ADD CONSTRAINT detalle_ventas_motos_moto_id_fkey
  FOREIGN KEY (moto_id) REFERENCES motos(id) ON DELETE SET NULL;

ALTER TABLE pedidos ALTER COLUMN moto_id DROP NOT NULL;
ALTER TABLE pedidos DROP CONSTRAINT pedidos_moto_id_fkey;
ALTER TABLE pedidos
  ADD CONSTRAINT pedidos_moto_id_fkey
  FOREIGN KEY (moto_id) REFERENCES motos(id) ON DELETE SET NULL;
