import { useRef, useState, useEffect } from 'react'
import { useInventoryStore } from '../../../stores/inventoryStore'
import { uploadImageToCloudinary } from '../../../lib/cloudinary'
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

export default function EditProductModal({ isOpen, product, onClose, isAdvanced, suppliers }) {
  const { updateProduct } = useInventoryStore()
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    unit_bought: 'pcs',
    cost_price: '',
    markup_percentage: '',
    pieces_per_unit: '',
    quantity: '',
    category: 'Grocery & Staples',
    expiry_date: '',
    supplier_id: '',
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        unit_bought: product.unit_bought || 'pcs',
        cost_price: product.cost_price ?? '',
        markup_percentage: product.markup_percentage ?? '',
        pieces_per_unit: product.pieces_per_unit ?? '',
        quantity: product.quantity ?? '',
        category: product.category || 'Grocery & Staples',
        expiry_date: product.expiry_date ? product.expiry_date.split('T')[0] : '',
        supplier_id: product.supplier_id || '',
      })
      setImagePreview(product.image_url || null)
      setImageFile(null)
      setError(null)
    }
  }, [product, isOpen])

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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
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
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.name.trim()) throw new Error('Kailangan ng pangalan ng produkto')
      if (!formData.cost_price) throw new Error('Kailangan ng cost price')
      if (formData.quantity === null || formData.quantity === '') throw new Error('Kailangan ng quantity')
      if (isMultiPiece && formData.pieces_per_unit && parseFloat(formData.pieces_per_unit) <= 0) {
        throw new Error('Pieces per unit must be greater than 0')
      }

      let imageUrl = product.image_url

      if (imageFile) {
        try {
          imageUrl = await uploadImageToCloudinary(imageFile, 'inventory')
        } catch (imgErr) {
          console.warn('Image upload failed, keeping existing image:', imgErr)
        }
      }

      const costPrice = parseFloat(formData.cost_price)
      const markupPercent = parseFloat(formData.markup_percentage || 0)
      const sellingPriceCalc = roundSellingPrice(costPrice * (1 + markupPercent / 100))

      const productData = {
        name: formData.name.trim(),
        unit_bought: formData.unit_bought,
        cost_price: costPrice,
        markup_percentage: markupPercent,
        price: sellingPriceCalc,
        quantity: parseInt(formData.quantity),
        category: formData.category,
        image_url: imageUrl,
        supplier_id: formData.supplier_id && formData.supplier_id !== '' ? formData.supplier_id : null,
      }

      if (isMultiPiece && formData.pieces_per_unit) {
        const piecesPerUnit = parseInt(formData.pieces_per_unit)
        productData.pieces_per_unit = piecesPerUnit
        productData.price_per_piece = roundSellingPrice(sellingPriceCalc / piecesPerUnit)
      } else {
        productData.pieces_per_unit = null
        productData.price_per_piece = null
      }

      if (isAdvanced && formData.expiry_date) {
        productData.expiry_date = formData.expiry_date
      }

      await updateProduct(product.id, productData)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="I-edit ang Produkto" size="md">
      <style>{`
        .edit-product-input {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 13px; font-family: Inter, sans-serif;
          background: #fff; transition: all 0.2s ease;
        }
        .edit-product-input:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .edit-product-select {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 13px; font-family: Inter, sans-serif;
          background: #fff; cursor: pointer; transition: all 0.2s ease;
        }
        .edit-product-select:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
      `}</style>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ padding: 12, background: '#fee2e2', borderRadius: 10, border: '1px solid #fecaca' }}>
            <p style={{ fontSize: 12, color: '#991b1b', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Image upload */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
            Product Image
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Thumbnail preview */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 72, height: 72, flexShrink: 0,
                border: '2px dashed #e5e7eb', borderRadius: 12,
                cursor: 'pointer', backgroundColor: '#f9fafb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.backgroundColor = '#f0fdf4' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.backgroundColor = '#f9fafb' }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <i className="ti ti-photo" style={{ fontSize: 24, color: '#d1d5db' }} />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </div>

            {/* Upload info + actions */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 2px' }}>
                {imagePreview ? 'Image selected' : 'Walang larawan'}
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 8px' }}>
                PNG, JPG up to 5MB
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#f0fdf4',
                    border: '1px solid #bbf7d0', borderRadius: 7, padding: '4px 10px',
                    cursor: 'pointer',
                  }}
                >
                  <i className="ti ti-upload" style={{ fontSize: 11 }} /> {imagePreview ? 'Change' : 'Mag-upload'}
                </button>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null) }}
                    style={{
                      fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fff1f2',
                      border: '1px solid #fecaca', borderRadius: 7, padding: '4px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    <i className="ti ti-trash" style={{ fontSize: 11 }} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product name */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Pangalan ng Produkto *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Coca-Cola 1.5L"
            className="edit-product-input"
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
              className="edit-product-select"
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
              className="edit-product-select"
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
              className="edit-product-input"
            />
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, margin: 0 }}>
              Ilang piraso bawat {formData.unit_bought}?
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
              className="edit-product-input"
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
              className="edit-product-input"
            />
          </div>
        </div>

        {/* Selling Price Display */}
        <div style={{
          background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0',
          padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>🧾</span>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#15803d', margin: 0 }}>
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
            <p style={{ fontSize: 13, fontWeight: 700, color: '#15803d', margin: 0 }}>
              Selling price{isMultiPiece ? ' / pc' : ''}
            </p>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#15803d' }}>
              ₱{isMultiPiece ? (hasValidPiecesPerUnit ? sellingPricePerPiece : '—') : sellingPrice}
            </span>
          </div>

          {isMultiPiece && hasValidPiecesPerUnit && (
            <p style={{ fontSize: 11, color: '#16a34a', margin: 0, textAlign: 'right' }}>
              Revenue: ₱{(parseFloat(sellingPricePerPiece) * piecesPerUnitNum).toFixed(2)} | Profit: ₱{(parseFloat(sellingPricePerPiece) * piecesPerUnitNum - parseFloat(formData.cost_price || 0)).toFixed(2)}
            </p>
          )}
        </div>

        {/* Quantity */}
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
            className="edit-product-input"
          />
        </div>

        {/* Supplier */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Supplier
          </label>
          <select
            name="supplier_id"
            value={formData.supplier_id}
            onChange={handleInputChange}
            className="edit-product-select"
          >
            <option value="">None</option>
            {suppliers?.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </div>

        {/* Expiry date */}
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
              className="edit-product-input"
            />
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, margin: 0 }}>Optional. Track product freshness.</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10,
              background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'Inter, sans-serif'
            }}
            onMouseOver={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db' }}
            onMouseOut={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 10, background: isLoading ? '#d1d5db' : '#16a34a',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
              border: 'none', transition: 'all 0.15s ease', fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {isLoading ? (
              <>
                <i className="ti ti-loader-3" style={{ animation: 'spin 1s linear infinite' }} />
                Nag-save...
              </>
            ) : (
              <>
                <i className="ti ti-check" />
                I-save ang Changes
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  )
}