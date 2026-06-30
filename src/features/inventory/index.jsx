import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useInventoryStore } from '../../stores/inventoryStore'
import { useSuppliersStore } from '../../stores/suppliersStore'
import ProductCard from './components/ProductCard'
import AddProductModal from './components/AddProductModal'
import EditProductModal from './components/EditProductModal'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import SuppliersModal from './suppliers/SupplierModal'

export default function InventoryPage() {
  const { user, storeId, isLoading: authLoading } = useAuthStore()
  const { products, isLoading, error, fetchProducts, deleteProduct } = useInventoryStore()
  const { suppliers, fetchSuppliers } = useSuppliersStore()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingProduct, setDeletingProduct] = useState(null)
  const [showSuppliersModal, setShowSuppliersModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  const userPlan = user?.user_metadata?.plan_tier || 'basic'
  const isAdvanced = ['advanced', 'pro'].includes(userPlan)

  useEffect(() => {
    if (authLoading) return
    if (!storeId) return

    fetchProducts(storeId)
    fetchSuppliers(storeId)
  }, [storeId, authLoading])

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))]

  const handleEditProduct = (product) => setEditingProduct(product)
  const handleDeleteProduct = (product) => setDeletingProduct(product)

  const confirmDelete = async () => {
    if (deletingProduct) {
      await deleteProduct(deletingProduct.id)
      setDeletingProduct(null)
    }
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        .inv-search-input {
          width: 100%; padding: 10px 12px 10px 36px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 14px; font-family: Inter, sans-serif;
          background: #fff; transition: all 0.2s ease;
        }
        .inv-search-input:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .inv-select {
          padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 14px; font-family: Inter, sans-serif; background: #fff;
          cursor: pointer; transition: all 0.2s ease;
        }
        .inv-select:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .inv-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 10px; font-size: 14px;
          font-weight: 600; cursor: pointer; border: none;
          transition: all 0.15s ease; font-family: Inter, sans-serif;
          background: #16a34a; color: #fff; box-shadow: 0 4px 12px rgba(22,163,74,0.25);
          white-space: nowrap;
        }
        .inv-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(22,163,74,0.3); }
        .inv-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 10px; font-size: 14px;
          font-weight: 600; cursor: pointer; border: 1.5px solid #e5e7eb;
          background: #fff; color: #374151; transition: all 0.15s ease;
          font-family: Inter, sans-serif; white-space: nowrap;
        }
        .inv-btn-secondary:hover { background: #f9fafb; border-color: #d1d5db; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ── Layout containers ── */
        .inv-header { padding: 24px 28px; }
        .inv-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
        .inv-filters { padding: 16px 28px; }
        .inv-content { padding: 24px 28px; }
        .inv-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;
        }

        /* ── FAB ── */
        .inv-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          border-radius: 999px;
          padding: 14px 22px;
          font-size: 15px;
          box-shadow: 0 8px 24px rgba(22,163,74,0.35);
          z-index: 50;
        }

        /* ── Tablet: ≤1024px ── */
        @media (max-width: 1024px) {
          .inv-header { padding: 20px 20px; }
          .inv-filters { padding: 14px 20px; }
          .inv-content { padding: 20px 20px; }
        }

        /* ── Mobile: ≤640px ── */
        @media (max-width: 640px) {
          .inv-header { padding: 16px 16px; }
          .inv-header-row { flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 12px; }
          .inv-header-row h1 { font-size: 22px !important; }
          .inv-btn-secondary { justify-content: center; }

          .inv-filters { padding: 12px 16px; }
          .inv-filters > div { flex-wrap: wrap; }
          .inv-select { width: 100%; }

          .inv-content { padding: 16px 16px 100px; }
          .inv-grid { grid-template-columns: 1fr; gap: 12px; }

          /* Lift FAB above the fixed mobile bottom nav (~64px) + safe area */
          .inv-fab {
            bottom: calc(78px + env(safe-area-inset-bottom, 0px));
            right: 16px;
            padding: 13px 18px;
            font-size: 14px;
          }
        }

        @media (max-width: 400px) {
          .inv-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', paddingBottom: 0 }}>
        <div className="inv-header" style={{ maxWidth: '100%' }}>
          <div className="inv-header-row">
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1a3a2a', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px' }}>
                Inventory
              </h1>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                {products.length} produkto • Tier: <span style={{ fontWeight: 600, color: '#374151' }}>{userPlan.toUpperCase()}</span>
              </p>
            </div>
            <button className="inv-btn-secondary" onClick={() => setShowSuppliersModal(true)}>
              <i className="ti ti-building-store" aria-hidden="true" /> Mga Suppliers
            </button>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER ── */}
      <div className="inv-filters" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search Products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="inv-search-input"
            />
            <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 16 }} aria-hidden="true" />
          </div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="inv-select">
            <option value="all">Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="inv-content">
        {error && (
          <div style={{ marginBottom: 20, padding: 16, background: '#fee2e2', borderRadius: 12, border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="ti ti-loader-3" style={{ fontSize: 24, color: '#16a34a', animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              </div>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Nag-load ng mga produkto...</p>
            </div>
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 64, height: 64, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="ti ti-package" style={{ fontSize: 32, color: '#d1d5db' }} aria-hidden="true" />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {searchTerm ? 'Walang resultado' : 'Walang produkto pa'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
              {searchTerm ? 'Subukan ang ibang search term.' : 'Magsimula sa pag-add ng iyong unang produkto.'}
            </p>
            {!searchTerm && (
              <button className="inv-btn-primary" onClick={() => setShowAddModal(true)}>
                <i className="ti ti-plus" aria-hidden="true" /> Add Product
              </button>
            )}
          </div>
        )}

        {!isLoading && filteredProducts.length > 0 && (
          <div className="inv-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isAdvanced={isAdvanced}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                suppliers={suppliers}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        className="inv-btn-primary inv-fab"
        onClick={() => setShowAddModal(true)}
      >
        <i className="ti ti-plus" aria-hidden="true" /> Add Product
      </button>

      {/* Modals */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        isAdvanced={isAdvanced}
        suppliers={suppliers}
        storeId={storeId}
      />

      {editingProduct && (
        <EditProductModal
          isOpen={!!editingProduct}
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          isAdvanced={isAdvanced}
          suppliers={suppliers}
        />
      )}

      {deletingProduct && (
        <DeleteConfirmModal
          isOpen={!!deletingProduct}
          productName={deletingProduct.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingProduct(null)}
        />
      )}

      <SuppliersModal
        isOpen={showSuppliersModal}
        onClose={() => setShowSuppliersModal(false)}
        storeId={storeId}
      />
    </div>
  )
} 