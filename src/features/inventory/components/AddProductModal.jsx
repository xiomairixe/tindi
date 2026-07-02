import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventoryStore } from '../../../stores/inventoryStore'
import { useSuppliersStore } from '../../../stores/suppliersStore'
import { uploadImageToCloudinary } from '../../../lib/cloudinary'
import { supabase } from '../../../lib/supabase'
import Modal from './Modal'

const CATEGORIES = [
  'Grocery & Staples',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Household Essentials',
  'Dairy & Eggs',
  'Condiments & Sauces',
  'Toiletries',
  'Tobacco & Vaping',
  'Frozen Foods',
  'Canned & Packaged',
  'Cleaning Supplies',
  'Health & Vitamins',
  'Other',
]

const UNITS = ['pcs', 'pack', 'box', 'bag', 'bottle', 'can', 'kg', 'liter', 'bundle', 'carton']

// Units that represent a multi-piece grouping
const MULTI_PIECE_UNITS = ['pack', 'box', 'bag', 'bundle', 'carton']

// Rounding rule: cents >= .30 round up to next peso, cents < .30 round down
// e.g. 15.35 -> 16.00 | 15.30 -> 16.00 | 15.10 -> 15.00
const roundSellingPrice = (value) => {
  const whole = Math.floor(value)
  const cents = value - whole
  return cents >= 0.30 ? whole + 1 : whole
}

// Single label/value row inside the price breakdown card
const PriceRow = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
    <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{label}</p>
    <p style={{ fontSize: 13, color: '#111827', margin: 0, fontWeight: 600 }}>{value}</p>
  </div>
)

// ── Plan limit check ──────────────────────────────────────────────
// Parehong pattern gaya ng sa AddSaleModal: kinukuha ang `used_products`
// mula sa `store_usage` view (live count) at ang `max_products` mula sa
// `plans.limits` jsonb base sa plan_id ng store.
// -1 (o null) sa max_products = unlimited.
async function fetchProductLimitStatus(storeId) {
  const { data: usage, error: usageErr } = await supabase
    .from('store_usage')
    .select('used_products, plan_id')
    .eq('store_id', storeId)
    .single()

  if (usageErr) throw usageErr

  if (!usage?.plan_id) {
    // Walang plan = treat as 0 limit (locked), pero ang page-level lock na
    // dapat sumalo dito. Failsafe lang ito.
    return { usedProducts: usage?.used_products ?? 0, maxProducts: 0, isUnlimited: false }
  }

  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('limits')
    .eq('id', usage.plan_id)
    .single()

  if (planErr) throw planErr

  const maxProducts = plan?.limits?.max_products
  const isUnlimited = maxProducts === -1 || maxProducts == null

  return { usedProducts: usage.used_products ?? 0, maxProducts, isUnlimited }
}

