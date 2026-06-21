-- diagnostico_datos.sql
-- Consultas de apoyo para ejecutar EN EL SQL EDITOR DE SUPABASE (la nube).
-- No es una migración: son consultas para revisar/corregir datos existentes.
-- Ejecuta cada bloque por separado.

-- =====================================================================
-- 1) PRODUCTOS CON precio_venta = 0  (causan Total Bs. 0,00 y ganancia negativa)
--    Revisa esta lista y corrige el precio en el módulo de Repuestos.
-- =====================================================================
SELECT id, codigo, nombre, costo, precio_venta, stock
FROM productos
WHERE activo = true
  AND (precio_venta IS NULL OR precio_venta = 0)
ORDER BY nombre;

-- (Opcional) Lo mismo para motos:
SELECT id, codigo, marca, modelo, costo, precio_venta, stock
FROM motos
WHERE activo = true
  AND (precio_venta IS NULL OR precio_venta = 0)
ORDER BY marca, modelo;


-- =====================================================================
-- 2) VENTAS VIEJAS SIN vendedor_nombre
--    Estas ventas se hicieron antes del arreglo: NO guardaron qué vendedor
--    del módulo de Vendedores fue elegido (ese dato no se grababa, solo iba
--    en el PDF). Por eso en la lista aparece el email de la cuenta de acceso.
--    NO hay forma de recuperar automáticamente cuál vendedor fue.
--    Esta consulta te muestra cuántas y cuáles son.
-- =====================================================================
SELECT v.id,
       v.created_at,
       v.tipo_venta,
       v.total,
       v.vendedor_nombre,           -- estará en NULL en las viejas
       p.nombre AS perfil_nombre,   -- normalmente el email de la cuenta
       p.email  AS perfil_email
FROM ventas v
LEFT JOIN perfiles p ON p.id = v.vendedor_id
WHERE v.vendedor_nombre IS NULL
ORDER BY v.created_at DESC;

-- Si decides asignar manualmente un vendedor a una venta vieja concreta
-- (porque sabes quién la hizo), usa el nombre EXACTO del módulo de Vendedores:
--
--   UPDATE ventas
--   SET vendedor_nombre = 'NOMBRE EXACTO DEL VENDEDOR'
--   WHERE id = 'UUID-DE-LA-VENTA';


-- =====================================================================
-- 3) (Opcional) Perfiles cuyo "nombre" es en realidad el email.
--    Útil solo como respaldo: estas cuentas mostrarán el email cuando una
--    venta no tenga vendedor_nombre. Puedes ponerles un nombre legible.
-- =====================================================================
SELECT id, email, nombre, rol
FROM perfiles
WHERE nombre = email OR nombre ILIKE '%@%';

-- Para corregir el nombre de una cuenta de acceso (NO es el vendedor del
-- módulo, es solo la cuenta de login):
--
--   UPDATE perfiles SET nombre = 'Nombre Legible' WHERE email = 'correo@ejemplo.com';
