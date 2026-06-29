import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useInventoryStore = create((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async (storeId) => {
    if (!storeId) return
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
    if (!storeId) throw new Error('storeId is required')
    set({ isLoading: true, error: null })
    try {
      const { store_id: _ignored, ...cleanData } = productData

      const payload = {
        store_id: storeId,
        ...cleanData,
        created_at: new Date().toISOString(),
      }

      console.log('Inserting product payload:', payload)

      const { data, error } = await supabase
        .from('products')
        .insert([payload])
        .select()

      if (error) throw error

      set((state) => ({ products: [data[0], ...state.products] }))
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
      const { store_id: _ignored, ...cleanData } = productData

      const { data, error } = await supabase
        .from('products')
        .update({ ...cleanData, updated_at: new Date().toISOString() })
        .eq('id', productId)
        .select()

      if (error) throw error

      set((state) => ({
        products: state.products.map((p) => (p.id === productId ? data[0] : p)),
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
