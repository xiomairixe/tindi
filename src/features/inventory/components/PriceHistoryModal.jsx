import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '../../../lib/supabase'
import Modal from './Modal'

export default function PriceHistoryModal({ isOpen, product, onClose }) {
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen || !product) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    supabase
      .from('product_price_history')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchErr }) => {
        if (cancelled) return
        if (fetchErr) {
          console.error('Failed to fetch price history:', fetchErr)
          setError('Hindi ma-load ang price history.')
        } else {
          setHistory(data || [])
        }
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [isOpen, product])

  const hasPerPiece = product?.pieces_per_unit > 0 && product?.price_per_piece > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Price History" size="sm">
      <style>{`
        .ph-entry {
          border: 1px solid #f0f0f0; border-radius: 12px;
          padding: 12px 14px; background: #fafafa;
        }
        @keyframes ph-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', fontWeight: 600 }}>
        {product?.name}
      </p>

      {/* Kasalukuyang presyo */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
        padding: '12px 14px', marginBottom: 16,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', margin: '0 0 4px', letterSpacing: 0.3 }}>
          KASALUKUYANG PRESYO
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#374151' }}>
            Cost ₱{product?.cost_price?.toFixed(2) || '0.00'} • Markup {product?.markup_percentage || 0}%
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>
            ₱{hasPerPiece ? product.price_per_piece.toFixed(2) : (product?.price?.toFixed(2) || '0.00')}
            {hasPerPiece && <span style={{ fontSize: 11, fontWeight: 500, color: '#16a34a' }}> /pc</span>}
          </span>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 0' }}>
          <i className="ti ti-loader-3" style={{ fontSize: 20, color: '#16a34a', animation: 'ph-spin 1s linear infinite' }} aria-hidden="true" />
        </div>
      )}

      {!isLoading && error && (
        <p style={{ fontSize: 13, color: '#dc2626', textAlign: 'center', padding: '20px 0' }}>
          {error}
        </p>
      )}

      {!isLoading && !error && history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <i className="ti ti-history" style={{ fontSize: 28, color: '#d1d5db' }} aria-hidden="true" />
          <p style={{ fontSize: 13, color: '#9ca3af', margin: '10px 0 0' }}>
            Walang naitalang price history pa.
          </p>
        </div>
      )}

      {!isLoading && !error && history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((entry) => (
            <div key={entry.id} className="ph-entry">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                  {format(new Date(entry.created_at), 'MMM d, yyyy • h:mm a')}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>
                  ₱{entry.price?.toFixed(2)}
                  {entry.price_per_piece ? (
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af' }}>
                      {' '}(₱{entry.price_per_piece.toFixed(2)}/pc)
                    </span>
                  ) : null}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>
                Cost ₱{entry.cost_price?.toFixed(2)} • Markup {entry.markup_percentage || 0}%
                {entry.unit_bought ? ` • per ${entry.unit_bought}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}