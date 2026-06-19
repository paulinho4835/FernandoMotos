-- supabase/migrations/003_rpcs.sql

-- RPC: crear venta de repuestos
CREATE OR REPLACE FUNCTION crear_venta_repuesto(payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_venta_id  uuid;
  v_item      jsonb;
  v_stock     integer;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT stock INTO v_stock
    FROM productos WHERE id = (v_item->>'producto_id')::uuid FOR UPDATE;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Producto no encontrado: %', v_item->>'producto_id';
    END IF;
    IF v_stock < (v_item->>'cantidad')::integer THEN
      RAISE EXCEPTION 'Stock insuficiente para: %', v_item->>'producto_id';
    END IF;
  END LOOP;

  INSERT INTO ventas (vendedor_id, cliente_id, tipo_venta, total, ganancia_neta, notas)
  VALUES (
    (payload->>'vendedor_id')::uuid,
    NULLIF(payload->>'cliente_id','')::uuid,
    'repuesto',
    (payload->>'total')::numeric,
    (payload->>'ganancia_neta')::numeric,
    NULLIF(payload->>'notas','')
  ) RETURNING id INTO v_venta_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, costo_unitario)
    VALUES (
      v_venta_id,
      (v_item->>'producto_id')::uuid,
      (v_item->>'cantidad')::integer,
      (v_item->>'precio_unitario')::numeric,
      (v_item->>'costo_unitario')::numeric
    );
    UPDATE productos
    SET stock = stock - (v_item->>'cantidad')::integer, updated_at = now()
    WHERE id = (v_item->>'producto_id')::uuid;
  END LOOP;

  RETURN v_venta_id;
END;
$$;

-- RPC: crear venta de moto
CREATE OR REPLACE FUNCTION crear_venta_moto(payload jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_venta_id  uuid;
  v_item      jsonb;
  v_stock     integer;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    SELECT stock INTO v_stock
    FROM motos WHERE id = (v_item->>'moto_id')::uuid FOR UPDATE;

    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'Moto no encontrada: %', v_item->>'moto_id';
    END IF;
    IF v_stock < (v_item->>'cantidad')::integer THEN
      RAISE EXCEPTION 'Stock insuficiente para moto: %', v_item->>'moto_id';
    END IF;
  END LOOP;

  INSERT INTO ventas (vendedor_id, cliente_id, tipo_venta, total, ganancia_neta, notas)
  VALUES (
    (payload->>'vendedor_id')::uuid,
    NULLIF(payload->>'cliente_id','')::uuid,
    'moto',
    (payload->>'total')::numeric,
    (payload->>'ganancia_neta')::numeric,
    NULLIF(payload->>'notas','')
  ) RETURNING id INTO v_venta_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items') LOOP
    INSERT INTO detalle_ventas_motos (venta_id, moto_id, cantidad, precio_unitario, costo_unitario)
    VALUES (
      v_venta_id,
      (v_item->>'moto_id')::uuid,
      (v_item->>'cantidad')::integer,
      (v_item->>'precio_unitario')::numeric,
      (v_item->>'costo_unitario')::numeric
    );
    UPDATE motos
    SET stock = stock - (v_item->>'cantidad')::integer, updated_at = now()
    WHERE id = (v_item->>'moto_id')::uuid;
  END LOOP;

  RETURN v_venta_id;
END;
$$;

-- RPC: dashboard stats for today (timezone-aware: America/La_Paz UTC-4)
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
  FROM ventas;
$$;
