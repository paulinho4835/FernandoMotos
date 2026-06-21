-- 012_reportes.sql
--
-- Datos agregados para la página de Reportes (gráficos). Todo en una sola RPC
-- para minimizar viajes a la BD. Excluye siempre las ventas devueltas
-- (estado='devuelta'). Timezone-aware: America/La_Paz (UTC-4).
--
-- Devuelve jsonb con:
--   ventas_por_dia : array de los últimos 14 días {dia, total, ganancia, count}
--   top_productos  : top 8 repuestos más vendidos {nombre, cantidad, ingresos}
--   por_tipo_mes   : comparativa del mes actual repuestos vs motos
--                    {repuestos:{total,ganancia,count}, motos:{...}}

CREATE OR REPLACE FUNCTION get_reportes_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_ventas_por_dia jsonb;
  v_top_productos  jsonb;
  v_por_tipo_mes   jsonb;
  v_hoy            date := (NOW() AT TIME ZONE 'America/La_Paz')::date;
BEGIN
  -- Ventas por día (últimos 14 días, incluyendo días sin ventas como 0)
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
    WHERE estado IS DISTINCT FROM 'devuelta'
      AND (created_at AT TIME ZONE 'America/La_Paz')::date >= v_hoy - 13
    GROUP BY 1
  ) x ON x.dia = d.dia;

  -- Top 8 repuestos más vendidos (por cantidad), excluyendo ventas devueltas
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  INTO v_top_productos
  FROM (
    SELECT p.nombre                AS nombre,
           SUM(dv.cantidad)        AS cantidad,
           SUM(dv.subtotal)        AS ingresos
    FROM detalle_ventas dv
    JOIN ventas v   ON v.id = dv.venta_id AND v.estado IS DISTINCT FROM 'devuelta'
    JOIN productos p ON p.id = dv.producto_id
    GROUP BY p.nombre
    ORDER BY SUM(dv.cantidad) DESC
    LIMIT 8
  ) t;

  -- Comparativa del mes actual: repuestos vs motos
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
  WHERE estado IS DISTINCT FROM 'devuelta'
    AND (created_at AT TIME ZONE 'America/La_Paz') >= date_trunc('month', v_hoy);

  RETURN jsonb_build_object(
    'ventas_por_dia', v_ventas_por_dia,
    'top_productos',  v_top_productos,
    'por_tipo_mes',   v_por_tipo_mes
  );
END;
$$;
