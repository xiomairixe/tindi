import { create } from 'zustand'
import { supabase } from '../../lib/supabase'

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

  clearError: () => set({ error: null }),
}))