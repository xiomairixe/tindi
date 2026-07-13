import { formatDistanceToNow } from 'date-fns'

export default function ProductCard({ product, isAdvanced, isPro = false, onEdit, onDelete, onViewHistory, suppliers }) {
  const imageUrl = product.image_url || null

  const isExpiringSoon = product.expiry_date && new Date(product.expiry_date) < new Date()
  const daysUntilExpiry = product.expiry_date
    ? Math.ceil((new Date(product.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  // Stock tracking ay Pro-only feature, kaya huwag i-highlight/i-display kung hindi Pro.
  const lowStock = isPro && product.quantity <= 5
  const noStock = isPro && product.quantity === 0

  const hasPerPiecePrice = product.pieces_per_unit > 0 && product.price_per_piece > 0

  const supplierName = product.supplier_id && suppliers
    ? suppliers.find(s => s.id === product.supplier_id)?.name
    : null

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        border: `1.5px solid ${noStock ? '#fde68a' : lowStock ? '#fed7aa' : '#f0f0f0'}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
      }}
      onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.09)' }}
      onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)' }}
    >
      {/* ── THUMBNAIL ── */}
      <div style={{
        width: 72, minWidth: 72, background: '#f9fafb',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRight: '1px solid #f0f0f0', overflow: 'hidden', position: 'relative',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <i className="ti ti-package" style={{ fontSize: 28, color: '#d1d5db' }} />
        )}

        {/* No stock overlay — Pro only */}
        {noStock && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#92400e', background: '#fde68a', padding: '2px 5px', borderRadius: 4, textAlign: 'center', lineHeight: 1.3 }}>
              NO<br />STOCK
            </span>
          </div>
        )}
      </div>

      {/* ── DETAILS ── */}
      <div style={{ flex: 1, padding: '10px 12px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Row 1: Name + Stock badge (Pro only) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <h3 style={{
            fontWeight: 700, color: noStock ? '#9ca3af' : '#111827', fontSize: 13,
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontFamily: 'Plus Jakarta Sans, sans-serif', flex: 1,
          }}>
            {product.name}
          </h3>
          {isPro && (
            <span style={{
              fontSize: 10, fontWeight: 700, flexShrink: 0,
              color: noStock ? '#92400e' : lowStock ? '#ea580c' : '#16a34a',
              background: noStock ? '#fef9c3' : lowStock ? '#fff7ed' : '#f0fdf4',
              padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap',
            }}>
              {product.quantity ?? 0} {product.unit_bought || 'pcs'}
            </span>
          )}
        </div>

        {/* Row 2: Category */}
        {product.category && (
          <p style={{ fontSize: 11, color: '#16a34a', margin: 0, fontWeight: 600 }}>
            {product.category}
          </p>
        )}

        {/* Row 3: Cost */}
        {hasPerPiecePrice && (
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
              Cost: ₱{product.cost_price?.toFixed(2)} / {product.unit_bought} ({product.pieces_per_unit} pcs)
            </p>
          )}

        {/* Row 4: Price per piece + action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <div>
            {hasPerPiecePrice ? (
              <span style={{ fontSize: 18, fontWeight: 800, color: '#f97316', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                ₱{product.price_per_piece.toFixed(2)}
                <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af' }}> /pc</span>
              </span>
            ) : (
              <span style={{ fontSize: 18, fontWeight: 800, color: '#f97316', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                ₱{product.price?.toFixed(2) || '0.00'}
                {product.unit_bought && (
                  <span style={{ fontSize: 10, fontWeight: 500, color: '#9ca3af' }}> /{product.unit_bought}</span>
                )}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => onViewHistory(product)}
              style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#e5e7eb' }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f3f4f6' }}
              title="Price History"
            >
              <i className="ti ti-history" />
            </button>
            <button
              onClick={() => onEdit(product)}
              style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#e5e7eb' }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f3f4f6' }}
              title="Edit"
            >
              <i className="ti ti-edit" />
            </button>
            <button
              onClick={() => onDelete(product)}
              style={{
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 8,
                cursor: 'pointer', fontSize: 13, transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#fecaca' }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#fee2e2' }}
              title="Delete"
            >
              <i className="ti ti-trash" />
            </button>
          </div>
        </div>

        {/* Expiry warning */}
        {isAdvanced && daysUntilExpiry !== null && daysUntilExpiry <= 7 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2,
            fontSize: 10, fontWeight: 600, color: isExpiringSoon ? '#dc2626' : '#ca8a04',
          }}>
            <i className={`ti ${isExpiringSoon ? 'ti-alert-circle' : 'ti-calendar'}`} style={{ fontSize: 11 }} />
            {isExpiringSoon ? 'Expired' : `Expires in ${daysUntilExpiry}d`}
          </div>
        )}

        {/* Supplier */}
        {supplierName && (
          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
            <i className="ti ti-building-store" style={{ fontSize: 10 }} /> {supplierName}
          </p>
        )}
      </div>
    </div>
  )
}