import { create } from 'zustand'
import type { CartItemRepuesto } from '@/lib/types'

interface CartStore {
  items: CartItemRepuesto[]
  addItem: (item: Omit<CartItemRepuesto, 'cantidad'>) => void
  removeItem: (producto_id: string) => void
  updateQuantity: (producto_id: string, cantidad: number) => void
  updatePrice: (producto_id: string, precio: number) => void
  clear: () => void
  total: () => number
  ganancia: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.producto_id === item.producto_id)
    if (existing) {
      return {
        items: state.items.map(i =>
          i.producto_id === item.producto_id
            ? { ...i, cantidad: Math.min(i.cantidad + 1, item.stock) }
            : i
        ),
      }
    }
    return { items: [...state.items, { ...item, cantidad: 1 }] }
  }),
  removeItem: (producto_id) => set((state) => ({
    items: state.items.filter(i => i.producto_id !== producto_id),
  })),
  updateQuantity: (producto_id, cantidad) => set((state) => ({
    items: state.items
      .map(i => i.producto_id === producto_id ? { ...i, cantidad } : i)
      .filter(i => i.cantidad > 0),
  })),
  updatePrice: (producto_id, precio) => set((state) => ({
    items: state.items.map(i => i.producto_id === producto_id ? { ...i, precio_unitario: precio } : i),
  })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0),
  ganancia: () => get().items.reduce((s, i) => s + (i.precio_unitario - i.costo_unitario) * i.cantidad, 0),
}))
