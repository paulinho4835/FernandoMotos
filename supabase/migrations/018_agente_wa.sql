-- 018_agente_wa.sql
-- Agente de ventas de motos por WhatsApp: pedidos pendientes (reserva blanda),
-- estado de conversación del bot, y flag de activación.

-- 1) Pedidos que arma el bot (aún sin confirmar por el vendedor).
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
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_telefono ON pedidos(cliente_telefono);

-- 2) Reserva blanda: disponible = stock - (pedidos pendientes). No toca `motos`.
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

-- 3) Estado de la conversación del bot por teléfono (memoria + control humano).
CREATE TABLE IF NOT EXISTS conversaciones_wa (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono        text NOT NULL UNIQUE,
  historial       jsonb NOT NULL DEFAULT '[]'::jsonb,
  estado          text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','pausada')),
  cliente_nombre  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 4) Flag para prender/apagar el agente desde el POS.
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS agente_wa_activo boolean NOT NULL DEFAULT false;

-- 5) RLS.
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
-- Lectura y escritura para cualquier usuario autenticado (admin o vendedor),
-- igual criterio que `ventas`. El webhook usa service role y salta RLS.
DROP POLICY IF EXISTS "pedidos_select" ON pedidos;
CREATE POLICY "pedidos_select" ON pedidos FOR SELECT
  USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "pedidos_write" ON pedidos;
CREATE POLICY "pedidos_write" ON pedidos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE conversaciones_wa ENABLE ROW LEVEL SECURITY;
-- Sin políticas para el rol autenticado => solo el service role (webhook) accede.
