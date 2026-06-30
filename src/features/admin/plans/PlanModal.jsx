import { useState, useEffect } from 'react'
import { usePlanStore } from '../../../stores/planStore'

const DEFAULT_LIMITS = {
  max_products: '',
  max_sales: '',
  max_expenses: '',
  can_export: false,
}

const LIMIT_META = [
  { key: 'max_products',  label: 'Max Products',  type: 'number', hint: '-1 para unlimited' },
  { key: 'max_sales',     label: 'Max Sales',     type: 'number', hint: '-1 para unlimited' },
  { key: 'max_expenses',  label: 'Max Expenses',  type: 'number', hint: '-1 para unlimited' },
  { key: 'can_export',    label: 'CSV Export',    type: 'bool',   hint: '' },
]

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid #e5e7eb', fontSize: 13, color: '#111827',
  background: '#fff', outline: 'none', width: '100%',
  boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.15s',
}

export default function PlanModal({ plan, onClose, onSuccess }) {
  const { createPlan, updatePlan, isLoading } = usePlanStore()

  const isEdit = !!plan

  // ── Form state ──
  const [name, setName] = useState(plan?.name ?? '')
  const [price, setPrice] = useState(plan?.price ?? 0)
  const [description, setDescription] = useState(plan?.description ?? '')
  const [isActive, setIsActive] = useState(plan?.is_active ?? true)
  const [isDefault, setIsDefault] = useState(plan?.is_default ?? false)
  const [limits, setLimits] = useState(() => ({
    ...DEFAULT_LIMITS,
    ...(plan?.limits ?? {}),
  }))
  const [features, setFeatures] = useState(
    Array.isArray(plan?.features) ? plan.features.join('\n') : ''
  )
  const [errors, setErrors] = useState({})

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Kailangan ng plan name.'
    if (price === '' || isNaN(Number(price)) || Number(price) < 0) e.price = 'Ilagay ang valid na presyo.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const parsedFeatures = features
      .split('\n')
      .map(f => f.trim())
      .filter(Boolean)

    const parsedLimits = {}
    LIMIT_META.forEach(({ key, type }) => {
      if (type === 'bool') {
        parsedLimits[key] = !!limits[key]
      } else {
        const v = limits[key]
        parsedLimits[key] = v === '' ? 0 : Number(v)
      }
    })

    const payload = {
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      is_active: isActive,
      is_default: isDefault,
      limits: parsedLimits,
      features: parsedFeatures,
    }

    const result = isEdit
      ? await updatePlan(plan.id, payload)
      : await createPlan(payload)

    if (result.success) {
      onSuccess(isEdit ? 'Plan updated!' : 'Plan created!')
    } else {
      setErrors({ submit: result.error })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1000, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        background: '#fff', borderRadius: 16,
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        fontFamily: 'Inter, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              {isEdit ? 'Edit Plan' : 'New Plan'}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              {isEdit ? `Editing "${plan.name}"` : 'Mag-setup ng bagong plan'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6', border: 'none', borderRadius: 8,
              width: 30, height: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b7280',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {errors.submit && (
            <div style={{
              background: '#fee2e2', borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#dc2626',
            }}>
              {errors.submit}
            </div>
          )}

          {/* Name */}
          <Field label="Plan Name" hint="*">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Pro"
              style={{ ...inputStyle, borderColor: errors.name ? '#ef4444' : '#e5e7eb' }}
            />
            {errors.name && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.name}</span>}
          </Field>

          {/* Price */}
          <Field label="Price (₱/month)" hint="*">
            <input
              type="number"
              min="0"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              style={{ ...inputStyle, borderColor: errors.price ? '#ef4444' : '#e5e7eb' }}
            />
            {errors.price && <span style={{ fontSize: 11, color: '#ef4444' }}>{errors.price}</span>}
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ilang salita tungkol sa plan na ito..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </Field>

          {/* Toggles */}
          <div style={{
            display: 'flex', gap: 12,
            background: '#f9fafb', borderRadius: 10, padding: '12px 16px',
          }}>
            {[
              { label: 'Active', value: isActive, set: setIsActive },
              { label: 'Default for new users', value: isDefault, set: setIsDefault },
            ].map(({ label, value, set }) => (
              <label key={label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 13, color: '#374151', userSelect: 'none',
              }}>
                <div
                  onClick={() => set(v => !v)}
                  style={{
                    width: 36, height: 20, borderRadius: 99,
                    background: value ? '#16a34a' : '#d1d5db',
                    position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2,
                    left: value ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#fff', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                {label}
              </label>
            ))}
          </div>

          {/* ── Limits ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{
              margin: 0, fontSize: 12, fontWeight: 700,
              color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Limits
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {LIMIT_META.map(({ key, label, type, hint }) => (
                <Field key={key} label={label} hint={hint}>
                  {type === 'bool' ? (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', fontSize: 13, color: '#374151', marginTop: 4,
                    }}>
                      <div
                        onClick={() => setLimits(l => ({ ...l, [key]: !l[key] }))}
                        style={{
                          width: 36, height: 20, borderRadius: 99,
                          background: limits[key] ? '#16a34a' : '#d1d5db',
                          position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 2,
                          left: limits[key] ? 18 : 2,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      {limits[key] ? 'Enabled' : 'Disabled'}
                    </label>
                  ) : (
                    <input
                      type="number"
                      value={limits[key]}
                      onChange={e => setLimits(l => ({ ...l, [key]: e.target.value }))}
                      placeholder="-1 = unlimited"
                      style={inputStyle}
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>

          {/* ── Features ── */}
          <Field label="Features" hint="Isang feature per line">
            <textarea
              value={features}
              onChange={e => setFeatures(e.target.value)}
              placeholder={`Inventory tracking\nSales recording\nCSV Export`}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Field>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          position: 'sticky', bottom: 0, background: '#fff',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px', background: '#f3f4f6', border: 'none',
              borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#374151',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              padding: '9px 24px',
              background: isLoading ? '#d1d5db' : '#0f2318',
              border: 'none', borderRadius: 9,
              fontSize: 13, fontWeight: 600,
              color: isLoading ? '#9ca3af' : '#4ade80',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {isLoading && (
              <span style={{
                width: 14, height: 14,
                border: '2px solid rgba(74,222,128,0.3)',
                borderTopColor: '#4ade80', borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.7s linear infinite',
              }} />
            )}
            {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </>
  )
}