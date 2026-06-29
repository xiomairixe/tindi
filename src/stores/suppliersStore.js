import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSuppliersStore = create((set, get) => ({
  suppliers: [],
  isLoading: false,
  error: null,

  fetchSuppliers: async (storeId) => {
    if (!storeId) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ suppliers: data || [] })
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  addSupplier: async (storeId, supplierData) => {
    if (!storeId) throw new Error('storeId is required')
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([{ store_id: storeId, ...supplierData, created_at: new Date().toISOString() }])
        .select()

      if (error) throw error

      set((state) => ({ suppliers: [data[0], ...state.suppliers] }))
      return data[0]
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  updateSupplier: async (supplierId, supplierData) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update({ ...supplierData, updated_at: new Date().toISOString() })
        .eq('id', supplierId)
        .select()

      if (error) throw error

      set((state) => ({
        suppliers: state.suppliers.map((s) => (s.id === supplierId ? data[0] : s)),
      }))
      return data[0]
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  deleteSupplier: async (supplierId) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId)

      if (error) throw error

      set((state) => ({
        suppliers: state.suppliers.filter((s) => s.id !== supplierId),
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
