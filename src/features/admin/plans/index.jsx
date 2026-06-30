import { useState, useEffect } from 'react'
import { usePlanStore } from '../../../stores/planStore'
import PlanModal from './PlanModal'

// ── Helpers ──────────────────────────────────────────────────────────────────

const LIMIT_LABELS = {
  max_products: 'Max Products',
  max_sales: 'Max Sales',
  max_expenses: 'Max Expenses',
  can_export: 'CSV Export',
}

function formatLimitValue(key, value) {
  if (key === 'can_export') return value ? 'Yes' : 'No'
  if (value === -1) return 'Unlimited'
  return value?.toString() ?? '—'
}

// ── Small Components ──────────────────────────────────────────────────────────

function Badge({ children, color = '#16a34a' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      background: `${color}22`, color,
    }}>
      {children}
    </span>
  )
}

function PlanCard({ plan, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)

  const tierColor = plan.price === 0
    ? '#6b7280'
    : plan.price < 500
    ? '#2563eb'
    : '#9333ea'

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${plan.is_default ? '#16a34a44' : '#e5e7eb'}`,
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative',
      boxShadow: plan.is_default
        ? '0 0 0 2px #16a34a22'
        : '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Default badge */}
      {plan.is_default && (
        <div style={{
          position: 'absolute', top: -10, left: 16,
          background: '#16a34a', color: '#fff',
          fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          padding: '2px 10px', borderRadius: 99,
        }}>
          DEFAULT
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
            {plan.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {plan.description || 'Walang description'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: tierColor }}>
            {plan.price === 0 ? 'Free' : `₱${Number(plan.price).toLocaleString()}`}
          </p>
          {plan.price > 0 && (
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>/month</p>
          )}
        </div>
      </div>

      {/* Status */}
      <div>
        <Badge color={plan.is_active ? '#16a34a' : '#9ca3af'}>
          {plan.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Limits */}
      {plan.limits && Object.keys(plan.limits).length > 0 && (
        <div style={{
          background: '#f9fafb', borderRadius: 10, padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Limits
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 0' }}>
            {Object.entries(plan.limits).map(([key, val]) => (
              <div key={key} style={{ fontSize: 12, color: '#374151' }}>
                <span style={{ color: '#9ca3af' }}>{LIMIT_LABELS[key] ?? key}: </span>
                <span style={{ fontWeight: 600 }}>{formatLimitValue(key, val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      {Array.isArray(plan.features) && plan.features.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {plan.features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-check" style={{ fontSize: 13, color: '#16a34a' }} />
              <span style={{ fontSize: 12, color: '#4b5563' }}>{f}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onEdit(plan)}
          style={{
            flex: 1, padding: '8px 0',
            background: '#f3f4f6', border: 'none', borderRadius: 8,
            fontSize: 12, fontWeight: 600, color: '#374151',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
        >
          <i className="ti ti-pencil" style={{ fontSize: 14 }} />
          Edit
        </button>

        {confirming ? (
          <div style={{ flex: 1, display: 'flex', gap: 6 }}>
            <button
              onClick={() => onDelete(plan.id)}
              style={{
                flex: 1, padding: '8px 0',
                background: '#ef4444', border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 600, color: '#fff',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              style={{
                flex: 1, padding: '8px 0',
                background: '#f3f4f6', border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 600, color: '#374151',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            disabled={plan.is_default}
            title={plan.is_default ? 'Hindi pwedeng i-delete ang default plan' : ''}
            style={{
              flex: 1, padding: '8px 0',
              background: plan.is_default ? '#f9fafb' : '#fee2e2',
              border: 'none', borderRadius: 8,
              fontSize: 12, fontWeight: 600,
              color: plan.is_default ? '#d1d5db' : '#dc2626',
              cursor: plan.is_default ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!plan.is_default) e.currentTarget.style.background = '#fecaca' }}
            onMouseLeave={e => { if (!plan.is_default) e.currentTarget.style.background = '#fee2e2' }}
          >
            <i className="ti ti-trash" style={{ fontSize: 14 }} />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const { plans, isLoading, error, fetchPlans, deletePlan, clearError } = usePlanStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchPlans() }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleEdit = (plan) => {
    setEditingPlan(plan)
    setModalOpen(true)
  }

  const handleCreate = () => {
    setEditingPlan(null)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    const result = await deletePlan(id)
    if (result.success) showToast('Plan deleted.')
    else showToast(result.error, 'error')
  }

  const handleModalSuccess = (message) => {
    setModalOpen(false)
    showToast(message)
    fetchPlans()
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '18px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
            Plan Management
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {plans.length} plan{plans.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={handleCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px',
            background: '#0f2318', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 600, color: '#4ade80',
            cursor: 'pointer', transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <i className="ti ti-plus" style={{ fontSize: 16 }} />
          New Plan
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '24px 28px' }}>
        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10,
            padding: '12px 16px', marginBottom: 20, color: '#dc2626',
            fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {error}
            <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
              <i className="ti ti-x" />
            </button>
          </div>
        )}

        {isLoading && plans.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{
              width: 32, height: 32, border: '3px solid #d1fae5',
              borderTopColor: '#16a34a', borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : plans.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 80, gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: '#f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-license" style={{ fontSize: 26, color: '#9ca3af' }} />
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#374151' }}>
              Walang plans pa
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              Gumawa ng unang plan para magsimula.
            </p>
            <button
              onClick={handleCreate}
              style={{
                marginTop: 8, padding: '9px 20px',
                background: '#0f2318', border: 'none', borderRadius: 10,
                fontSize: 13, fontWeight: 600, color: '#4ade80', cursor: 'pointer',
              }}
            >
              Gumawa ng Plan
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <PlanModal
          plan={editingPlan}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : '#16a34a',
          color: '#fff', padding: '12px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideUp 0.2s ease',
        }}>
          <i className={`ti ${toast.type === 'error' ? 'ti-alert-circle' : 'ti-check'}`} />
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }
      `}</style>
    </div>
  )
}