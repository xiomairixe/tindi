import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useExpensesStore = create((set, get) => ({
  expenses: [],
  customCategories: [],
  isLoading: false,
  error: null,

  fetchExpenses: async (storeId) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('store_id', storeId)
        .order('expense_date', { ascending: false })

      if (error) throw error

      set({ expenses: data || [] })
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchCustomCategories: async (storeId) => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('store_id', storeId)
        .order('name', { ascending: true })

      if (error) throw error

      set({ customCategories: data || [] })
    } catch (err) {
      console.error('Failed to fetch custom categories:', err.message)
    }
  },

  addExpense: async (storeId, expenseData) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            store_id: storeId,
            ...expenseData,
            created_at: new Date().toISOString(),
          },
        ])
        .select()

      if (error) throw error

      set((state) => ({
        expenses: [data[0], ...state.expenses].sort(
          (a, b) => new Date(b.expense_date) - new Date(a.expense_date)
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

  updateExpense: async (expenseId, expenseData) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('expenses')
        .update({
          ...expenseData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .select()

      if (error) throw error

      set((state) => ({
        expenses: state.expenses
          .map((e) => (e.id === expenseId ? data[0] : e))
          .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date)),
      }))

      return data[0]
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  addCustomCategory: async (storeId, name) => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ store_id: storeId, name: name.trim() }])
        .select()

      if (error) throw error

      set((state) => ({
        customCategories: [...state.customCategories, data[0]].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }))

      return data[0]
    } catch (err) {
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))