export default function AddProductModal({
  isOpen,
  onClose,
  isAdvanced,
  isPro = false,
  suppliers,
  storeId,
}) {
  const navigate = useNavigate()
  const { addProduct } = useInventoryStore()
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    category: 'Grocery & Staples',
    unit_bought: 'pcs',
    cost_price: '',
    markup_percentage: '20',
    pieces_per_unit: '',
    quantity: '',
    reorder_level: '',
    expiry_date: '',
    supplier_id: '',
    image_url: '',
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Limit-check state — checked on submit (per request), not on open,
  // dahil baka magbago ang usage habang bukas ang modal.
  const [limitError, setLimitError] = useState(null) // { usedProducts, maxProducts } kapag naabot na

  const isMultiPiece = MULTI_PIECE_UNITS.includes(formData.unit_bought)

  const sellingPrice = formData.cost_price
    ? roundSellingPrice(
        parseFloat(formData.cost_price) * (1 + parseFloat(formData.markup_percentage || 0) / 100)
      ).toFixed(2)
    : '0.00'

  const piecesPerUnitNum = parseFloat(formData.pieces_per_unit)
  const hasValidPiecesPerUnit = isMultiPiece && piecesPerUnitNum > 0
  const sellingPricePerPiece = hasValidPiecesPerUnit
    ? roundSellingPrice(parseFloat(sellingPrice) / piecesPerUnitNum).toFixed(2)
    : null

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Grocery & Staples',
      unit_bought: 'pcs',
      cost_price: '',
      markup_percentage: '20',
      pieces_per_unit: '',
      quantity: '',
      reorder_level: '',
      expiry_date: '',
      supplier_id: '',
      image_url: '',
    })
    setImagePreview(null)
    setImageFile(null)
    setError(null)
    setLimitError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleUnitChange = (e) => {
    const { value } = e.target
    setFormData((prev) => ({
      ...prev,
      unit_bought: value,
      pieces_per_unit: MULTI_PIECE_UNITS.includes(value) ? prev.pieces_per_unit : '',
    }))
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleImageUrlPaste = (e) => {
    const url = e.target.value.trim()
    if (url) {
      setFormData((prev) => ({ ...prev, image_url: url }))
      setImagePreview(url)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLimitError(null)
    setIsLoading(true)

    try {
      if (!formData.name.trim()) throw new Error('Kailangan ng pangalan ng produkto')
      if (!formData.cost_price) throw new Error('Kailangan ng cost price')
      // Stock quantity ay Pro-only field, kaya required lang kapag Pro.
      if (isPro && !formData.quantity) throw new Error('Kailangan ng quantity')
      if (!storeId) throw new Error('Store ID is missing')
      if (isMultiPiece && formData.pieces_per_unit && parseFloat(formData.pieces_per_unit) <= 0) {
        throw new Error('Pieces per unit must be greater than 0')
      }

      // Check plan limit bago mag-proceed (parehong pattern gaya ng sa
      // AddSaleModal). Ginagawa ito sa submit, hindi sa open, dahil baka
      // magbago ang usage habang bukas ang modal.
      const { usedProducts, maxProducts, isUnlimited } = await fetchProductLimitStatus(storeId)
      if (!isUnlimited && usedProducts >= maxProducts) {
        setLimitError({ usedProducts, maxProducts })
        setIsLoading(false)
        return
      }

      let imageUrl = formData.image_url

      if (imageFile) {
        try {
          imageUrl = await uploadImageToCloudinary(imageFile, 'inventory')
        } catch (imgErr) {
          console.warn('Image upload failed, continuing without image:', imgErr)
        }
      }

      const costPrice = parseFloat(formData.cost_price)
      const markupPercent = parseFloat(formData.markup_percentage || 0)
      const sellingPriceCalc = roundSellingPrice(costPrice * (1 + markupPercent / 100))

      const productData = {
        name: formData.name.trim(),
        category: formData.category,
        unit_bought: formData.unit_bought,
        cost_price: costPrice,
        markup_percentage: markupPercent,
        price: sellingPriceCalc,
        // Non-Pro plans don't track stock; default to 0 to satisfy NOT NULL constraints.
        quantity: isPro ? parseInt(formData.quantity || 0) : 0,
        reorder_level: isPro && formData.reorder_level ? parseInt(formData.reorder_level) : 0,
        image_url: imageUrl || null,
        supplier_id: formData.supplier_id && formData.supplier_id !== '' ? formData.supplier_id : null,
      }

      if (isMultiPiece && formData.pieces_per_unit) {
        const piecesPerUnit = parseInt(formData.pieces_per_unit)
        productData.pieces_per_unit = piecesPerUnit
        productData.price_per_piece = roundSellingPrice(sellingPriceCalc / piecesPerUnit)
      }

      if (isAdvanced && formData.expiry_date) {
        productData.expiry_date = formData.expiry_date
      }

      await addProduct(storeId, productData)

      resetForm()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Magdagdag ng Produkto" size="lg">
      <style>{`
        .add-product-input {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 13px; font-family: Inter, sans-serif;
          background: #fff; transition: all 0.2s ease;
        }
        .add-product-input:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .add-product-select {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 13px; font-family: Inter, sans-serif;
          background: #fff; cursor: pointer; transition: all 0.2s ease;
        }
        .add-product-select:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── LIMIT REACHED STATE ── */}
      {limitError ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, background: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-lock" style={{ color: '#d97706', fontSize: 24 }} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 8px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Naabot na ang Limit ng Plan
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              May naka-record ka nang <strong style={{ color: '#374151' }}>{limitError.usedProducts}</strong> sa{' '}
              <strong style={{ color: '#374151' }}>{limitError.maxProducts}</strong> na pinapayagang produkto
              ng iyong kasalukuyang plan. I-upgrade ang plan mo para makapagdagdag pa.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                flex: 1, padding: '10px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10,
                background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}
            >
              Isara
            </button>
            <button
              type="button"
              onClick={() => { handleClose(); navigate('/profile') }}
              style={{
                flex: 1.4, padding: '10px 16px', borderRadius: 10, background: '#16a34a',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
                fontFamily: 'Inter, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: '0 4px 12px rgba(22,163,74,0.25)',
              }}
            >
              <i className="ti ti-arrow-up-circle" style={{ fontSize: 14 }} />
              I-upgrade ang Plan
            </button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && (
          <div style={{ padding: 14, background: '#fee2e2', borderRadius: 10, border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Image Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Product Image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'relative', width: '100%', aspectRatio: '1', border: '2px dashed #e5e7eb',
                borderRadius: 12, cursor: 'pointer', backgroundColor: '#f9fafb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.backgroundColor = '#f0fdf4' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.backgroundColor = '#f9fafb' }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <i className="ti ti-photo" style={{ fontSize: 32, color: '#d1d5db', display: 'block', marginBottom: 8 }} />
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', margin: 0 }}>Click to upload</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, margin: 0 }}>PNG, JPG up to 5MB</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              O i-paste ang Image URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              onChange={handleImageUrlPaste}
              className="add-product-input"
              style={{ marginBottom: 8 }}
            />
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>i-paste ang image URL dito (https://...)</p>
          </div>
        </div>

        {/* Product Name */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Pangalan ng Produkto *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Lucky Me Pancit Canton"
            className="add-product-input"
          />
        </div>

        {/* Category & Unit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Kategori
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="add-product-select"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Unit Bought
            </label>
            <select
              name="unit_bought"
              value={formData.unit_bought}
              onChange={handleUnitChange}
              className="add-product-select"
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pieces per unit */}
        {isMultiPiece && (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Pieces per {formData.unit_bought}
            </label>
            <input
              type="number"
              name="pieces_per_unit"
              value={formData.pieces_per_unit}
              onChange={handleInputChange}
              placeholder="e.g., 24"
              step="1"
              min="1"
              className="add-product-input"
            />
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, margin: 0 }}>
              Ilang piraso bawat {formData.unit_bought}? (e.g., 1 box = 24 pcs)
            </p>
          </div>
        )}

        {/* Cost Price & Markup */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Cost Price (₱) *
            </label>
            <input
              type="number"
              name="cost_price"
              value={formData.cost_price}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="add-product-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Markup %
            </label>
            <input
              type="number"
              name="markup_percentage"
              value={formData.markup_percentage}
              onChange={handleInputChange}
              placeholder="20"
              step="1"
              min="0"
              className="add-product-input"
            />
          </div>
        </div>

        {/* Selling Price Display */}
        <div style={{
          background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0',
          padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🧾</span>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#15803d', margin: 0 }}>
              {isMultiPiece ? 'Per-Piece Breakdown' : 'Price Breakdown'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isMultiPiece ? (
              <>
                <PriceRow label={`Cost per ${formData.unit_bought}`} value={`₱${parseFloat(formData.cost_price || 0).toFixed(2)}`} />
                <PriceRow label={`Pcs per ${formData.unit_bought}`} value={hasValidPiecesPerUnit ? piecesPerUnitNum : '—'} />
                <PriceRow
                  label="Cost per piece"
                  value={hasValidPiecesPerUnit ? `₱${(parseFloat(formData.cost_price || 0) / piecesPerUnitNum).toFixed(2)}` : '—'}
                />
                <PriceRow label="Markup" value={`${formData.markup_percentage || '0'}%`} />
              </>
            ) : (
              <>
                <PriceRow label="Cost price" value={`₱${parseFloat(formData.cost_price || 0).toFixed(2)}`} />
                <PriceRow label="Markup" value={`${formData.markup_percentage || '0'}%`} />
              </>
            )}
          </div>

          <div style={{ borderTop: '1px solid #bbf7d0' }} />

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#15803d', margin: 0 }}>
              Selling price{isMultiPiece ? ' / pc' : ''}
            </p>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>
              ₱{isMultiPiece ? (hasValidPiecesPerUnit ? sellingPricePerPiece : '—') : sellingPrice}
            </span>
          </div>

          {isMultiPiece && hasValidPiecesPerUnit && (
            <p style={{ fontSize: 12, color: '#16a34a', margin: 0, textAlign: 'right' }}>
              Revenue: ₱{(parseFloat(sellingPricePerPiece) * piecesPerUnitNum).toFixed(2)} | Profit: ₱{(parseFloat(sellingPricePerPiece) * piecesPerUnitNum - parseFloat(formData.cost_price || 0)).toFixed(2)}
            </p>
          )}
        </div>

        {/* Stock & Reorder Level — Pro plan only */}
        {isPro ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Stock ({formData.unit_bought}) *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                className="add-product-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Reorder Level
              </label>
              <input
                type="number"
                name="reorder_level"
                value={formData.reorder_level}
                onChange={handleInputChange}
                placeholder="10"
                min="0"
                className="add-product-input"
              />
            </div>
          </div>
        ) : (
          <div style={{
            padding: '12px 14px', background: '#f9fafb', borderRadius: 10,
            border: '1px dashed #e5e7eb', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="ti ti-lock" style={{ fontSize: 14, color: '#9ca3af' }} />
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
              Stock at Reorder Level tracking ay available sa Pro Plan.
            </p>
          </div>
        )}

        {/* Supplier */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Supplier
          </label>
          <select
            name="supplier_id"
            value={formData.supplier_id}
            onChange={handleInputChange}
            className="add-product-select"
          >
            <option value="">None</option>
            {suppliers?.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </div>

        {/* Expiry Date (Advanced+ only) */}
        {isAdvanced && (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Expiry Date
            </label>
            <input
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleInputChange}
              className="add-product-input"
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <button
            type="button"
            onClick={handleClose}
            style={{
              flex: 1, padding: '10px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10,
              background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'Inter, sans-serif'
            }}
            onMouseOver={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db' }}
            onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 10,
              background: isLoading ? '#d1d5db' : '#16a34a',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              border: 'none', transition: 'all 0.15s ease', fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {isLoading ? (
              <>
                <i className="ti ti-loader-3" style={{ animation: 'spin 1s linear infinite' }} />
                Nag-add...
              </>
            ) : (
              <>
                <i className="ti ti-plus" />
                Magdagdag ng Produkto
              </>
            )}
          </button>
        </div>
      </form>
      )}
    </Modal>
  )
}