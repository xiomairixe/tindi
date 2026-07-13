import { create } from 'zustand'
import { supabase } from "../lib/supabase";

export const useInventoryStore = create((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async (storeId) => {
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
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            store_id: storeId,
            ...productData,
            created_at: new Date().toISOString(),
          },
        ])
        .select()

      if (error) throw error

      set((state) => ({
        products: [data[0], ...state.products],
      }))

      return data[0]
    } catch (err) {
      set({ error: err.message })
      throw err
    } finally {
      set({ isLoading: false })
    }
  },

  updateProduct: async (productId, productData, previousProduct = null) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          ...productData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select()

      if (error) throw error

      // I-log sa price history kapag talagang nagbago ang price-related fields.
      // Hindi kasama ang quantity dito kasi stock-in/stock-out, hindi price change.
      const priceChanged =
        previousProduct &&
        (previousProduct.cost_price !== productData.cost_price ||
          previousProduct.markup_percentage !== productData.markup_percentage ||
          previousProduct.price !== productData.price)

      if (priceChanged) {
        const { error: historyError } = await supabase
          .from('product_price_history')
          .insert([
            {
              product_id: productId,
              store_id: previousProduct.store_id,
              cost_price: previousProduct.cost_price,
              markup_percentage: previousProduct.markup_percentage,
              price: previousProduct.price,
              price_per_piece: previousProduct.price_per_piece ?? null,
              unit_bought: previousProduct.unit_bought,
            },
          ])

        // Hindi natin i-throw kahit mag-fail ito — huwag i-block ang pag-save ng product.
        if (historyError) console.error('Failed to save price history:', historyError)
      }

      set((state) => ({
        products: state.products.map((p) =>
          p.id === productId ? data[0] : p
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