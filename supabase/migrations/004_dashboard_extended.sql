-- 004_dashboard_extended.sql

-- Resumen de ventas por período (semana / mes / histórico)
CREATE OR REPLACE FUNCTION get_sales_summary()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT jsonb_build_object(
    'ventas_semana',   COALESCE(SUM(total)        FILTER (WHERE created_at >= date_trunc('week',  CURRENT_DATE)), 0),
    'ganancia_semana', COALESCE(SUM(ganancia_neta) FILTER (WHERE created_at >= date_trunc('week',  CURRENT_DATE)), 0),
    'count_semana',    COUNT(*)                    FILTER (WHERE created_at >= date_trunc('week',  CURRENT_DATE)),
    'ventas_mes',      COALESCE(SUM(total)        FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0),
    'ganancia_mes',    COALESCE(SUM(ganancia_neta) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0),
    'count_mes',       COUNT(*)                    FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'ventas_total',    COALESCE(SUM(total),        0),
    'ganancia_total',  COALESCE(SUM(ganancia_neta),0),
    'count_total',     COUNT(*)
  )
  FROM ventas;
$$;

-- Valor del inventario actual
CREATE OR REPLACE FUNCTION get_inventory_value()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT jsonb_build_object(
    'costo_productos',    COALESCE((SELECT SUM(costo * stock)       FROM productos WHERE activo AND stock > 0), 0),
    'valor_productos',    COALESCE((SELECT SUM(precio_venta * stock) FROM productos WHERE activo AND stock > 0), 0),
    'unidades_productos', COALESCE((SELECT SUM(stock)               FROM productos WHERE activo AND stock > 0), 0),
    'costo_motos',        COALESCE((SELECT SUM(costo * stock)       FROM motos     WHERE activo AND stock > 0), 0),
    'valor_motos',        COALESCE((SELECT SUM(precio_venta * stock) FROM motos    WHERE activo AND stock > 0), 0),
    'unidades_motos',     COALESCE((SELECT SUM(stock)               FROM motos     WHERE activo AND stock > 0), 0)
  )
$$;
