-- 011_devoluciones.sql
--
-- DEVOLUCIONES (anulación no destructiva de una venta).
-- A diferencia de eliminar_venta (010), que BORRA la venta y sus detalles,
-- una devolución MANTIENE el registro de la venta para trazabilidad contable,
-- pero la marca como estado='devuelta', restaura el stock y la excluye de los
-- totales/estadísticas (ventas, ganancias, dashboard, reportes).
--
-- Solo administradores pueden devolver.

-- 1) Marca de tiempo de la devolución.
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS devuelta_at timestamptz;

-- 2) RPC para devolver una venta: restaura stock y marca estado='devuelta'.
CREATE OR REPLACE FUNCTION devolver_venta(p_venta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_estado text;
BEGIN
  IF get_my_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden devolver ventas';
  END IF;

  SELECT estado INTO v_estado FROM ventas WHERE id = p_venta_id FOR UPDATE;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Venta no encontrada: %', p_venta_id;
  END IF;
  IF v_estado = 'devuelta' THEN
    RAISE EXCEPTION 'La venta ya fue devuelta';
  END IF;

  -- Restaurar stock de repuestos
  UPDATE productos p
  SET stock = p.stock + dv.cantidad, updated_at = now()
  FROM detalle_ventas dv
  WHERE dv.venta_id = p_venta_id AND dv.producto_id = p.id;

  -- Restaurar stock de motos
  UPDATE motos m
  SET stock = m.stock + dvm.cantidad, updated_at = now()
  FROM detalle_ventas_motos dvm
  WHERE dvm.venta_id = p_venta_id AND dvm.moto_id = m.id;

  UPDATE ventas
  SET estado = 'devuelta', devuelta_at = now()
  WHERE id = p_venta_id;
END;
$$;

-- 3) Excluir ventas devueltas de las estadísticas del dashboard de HOY.
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT jsonb_build_object(
    'ventas_repuestos_hoy', COALESCE(SUM(total) FILTER (WHERE tipo_venta='repuesto' AND (created_at AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date), 0),
    'ganancia_repuestos_hoy', COALESCE(SUM(ganancia_neta) FILTER (WHERE tipo_venta='repuesto' AND (created_at AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date), 0),
    'count_repuestos_hoy', COUNT(*) FILTER (WHERE tipo_venta='repuesto' AND (created_at AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date),
    'ventas_motos_hoy', COALESCE(SUM(total) FILTER (WHERE tipo_venta='moto' AND (created_at AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date), 0),
    'ganancia_motos_hoy', COALESCE(SUM(ganancia_neta) FILTER (WHERE tipo_venta='moto' AND (created_at AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date), 0),
    'count_motos_hoy', COUNT(*) FILTER (WHERE tipo_venta='moto' AND (created_at AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date),
    'total_hoy', COALESCE(SUM(total) FILTER (WHERE (created_at AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date), 0),
    'ganancia_total_hoy', COALESCE(SUM(ganancia_neta) FILTER (WHERE (created_at AT TIME ZONE 'America/La_Paz')::date = (NOW() AT TIME ZONE 'America/La_Paz')::date), 0)
  )
  FROM ventas
  WHERE estado IS DISTINCT FROM 'devuelta';
$$;

-- 4) Excluir ventas devueltas del resumen por período.
CREATE OR REPLACE FUNCTION get_sales_summary()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT jsonb_build_object(
    'ventas_semana',   COALESCE(SUM(total)        FILTER (WHERE (created_at AT TIME ZONE 'America/La_Paz') >= date_trunc('week',  (NOW() AT TIME ZONE 'America/La_Paz')::date)), 0),
    'ganancia_semana', COALESCE(SUM(ganancia_neta) FILTER (WHERE (created_at AT TIME ZONE 'America/La_Paz') >= date_trunc('week',  (NOW() AT TIME ZONE 'America/La_Paz')::date)), 0),
    'count_semana',    COUNT(*)                    FILTER (WHERE (created_at AT TIME ZONE 'America/La_Paz') >= date_trunc('week',  (NOW() AT TIME ZONE 'America/La_Paz')::date)),
    'ventas_mes',      COALESCE(SUM(total)        FILTER (WHERE (created_at AT TIME ZONE 'America/La_Paz') >= date_trunc('month', (NOW() AT TIME ZONE 'America/La_Paz')::date)), 0),
    'ganancia_mes',    COALESCE(SUM(ganancia_neta) FILTER (WHERE (created_at AT TIME ZONE 'America/La_Paz') >= date_trunc('month', (NOW() AT TIME ZONE 'America/La_Paz')::date)), 0),
    'count_mes',       COUNT(*)                    FILTER (WHERE (created_at AT TIME ZONE 'America/La_Paz') >= date_trunc('month', (NOW() AT TIME ZONE 'America/La_Paz')::date)),
    'ventas_total',    COALESCE(SUM(total),        0),
    'ganancia_total',  COALESCE(SUM(ganancia_neta),0),
    'count_total',     COUNT(*)
  )
  FROM ventas
  WHERE estado IS DISTINCT FROM 'devuelta';
$$;
