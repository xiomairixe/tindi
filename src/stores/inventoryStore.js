import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useInventoryStore = create((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async (storeId) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ products: data || [] })
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  addProduct: async (storeId, productData) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            store_id: storeId,
            ...productData,
            created_at: new Date().toISOString(),
          },
        ])
        .select()

      if (error) throw error

      set((state) => ({
        products: [data[0], ...state.products],
      }))

      return data[0]
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  updateProduct: async (productId, productData) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          ...productData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select()

      if (error) throw error

      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId ? data[0] : p
        ),
      }))

      return data[0]
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  deleteProduct: async (productId) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      set((state) => ({
        products: state.products.filter((p) => p.id !== productId),
      }))
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Sample/default products seeding ─────────────────────────────────────
  // User-triggered na ito (button sa Inventory page), hindi na automatic sa
  // registration. Ang RPC function mismo (seed_default_products sa Supabase)
  // ang bahalang mag-skip ng mga product na parehong pangalan na sa store
  // (case/whitespace-insensitive), kaya ligtas kahit paulit-ulit i-click ito
  // ng user. Nagbabalik ng bilang ng products na aktwal na naidagdag.
  seedDefaultProductsIfNeeded: async (storeId) => {
    set({ error: null })
    try {
      const { data, error } = await supabase.rpc('seed_default_products', {
        p_store_id: storeId,
      })
      if (error) throw error

      // I-refresh ang listahan para makita agad ang mga bagong naidagdag
      await get().fetchProducts(storeId)

      return data ?? 0 // bilang ng products na naidagdag
    } catch (err) {
      set({ error: err.message })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))