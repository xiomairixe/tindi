import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const usePlanStore = create((set, get) => ({
  plans: [],
  isLoading: false,
  error: null,

  // ── Fetch all plans ──────────────────────────────────────────
  fetchPlans: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true })

    if (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
    set({ plans: data, isLoading: false })
    return { success: true }
  },

  // ── Create a new plan ────────────────────────────────────────
  createPlan: async (planData) => {
    set({ isLoading: true, error: null })

    // If new plan is default, unset others first
    if (planData.is_default) {
      await supabase.from('plans').update({ is_default: false }).eq('is_default', true)
    }

    const { data, error } = await supabase
      .from('plans')
      .insert([{
        ...planData,
        limits: planData.limits ?? {},
        features: planData.features ?? [],
      }])
      .select()
      .single()

    if (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
    set(state => ({ plans: [...state.plans, data], isLoading: false }))
    return { success: true, data }
  },

  // ── Update an existing plan ──────────────────────────────────
  updatePlan: async (id, updates) => {
    set({ isLoading: true, error: null })

    // If setting as default, unset current default first
    if (updates.is_default) {
      await supabase
        .from('plans')
        .update({ is_default: false })
        .eq('is_default', true)
        .neq('id', id)
    }

    const { data, error } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
    set(state => ({
      plans: state.plans.map(p => (p.id === id ? data : p)),
      isLoading: false,
    }))
    return { success: true, data }
  },

  // ── Delete a plan ────────────────────────────────────────────
  deletePlan: async (id) => {
    set({ isLoading: true, error: null })
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (error) {
      set({ error: error.message, isLoading: false })
      return { success: false, error: error.message }
    }
    set(state => ({
      plans: state.plans.filter(p => p.id !== id),
      isLoading: false,
    }))
    return { success: true }
  },

  // ── Assign plan to a user (with optional override) ───────────
  assignPlanToUser: async (userId, planId, overrides = null) => {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        plan_id: planId,
        plan_override: overrides,
      })
      .eq('id', userId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  },

  clearError: () => set({ error: null }),
}))