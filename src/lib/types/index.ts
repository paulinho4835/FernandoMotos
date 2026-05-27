export type Rol = 'admin' | 'vendedor'
export type TipoVenta = 'repuesto' | 'moto'

export interface Perfil {
  id: string
  rol: Rol
  nombre: string
  created_at: string
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
  descripcion: string | null
  costo: number
  precio_venta: number
  stock: number
  stock_minimo: number
  ubicacion: string | null
  compatibilidad: string[]
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
  costo: number
  precio_venta: number
  stock: number
  stock_minimo: number
  descripcion: string | null
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
  // joined
  clientes?: Pick<Cliente, 'nombre'> | null
  perfiles?: Pick<Perfil, 'nombre'> | null
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
  motos?: Pick<Moto, 'marca' | 'modelo' | 'anio' | 'color'> | null
}

// Cart types
export interface CartItemRepuesto {
  producto_id: string
  codigo: string
  nombre: string
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
  costo_unitario: number
  cantidad: number
  stock: number
}
