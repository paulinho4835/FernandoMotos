export type Rol = 'admin' | 'vendedor'

export interface Vendedor {
  id: string
  nombre: string
  tipo: 'admin' | 'vendedor'
  activo: boolean
  created_at: string
}
export type TipoVenta = 'repuesto' | 'moto'

export interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  orden: number
  activo: boolean
  created_at: string
}

export interface Perfil {
  id: string
  rol: Rol
  nombre: string
  email: string
  created_at: string
}

export interface Configuracion {
  id: number
  nombre_negocio: string | null
  direccion: string | null
  telefono: string | null
  modulo_compradores_activo: boolean | null
  modulo_pedidos_activo: boolean | null
  modulo_fotos_motos_activo: boolean | null
  modulo_agente_wa_visible: boolean | null
  agente_wa_activo: boolean | null
  ultimo_backup_at: string | null
}

export interface Cliente {
  id: string
  nombre: string
  nit: string | null
  telefono: string | null
  created_at: string
}

export interface Producto {
  id: string
  codigo: string
  nombre: string
  marca?: string | null
  descripcion: string | null
  costo: number
  precio_venta: number
  precio_referencial: number | null
  medida: string | null
  stock: number
  stock_minimo: number
  ubicacion: string | null
  compatibilidad: string[]
  categoria_id: string | null
  categorias?: Pick<Categoria, 'nombre'> | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Moto {
  id: string
  codigo: string
  marca: string
  modelo: string
  anio: number | null
  color: string | null
  motor_cc: number | null
  numero_motor: string | null
  numero_chasis: string | null
  precio_venta: number
  stock: number
  stock_minimo: number
  descripcion: string | null
  ubicacion?: string | null
  proveedor?: string | null
  fotos: string[]
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Venta {
  id: string
  vendedor_id: string
  cliente_id: string | null
  tipo_venta: TipoVenta
  total: number
  ganancia_neta: number
  metodo_pago: string
  estado: string
  notas: string | null
  created_at: string
  devuelta_at?: string | null
  vendedor_nombre?: string | null
  // joined
  clientes?: Pick<Cliente, 'nombre'> | null
  perfiles?: Pick<Perfil, 'nombre' | 'email'> | null
  detalle_ventas?: { cantidad: number; productos: Pick<Producto, 'nombre'> | null }[] | null
  detalle_ventas_motos?: { cantidad: number; marca: string | null; modelo: string | null }[] | null
}

export interface DetalleVenta {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  costo_unitario: number
  subtotal: number
  ganancia_item: number
  productos?: Pick<Producto, 'nombre' | 'codigo'> | null
}

export interface DetalleVentaMoto {
  id: string
  venta_id: string
  moto_id: string
  cantidad: number
  precio_unitario: number
  costo_unitario: number
  subtotal: number
  ganancia_item: number
  marca: string | null
  modelo: string | null
  anio: number | null
  color: string | null
}

// Cart types
export interface CartItemRepuesto {
  producto_id: string
  codigo: string
  nombre: string
  medida?: string | null
  precio_unitario: number
  costo_unitario: number
  cantidad: number
  stock: number
}

export interface CartItemMoto {
  moto_id: string
  codigo: string
  marca: string
  modelo: string
  anio: number | null
  precio_unitario: number
  cantidad: number
  stock: number
}
