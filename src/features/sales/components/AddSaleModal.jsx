import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSalesStore } from '../../../stores/salesStore'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import Modal from '../../inventory/components/Modal'

const todayStr = () => new Date().toISOString().split('T')[0]

// ── Plan limit check ──────────────────────────────────────────────
// Kinukuha natin ang `used_sales` mula sa `store_usage` view (live count)
// at ang `max_sales` mula sa `plans.limits` jsonb base sa plan_id ng store.
// -1 (o null) sa max_sales = unlimited, parang convention sa UsageBar
// sa ProfilePage.
async function fetchSalesLimitStatus(storeId) {
  const { data: usage, error: usageErr } = await supabase
    .from('store_usage')
    .select('used_sales, plan_id')
    .eq('store_id', storeId)
    .single()

  if (usageErr) throw usageErr

  if (!usage?.plan_id) {
    // Walang plan = treat as 0 limit (locked), pero ang page-level lock na
    // dapat sumalo dito. Failsafe lang ito.
    return { usedSales: usage?.used_sales ?? 0, maxSales: 0, isUnlimited: false }
  }

  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('limits')
    .eq('id', usage.plan_id)
    .single()

  if (planErr) throw planErr

  const maxSales = plan?.limits?.max_sales
  const isUnlimited = maxSales === -1 || maxSales == null

  return { usedSales: usage.used_sales ?? 0, maxSales, isUnlimited }
}

export default function AddSaleModal({ isOpen, onClose, storeId, editingSale }) {
  const navigate = useNavigate()
  const { addSale, updateSale } = useSalesStore()
  const isEditMode = !!editingSale

  const [formData, setFormData] = useState({
    sale_date: todayStr(),
    amount: '',
    notes: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Limit-check state — checked on submit (per request), not on open,
  // dahil baka magbago ang usage habang bukas ang modal.
  const [limitError, setLimitError] = useState(null) // { usedSales, maxSales } kapag naabot na

  // Populate form when opening in edit mode, reset when opening in add mode
  useEffect(() => {
    if (isOpen) {
      if (editingSale) {
        setFormData({
          sale_date: editingSale.sale_date || todayStr(),
          amount: editingSale.amount ?? '',
          notes: editingSale.notes || '',
        })
      } else {
        setFormData({
          sale_date: todayStr(),
          amount: '',
          notes: '',
        })
      }
      setError(null)
      setLimitError(null)
    }
  }, [isOpen, editingSale])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLimitError(null)
    setIsLoading(true)

    try {
      if (!formData.sale_date) throw new Error('Kailangan ng petsa')
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Maglagay ng valid na benta amount')
      }
      if (!storeId) throw new Error('Store ID is missing')

      // Edits hindi nagdadagdag sa count, kaya hindi na kailangang i-check
      // ang limit dito.
      if (!isEditMode) {
        const { usedSales, maxSales, isUnlimited } = await fetchSalesLimitStatus(storeId)
        if (!isUnlimited && usedSales >= maxSales) {
          setLimitError({ usedSales, maxSales })
          setIsLoading(false)
          return
        }
      }

      const saleData = {
        sale_date: formData.sale_date,
        amount: parseFloat(formData.amount),
        notes: formData.notes.trim() || null,
      }

      if (isEditMode) {
        await updateSale(editingSale.id, saleData)
      } else {
        await addSale(storeId, saleData)
      }

      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'I-edit ang Benta' : 'Mag-record ng Benta'} size="sm">
      <style>{`
        .sale-modal-input {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 13px; font-family: Inter, sans-serif;
          background: #fff; transition: all 0.2s ease;
        }
        .sale-modal-input:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .sale-modal-textarea {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 13px; font-family: Inter, sans-serif;
          background: #fff; transition: all 0.2s ease; resize: none;
        }
        .sale-modal-textarea:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
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
              Naka-record ka na ng <strong style={{ color: '#374151' }}>{limitError.usedSales}</strong> sa{' '}
              <strong style={{ color: '#374151' }}>{limitError.maxSales}</strong> na pinapayagang sales records
              ng iyong kasalukuyang plan. I-upgrade ang plan mo para makapag-record pa.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button
              type="button"
              onClick={onClose}
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
              onClick={() => { onClose(); navigate('/profile') }}
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: 12, background: '#fee2e2', borderRadius: 10, border: '1px solid #fecaca' }}>
              <p style={{ fontSize: 12, color: '#991b1b', margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Date */}
          <div>
            <label htmlFor="sale_date" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Petsa *
            </label>
            <input
              type="date"
              id="sale_date"
              name="sale_date"
              value={formData.sale_date}
              onChange={handleInputChange}
              max={todayStr()}
              className="sale-modal-input"
            />
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Total Sales (₱) *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="sale-modal-input"
            />
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, margin: 0 }}>
              Kabuuang benta para sa araw/petsang ito
            </p>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Notes <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="e.g., Mataas benta dahil sale ng softdrinks"
              rows={3}
              className="sale-modal-textarea"
            />
          </div>

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
                  <i className={isEditMode ? 'ti ti-check' : 'ti ti-plus'} />
                  {isEditMode ? 'I-save ang Changes' : 'Mag-record ng Benta'}
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  )
}