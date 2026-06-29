import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useUtangStore = create((set, get) => ({
  debtors: [],
  utangRecords: [],
  utangPayments: [],
  isLoading: false,
  error: null,

  // ─── DEBTORS ────────────────────────────────────────────

  fetchDebtors: async (storeId) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('debtors')
        .select('*')
        .eq('store_id', storeId)
        .order('name', { ascending: true })

      if (error) throw error
      set({ debtors: data || [] })
    } catch (err) {
      set({ error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  addDebtor: async (storeId, { name, contact_number, notes }) => {
    set({ error: null })
    try {
      const { data, error } = await supabase
        .from('debtors')
        .insert({ store_id: storeId, name, contact_number, notes })
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        debtors: [...state.debtors, data].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }))
      return { data, error: null }
    } catch (err) {
      set({ error: err.message })
      return { data: null, error: err.message }
    }
  },

  updateDebtor: async (debtorId, updates) => {
    set({ error: null })
    try {
      const { data, error } = await supabase
        .from('debtors')
        .update(updates)
        .eq('id', debtorId)
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        debtors: state.debtors
          .map((d) => (d.id === debtorId ? data : d))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      return { data, error: null }
    } catch (err) {
      set({ error: err.message })
      return { data: null, error: err.message }
    }
  },

  deleteDebtor: async (debtorId) => {
    set({ error: null })
    try {
      const { error } = await supabase
        .from('debtors')
        .delete()
        .eq('id', debtorId)

      if (error) throw error
      set((state) => ({
        debtors: state.debtors.filter((d) => d.id !== debtorId),
        utangRecords: state.utangRecords.filter((r) => r.debtor_id !== debtorId),
        utangPayments: state.utangPayments.filter((p) => p.debtor_id !== debtorId),
      }))
      return { error: null }
    } catch (err) {
      set({ error: err.message })
      return { error: err.message }
    }
  },

  // ─── UTANG RECORDS ──────────────────────────────────────

  fetchUtangRecords: async (storeId) => {
    set({ error: null })
    try {
      const { data, error } = await supabase
        .from('utang_records')
        .select('*')
        .eq('store_id', storeId)
        .order('date', { ascending: false })

      if (error) throw error
      set({ utangRecords: data || [] })
    } catch (err) {
      set({ error: err.message })
    }
  },

  addUtangRecord: async (storeId, { debtor_id, description, amount, date, notes }) => {
    set({ error: null })
    try {
      const { data, error } = await supabase
        .from('utang_records')
        .insert({ store_id: storeId, debtor_id, description, amount, date, notes })
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        utangRecords: [data, ...state.utangRecords],
      }))
      return { data, error: null }
    } catch (err) {
      set({ error: err.message })
      return { data: null, error: err.message }
    }
  },

  deleteUtangRecord: async (recordId) => {
    set({ error: null })
    try {
      const { error } = await supabase
        .from('utang_records')
        .delete()
        .eq('id', recordId)

      if (error) throw error
      set((state) => ({
        utangRecords: state.utangRecords.filter((r) => r.id !== recordId),
        utangPayments: state.utangPayments.filter((p) => p.utang_record_id !== recordId),
      }))
      return { error: null }
    } catch (err) {
      set({ error: err.message })
      return { error: err.message }
    }
  },

  // ─── UTANG PAYMENTS ─────────────────────────────────────

  fetchUtangPayments: async (storeId) => {
    set({ error: null })
    try {
      const { data, error } = await supabase
        .from('utang_payments')
        .select('*')
        .eq('store_id', storeId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      set({ utangPayments: data || [] })
    } catch (err) {
      set({ error: err.message })
    }
  },

  addPayment: async (storeId, { utang_record_id, debtor_id, amount_paid, payment_date, notes }) => {
    set({ error: null })
    try {
      const { data, error } = await supabase
        .from('utang_payments')
        .insert({ store_id: storeId, utang_record_id, debtor_id, amount_paid, payment_date, notes })
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        utangPayments: [data, ...state.utangPayments],
      }))
      return { data, error: null }
    } catch (err) {
      set({ error: err.message })
      return { data: null, error: err.message }
    }
  },

  deletePayment: async (paymentId) => {
    set({ error: null })
    try {
      const { error } = await supabase
        .from('utang_payments')
        .delete()
        .eq('id', paymentId)

      if (error) throw error
      set((state) => ({
        utangPayments: state.utangPayments.filter((p) => p.id !== paymentId),
      }))
      return { error: null }
    } catch (err) {
      set({ error: err.message })
      return { error: err.message }
    }
  },

  // ─── COMPUTED HELPERS ───────────────────────────────────

  // Total utang of a debtor (all records)
  getDebtorTotalUtang: (debtorId) => {
    const { utangRecords } = get()
    return utangRecords
      .filter((r) => r.debtor_id === debtorId)
      .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0)
  },

  // Total paid for a debtor (all payments)
  getDebtorTotalPaid: (debtorId) => {
    const { utangPayments } = get()
    return utangPayments
      .filter((p) => p.debtor_id === debtorId)
      .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
  },

  // Remaining balance for a debtor
  getDebtorBalance: (debtorId) => {
    const { getDebtorTotalUtang, getDebtorTotalPaid } = get()
    return getDebtorTotalUtang(debtorId) - getDebtorTotalPaid(debtorId)
  },

  // Total paid for a specific utang record
  getRecordTotalPaid: (recordId) => {
    const { utangPayments } = get()
    return utangPayments
      .filter((p) => p.utang_record_id === recordId)
      .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)
  },

  // Remaining balance for a specific utang record
  getRecordBalance: (record) => {
    const { getRecordTotalPaid } = get()
    const paid = getRecordTotalPaid(record.id)
    return parseFloat(record.amount) - paid
  },

  // Grand total balance across all debtors
  getGrandTotalBalance: () => {
    const { debtors, getDebtorBalance } = get()
    return debtors.reduce((sum, d) => sum + getDebtorBalance(d.id), 0)
  },
}))