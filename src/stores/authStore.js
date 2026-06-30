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

  // ─── Single source of truth for store creation ──────────────────────────
  // Tinatawag ito ng onAuthStateChange (sa initializeAuth) at ng signUp/signIn.
  // Kung walang existing store, gagawa ito ng bago — minsan lang dapat
  // tumakbo ito kahit ilang beses tumawag dahil nag-check muna ito bago
  // mag-insert (walang naka-duplicate na insert path).
  _loadStore: async (user, { storeName, ownerName } = {}) => {
    try {
      let { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error?.code === 'PGRST116') {
        // Walang default plan? Hanapin muna ang default plan id (kung meron)
        const { data: defaultPlan } = await supabase
          .from('plans')
          .select('id')
          .eq('is_default', true)
          .maybeSingle()

        const { data: newStore, error: createError } = await supabase
          .from('stores')
          .insert([{
            user_id: user.id,
            name: storeName || (user.user_metadata?.store_name) || (user.email?.split('@')[0] + "'s Store"),
            owner_name: ownerName || user.user_metadata?.full_name || user.email,
            email: user.email,
            plan_id: defaultPlan?.id ?? null, // uuid o null, hindi na text string
          }])
          .select()
          .single()

        // Kung may duplicate key error dito (race condition pa rin sa edge case),
        // i-fetch lang ulit ang existing row sa halip na mag-throw
        if (createError) {
          if (createError.code === '23505') {
            const { data: existing } = await supabase
              .from('stores')
              .select('*')
              .eq('user_id', user.id)
              .single()
            store = existing
          } else {
            throw createError
          }
        } else {
          store = newStore
        }
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
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { store_name: storeName, full_name: ownerName },
        },
      })
      if (signUpError) throw signUpError
      if (!user) throw new Error('Sign up failed')

      // Huwag na direktang mag-insert dito. Gamitin ang _loadStore (parehong
      // function na ginagamit ng onAuthStateChange) para iisa lang ang
      // gumagawa ng store row — iwas duplicate insert / race condition.
      await get()._loadStore(user, { storeName, ownerName })

      return { user, store: get().store }
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

      await get()._loadStore(user)

      return { user, store: get().store }
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