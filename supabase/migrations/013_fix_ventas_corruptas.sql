-- 013_fix_ventas_corruptas.sql
--
-- LIMPIEZA de ventas de repuestos corruptas.
-- Durante la ventana en que estuvo activa la migración 008 (antes de la 009),
-- crear_venta_repuesto leía productos.precio_venta de la BD para el total. En
-- repuestos ese campo siempre vale 0 (el precio real lo escribe el vendedor al
-- vender), así que esas ventas quedaron con total=0 y ganancia_neta negativa
-- (0 - costo). El precio real de venta se perdió y NO es recuperable.
--
-- Estas filas arrastran la ganancia de semana/mes/histórico a negativo.
-- SOLUCIÓN: anularlas (estado='anulada', ganancia_neta=0) para sacarlas de las
-- estadísticas, conservando el registro. NO se toca el stock: las piezas ya
-- salieron físicamente cuando se hizo la venta.

-- 1) Anular las ventas de repuestos con total 0 (firma inequívoca del bug;
--    ningún repuesto se vende en Bs 0).
UPDATE ventas
SET estado = 'anulada', ganancia_neta = 0
WHERE tipo_venta = 'repuesto'
  AND total = 0
  AND estado <> 'anulada';

-- 2) Las funciones de estadísticas/reportes deben excluir también 'anulada'
--    (además de 'devuelta'). Se reescriben con el filtro ampliado.

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
  WHERE estado NOT IN ('devuelta', 'anulada');
$$;

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
  WHERE estado NOT IN ('devuelta', 'anulada');
$$;

CREATE OR REPLACE FUNCTION get_reportes_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_ventas_por_dia jsonb;
  v_top_productos  jsonb;
  v_por_tipo_mes   jsonb;
  v_hoy            date := (NOW() AT TIME ZONE 'America/La_Paz')::date;
BEGIN
  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'dia', to_char(d.dia, 'YYYY-MM-DD'),
             'total', COALESCE(x.total, 0),
             'ganancia', COALESCE(x.ganancia, 0),
             'count', COALESCE(x.count, 0)
           ) ORDER BY d.dia
         ), '[]'::jsonb)
  INTO v_ventas_por_dia
  FROM generate_series(v_hoy - 13, v_hoy, interval '1 day') AS d(dia)
  LEFT JOIN (
    SELECT (created_at AT TIME ZONE 'America/La_Paz')::date AS dia,
           SUM(total)         AS total,
           SUM(ganancia_neta) AS ganancia,
           COUNT(*)           AS count
    FROM ventas
    WHERE estado NOT IN ('devuelta', 'anulada')
      AND (created_at AT TIME ZONE 'America/La_Paz')::date >= v_hoy - 13
    GROUP BY 1
  ) x ON x.dia = d.dia;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  INTO v_top_productos
  FROM (
    SELECT p.nombre                AS nombre,
           SUM(dv.cantidad)        AS cantidad,
           SUM(dv.subtotal)        AS ingresos
    FROM detalle_ventas dv
    JOIN ventas v   ON v.id = dv.venta_id AND v.estado NOT IN ('devuelta', 'anulada')
    JOIN productos p ON p.id = dv.producto_id
    GROUP BY p.nombre
    ORDER BY SUM(dv.cantidad) DESC
    LIMIT 8
  ) t;

  SELECT jsonb_build_object(
    'repuestos', jsonb_build_object(
      'total',    COALESCE(SUM(total)         FILTER (WHERE tipo_venta='repuesto'), 0),
      'ganancia', COALESCE(SUM(ganancia_neta) FILTER (WHERE tipo_venta='repuesto'), 0),
      'count',    COUNT(*)                    FILTER (WHERE tipo_venta='repuesto')
    ),
    'motos', jsonb_build_object(
      'total',    COALESCE(SUM(total)         FILTER (WHERE tipo_venta='moto'), 0),
      'ganancia', COALESCE(SUM(ganancia_neta) FILTER (WHERE tipo_venta='moto'), 0),
      'count',    COUNT(*)                    FILTER (WHERE tipo_venta='moto')
    )
  )
  INTO v_por_tipo_mes
  FROM ventas
  WHERE estado NOT IN ('devuelta', 'anulada')
    AND (created_at AT TIME ZONE 'America/La_Paz') >= date_trunc('month', v_hoy);

  RETURN jsonb_build_object(
    'ventas_por_dia', v_ventas_por_dia,
    'top_productos',  v_top_productos,
    'por_tipo_mes',   v_por_tipo_mes
  );
END;
$$;
