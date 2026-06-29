import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSalesStore = create((set, get) => ({
  sales: [],
  isLoading: false,
  error: null,

  fetchSales: async (storeId) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('store_id', storeId)
        .order('sale_date', { ascending: false })

      if (error) throw error

      set({ sales: data || [] })
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  addSale: async (storeId, saleData) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert([
          {
            store_id: storeId,
            ...saleData,
            created_at: new Date().toISOString(),
          },
        ])
        .select()

      if (error) throw error

      set((state) => ({
        sales: [data[0], ...state.sales].sort(
          (a, b) => new Date(b.sale_date) - new Date(a.sale_date)
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

  updateSale: async (saleId, saleData) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('sales')
        .update({
          ...saleData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', saleId)
        .select()

      if (error) throw error

      set((state) => ({
        sales: state.sales
          .map((s) => (s.id === saleId ? data[0] : s))
          .sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date)),
      }))

      return data[0]
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))