import { create } from 'zustand'
import { supabase } from '../../../lib/supabase'

export const useSuppliersStore = create((set, get) => ({
  suppliers: [],
  isLoading: false,
  error: null,

  fetchSuppliers: async (storeId) => {
    if (!storeId) {
      set({ error: 'Store ID is required' })
      return
    }

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
      console.error('Fetch suppliers error:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  addSupplier: async (storeId, supplierData) => {
    if (!storeId) {
      set({ error: 'Store ID is required' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([
          {
            store_id: storeId,
            name: supplierData.name,
            contact: supplierData.contact || null,
            email: supplierData.email || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        set((state) => ({
          suppliers: [data[0], ...state.suppliers],
        }))
        return data[0]
      }
    } catch (err) {
      set({ error: err.message })
      console.error('Add supplier error:', err)
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  updateSupplier: async (supplierId, supplierData) => {
    if (!supplierId) {
      set({ error: 'Supplier ID is required' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          name: supplierData.name,
          contact: supplierData.contact || null,
          email: supplierData.email || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supplierId)
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === supplierId ? data[0] : s
          ),
        }))
        return data[0]
      }
    } catch (err) {
      set({ error: err.message })
      console.error('Update supplier error:', err)
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  deleteSupplier: async (supplierId) => {
    if (!supplierId) {
      set({ error: 'Supplier ID is required' })
      return
    }

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
      console.error('Delete supplier error:', err)
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))