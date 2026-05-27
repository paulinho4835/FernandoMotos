import { create } from 'zustand'
import type { CartItemMoto } from '@/lib/types'

interface MotoCartStore {
  items: CartItemMoto[]
  addItem: (item: Omit<CartItemMoto, 'cantidad'>) => void
  removeItem: (moto_id: string) => void
  clear: () => void
  total: () => number
  ganancia: () => number
}

export const useMotoCartStore = create<MotoCartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.moto_id === item.moto_id)
    if (existing) return state
    return { items: [...state.items, { ...item, cantidad: 1 }] }
  }),
  removeItem: (moto_id) => set((state) => ({
    items: state.items.filter(i => i.moto_id !== moto_id),
  })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, i) => s + i.precio_unitario, 0),
  ganancia: () => get().items.reduce((s, i) => s + (i.precio_unitario - i.costo_unitario), 0),
}))
