-- 010_eliminar_venta.sql
--
-- RPC para eliminar una venta completa, solo accesible por administradores.
-- Al eliminar: restaura el stock de productos/motos afectados, borra los
-- detalles y finalmente borra la venta.

CREATE OR REPLACE FUNCTION eliminar_venta(p_venta_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF get_my_rol() <> 'admin' THEN
    RAISE EXCEPTION 'Solo los administradores pueden eliminar ventas';
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

  DELETE FROM detalle_ventas WHERE venta_id = p_venta_id;
  DELETE FROM detalle_ventas_motos WHERE venta_id = p_venta_id;
  DELETE FROM ventas WHERE id = p_venta_id;
END;
$$;
