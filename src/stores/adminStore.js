import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAdminStore = create((set, get) => ({
  users: [],
  userStatuses: {},
  isLoading: false,
  isCheckingAdmin: true,
  error: null,
  isAdmin: false,

  // ─── Check if current user is super_admin ────────────────────────────────
  checkIsAdmin: async () => {
    set({ isCheckingAdmin: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ isAdmin: false, isCheckingAdmin: false })
        return false
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('id', user.id)
        .eq('is_active', true)
        .single()

      const isAdminUser = !error && data?.role === 'super_admin'
      set({ isAdmin: isAdminUser, isCheckingAdmin: false })
      return isAdminUser
    } catch {
      set({ isAdmin: false, isCheckingAdmin: false })
      return false
    }
  },

  // ─── Fetch all users from stores + auth.users ─────────────────────────────
  fetchUsers: async () => {
    set({ isLoading: true, error: null })
    try {
      // Fetch from stores table — joined info nandito
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, user_id, name, owner_name, email, plan_id, status, created_at, plans(name)')
        .order('created_at', { ascending: false })

      if (storesError) throw storesError

      // Normalize to consistent shape para sa UI
      const users = (stores || []).map(store => ({
        id: store.user_id,       // user_id ang gagamitin as primary key sa status lookup
        store_id: store.id,
        store_name: store.name,
        full_name: store.owner_name,
        email: store.email,
        plan_id: store.plan_id,
        plan_name: store.plans?.name ?? null,
        created_at: store.created_at,
      }))

      // Fetch all user statuses
      const { data: statuses, error: statusError } = await supabase
        .from('user_status')
        .select('user_id, status, reason, suspended_at, approved_at')

      if (statusError) throw statusError

      const statusMap = {}
      statuses?.forEach(s => {
        statusMap[s.user_id] = s
      })

      set({ users, userStatuses: statusMap })
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching users:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  // ─── Suspend a user ──────────────────────────────────────────────────────
  suspendUser: async (userId, reason = '') => {
    set({ error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: userId,
          status: 'suspended',
          reason,
          suspended_at: new Date().toISOString(),
          suspended_by: user.id,
        }, { onConflict: 'user_id' })

      if (error) throw error

      set(state => ({
        userStatuses: {
          ...state.userStatuses,
          [userId]: {
            ...state.userStatuses[userId],
            status: 'suspended',
            reason,
            suspended_at: new Date().toISOString(),
          }
        }
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error suspending user:', error)
    }
  },

  // ─── Unsuspend a user ────────────────────────────────────────────────────
  unsuspendUser: async (userId) => {
    set({ error: null })
    try {
      const { error } = await supabase
        .from('user_status')
        .update({
          status: 'active',
          suspended_at: null,
          reason: null,
        })
        .eq('user_id', userId)

      if (error) throw error

      set(state => ({
        userStatuses: {
          ...state.userStatuses,
          [userId]: {
            ...state.userStatuses[userId],
            status: 'active',
            suspended_at: null,
            reason: null,
          }
        }
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error unsuspending user:', error)
    }
  },

  // ─── Get single user status (sync) ───────────────────────────────────────
  // Walang row sa user_status = hindi pa na-moderate = active/normal by default
  getUserStatus: (userId) => {
    return get().userStatuses[userId] || { status: 'active' }
  },

  clearError: () => set({ error: null }),
}))