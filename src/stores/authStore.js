import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  storeId: null,
  store: null,
  isLoading: true,
  error: null,

  initializeAuth: async () => {
    set({ isLoading: true, error: null })

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await get()._loadStore(session.user)
      } else {
        set({ user: null, storeId: null, store: null, isLoading: false })
      }
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await get()._loadStore(session.user)
      } else {
        set({ isLoading: false })
      }
    } catch (err) {
      console.error('initializeAuth error:', err)
      set({ isLoading: false })
    }
  },

  _loadStore: async (user) => {
    try {
      let { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error?.code === 'PGRST116') {
        const { data: newStore, error: createError } = await supabase
          .from('stores')
          .insert([{
            user_id: user.id,
            name: user.email?.split('@')[0] + "'s Store",
            owner_name: user.email,
            plan_id: 'basic',
          }])
          .select()
          .single()

        if (createError) throw createError
        store = newStore
      } else if (error) {
        throw error
      }

      console.log('Store loaded:', store.id)
      set({ user, storeId: store.id, store })
    } catch (err) {
      console.error('_loadStore error:', err.message)
      set({ user, storeId: null, store: null, error: err.message })
    } finally {
      set({ isLoading: false })
    }
  },

  signUp: async (email, password, storeName, ownerName) => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) throw signUpError
      if (!user) throw new Error('Sign up failed')

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert([{ user_id: user.id, name: storeName, owner_name: ownerName, plan_id: 'basic' }])
        .select()
        .single()

      if (storeError) throw storeError

      set({ user, storeId: store.id, store })
      return { user, store }
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      if (!user) throw new Error('Sign in failed')

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (storeError && storeError.code !== 'PGRST116') throw storeError

      set({ user, storeId: store?.id || null, store: store || null })
      return { user, store }
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null, storeId: null, store: null })
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  updateStore: async (storeName, ownerName, contact, email) => {
    const storeId = get().storeId
    if (!storeId) { set({ error: 'No store found' }); return }

    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('stores')
        .update({ name: storeName, owner_name: ownerName, contact, email, updated_at: new Date().toISOString() })
        .eq('id', storeId)
        .select()
        .single()

      if (error) throw error
      set({ store: data })
      return data
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  getUser: () => get().user,
  getStoreId: () => get().storeId,
  isAuthenticated: () => !!get().user,
  clearError: () => set({ error: null }),
}))
