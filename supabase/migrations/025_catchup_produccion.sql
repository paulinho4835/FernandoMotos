-- 025_catchup_produccion.sql
--
-- Auditoría del 2026-07-17: producción nunca se manejó con una herramienta
-- de migraciones real, todo se fue pegando a mano en el SQL Editor con el
-- tiempo. Esta migración deja producción al día con lo que el repo ya
-- asume, cerrando estas brechas confirmadas:
--
--   1) configuracion: faltaban modulo_compradores_activo, agente_wa_activo,
--      ultimo_backup_at (019, 018, 021 nunca corrieron del todo ahí).
--   2) pedidos + motos_disponibilidad + conversaciones_wa: NO EXISTÍAN.
--      Pedidos, Compradores y el Agente de WhatsApp estaban silenciosamente
--      rotos en producción (018 nunca corrió).
--   3) ventas.devuelta_at + devolver_venta(): el botón "Devolver venta" de
--      Historial llama a un RPC que no existe (011 nunca corrió), aunque
--      get_dashboard_stats/get_sales_summary/get_reportes_data YA filtran
--      por estado NOT IN ('devuelta','anulada') -- esas sí se actualizaron
--      en algún momento, de forma inconsistente con el resto de 011.
--
-- Todo escrito de forma idempotente (IF NOT EXISTS / CREATE OR REPLACE) para
-- poder correrse sin romper nada si alguna pieza ya existiera.

-- 1) Columnas de configuracion que faltaban.
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS modulo_compradores_activo boolean NOT NULL DEFAULT false;
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS agente_wa_activo boolean NOT NULL DEFAULT false;
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS ultimo_backup_at timestamptz;

-- 2) Pedidos que arma el bot (aún sin confirmar por el vendedor).
CREATE TABLE IF NOT EXISTS pedidos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moto_id           uuid NOT NULL REFERENCES motos(id),
  cantidad          integer NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  cliente_nombre    text NOT NULL,
  cliente_telefono  text NOT NULL,
  cliente_id        uuid REFERENCES clientes(id),
  precio_ofertado   numeric(10,2),
  estado            text NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente','confirmado','cancelado')),
  notas             text,
  venta_id          uuid REFERENCES ventas(id),
  origen            text NOT NULL DEFAULT 'whatsapp',
  adelanto          numeric(10,2) NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_telefono ON pedidos(cliente_telefono);

CREATE OR REPLACE VIEW motos_disponibilidad
WITH (security_invoker = true) AS
SELECT
  m.id AS moto_id,
  m.stock,
  COALESCE(SUM(p.cantidad) FILTER (WHERE p.estado = 'pendiente'), 0)::int AS reservado,
  (m.stock - COALESCE(SUM(p.cantidad) FILTER (WHERE p.estado = 'pendiente'), 0))::int AS disponible
FROM motos m
LEFT JOIN pedidos p ON p.moto_id = m.id
GROUP BY m.id, m.stock;

CREATE TABLE IF NOT EXISTS conversaciones_wa (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono        text NOT NULL UNIQUE,
  historial       jsonb NOT NULL DEFAULT '[]'::jsonb,
  estado          text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','pausada')),
  cliente_nombre  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pedidos_select" ON pedidos;
CREATE POLICY "pedidos_select" ON pedidos FOR SELECT
  USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "pedidos_write" ON pedidos;
CREATE POLICY "pedidos_write" ON pedidos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE conversaciones_wa ENABLE ROW LEVEL SECURITY;
-- Sin políticas para el rol autenticado => solo el service role (webhook) accede.

-- 3) Devoluciones (anulación no destructiva de una venta).
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS devuelta_at timestamptz;

CREATE OR REPLACE FUNCTION devolver_venta(p_venta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado text;
BEGIN
  IF get_my_rol() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Solo los administradores pueden devolver ventas';
  END IF;

  SELECT estado INTO v_estado FROM ventas WHERE id = p_venta_id FOR UPDATE;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Venta no encontrada: %', p_venta_id;
  END IF;
  IF v_estado = 'devuelta' THEN
    RAISE EXCEPTION 'La venta ya fue devuelta';
  END IF;

  UPDATE productos p
  SET stock = p.stock + dv.cantidad, updated_at = now()
  FROM detalle_ventas dv
  WHERE dv.venta_id = p_venta_id AND dv.producto_id = p.id;

  UPDATE motos m
  SET stock = m.stock + dvm.cantidad, updated_at = now()
  FROM detalle_ventas_motos dvm
  WHERE dvm.venta_id = p_venta_id AND dvm.moto_id = m.id;

  UPDATE ventas
  SET estado = 'devuelta', devuelta_at = now()
  WHERE id = p_venta_id;
END;
$$;
