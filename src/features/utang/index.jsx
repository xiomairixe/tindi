import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useUtangStore } from '../../stores/utangStore'
import { supabase } from '../../lib/supabase'
import AddDebtorModal from './components/AddDebtOrModal'
import AddUtangModal from './components/AddUtangModal.jsx'
import AddPaymentModal from './components/AddPaymentModal'

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatPeso = (val) =>
  '₱' + parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── Record Status Badge ─────────────────────────────────────────
const RecordStatusBadge = ({ balance, originalAmount }) => {
  if (balance <= 0) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 8,
        paddingTop: 2, paddingBottom: 2, borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: '#d1fae5', color: '#047857',
      }}>
        <i className="ti ti-circle-check" style={{ fontSize: 10 }} />
        Bayad na
      </span>
    )
  }
  if (balance < originalAmount) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 8,
        paddingTop: 2, paddingBottom: 2, borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: '#fef3c7', color: '#92400e',
      }}>
        <i className="ti ti-clock" style={{ fontSize: 10 }} />
        Partial
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, paddingLeft: 8, paddingRight: 8,
      paddingTop: 2, paddingBottom: 2, borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: '#fee2e2', color: '#dc2626',
    }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 10 }} />
      Hindi pa bayad
    </span>
  )
}

// ─── Utang Record Card ───────────────────────────────────────────
function UtangRecordCard({ record, onAddPayment, onDeleteRecord }) {
  const { utangPayments, getRecordBalance, getRecordTotalPaid, deletePayment } = useUtangStore()
  const [expanded, setExpanded] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState(false)

  const payments = useMemo(
    () => utangPayments.filter((p) => p.utang_record_id === record.id)
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)),
    [utangPayments, record.id]
  )
  const totalPaid = getRecordTotalPaid(record.id)
  const balance = getRecordBalance(record)
  const isFullyPaid = balance <= 0
  const originalAmount = parseFloat(record.amount)

  const handleDeleteRecord = async () => {
    if (!window.confirm(`Tanggalin ang utang na "${record.description}"? Matatanggal din ang lahat ng payment records nito.`)) return
    setDeletingRecord(true)
    await onDeleteRecord(record.id)
    setDeletingRecord(false)
  }

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Tanggalin ang payment record na ito?')) return
    await deletePayment(paymentId)
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      padding: 16,
      border: '1px solid #f0f0f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      borderLeft: isFullyPaid ? '4px solid #16a34a' : '4px solid #dc2626',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                {record.description}
              </p>
              <RecordStatusBadge balance={balance} originalAmount={originalAmount} />
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 2px' }}>
              {formatDate(record.date)}
            </p>
            {record.notes && (
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
                {record.notes}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', margin: '0 0 2px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {formatPeso(originalAmount)}
            </p>
            {totalPaid > 0 && (
              <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, margin: '0 0 2px' }}>
                −{formatPeso(totalPaid)} bayad
              </p>
            )}
            {!isFullyPaid && totalPaid > 0 && (
              <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, margin: 0 }}>
                {formatPeso(balance)} natitira
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {!isFullyPaid && (
            <button
              onClick={() => onAddPayment(record)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 12,
                paddingTop: 6, paddingBottom: 6, background: '#059669', color: '#fff',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                fontFamily: 'Inter, sans-serif', transition: 'background 0.15s ease',
              }}
              onMouseOver={(e) => e.target.style.background = '#047857'}
              onMouseOut={(e) => e.target.style.background = '#059669'}
            >
              <i className="ti ti-cash" style={{ fontSize: 12 }} />
              Magbayad
            </button>
          )}
          {payments.length > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 12,
                paddingTop: 6, paddingBottom: 6, background: '#f3f4f6', color: '#374151',
                borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                fontFamily: 'Inter, sans-serif', transition: 'background 0.15s ease',
              }}
              onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
              onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
            >
              <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12 }} />
              {payments.length} bayad
            </button>
          )}
          <button
            onClick={handleDeleteRecord}
            disabled={deletingRecord}
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
              paddingLeft: 8, paddingRight: 8, paddingTop: 6, paddingBottom: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#d1d5db', fontSize: 12, transition: 'color 0.15s ease',
            }}
            onMouseOver={(e) => e.target.style.color = '#dc2626'}
            onMouseOut={(e) => e.target.style.color = '#d1d5db'}
          >
            <i className="ti ti-trash" style={{ fontSize: 12 }} />
          </button>
        </div>
      </div>

      {expanded && payments.length > 0 && (
        <div style={{
          borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Bayad History
          </p>
          {payments.map((payment) => (
            <div
              key={payment.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: 10, padding: '10px 12px',
              }}
            >
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', margin: '0 0 2px' }}>
                  +{formatPeso(parseFloat(payment.amount_paid))}
                </p>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
                  {formatDate(payment.payment_date)}
                </p>
                {payment.notes && (
                  <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
                    {payment.notes}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDeletePayment(payment.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#d1d5db', fontSize: 12, transition: 'color 0.15s ease', padding: 4,
                }}
                onMouseOver={(e) => e.target.style.color = '#dc2626'}
                onMouseOut={(e) => e.target.style.color = '#d1d5db'}
              >
                <i className="ti ti-trash" style={{ fontSize: 12 }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Plan Lock Overlay (No Plan) ──────────────────────────────────
// Ipinapakita sa ibabaw ng blurred content kung walang plan_id ang store.
function PlanLockOverlay() {
  const navigate = useNavigate()

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'rgba(249,250,251,0.4)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '32px 28px',
        maxWidth: 360,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
        border: '1px solid #f0f0f0',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: '#fef3c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 24,
        }}>
          <i className="ti ti-lock" style={{ color: '#d97706', fontSize: 24 }} />
        </div>
        <h3 style={{
          fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 8px',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          Hindi Kasama sa Free Plan
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
          Ang Utang tracking ay available simula sa Basic Plan pataas. I-upgrade
          ang plan mo para magamit ang feature na ito.
        </p>
        <button
          onClick={() => navigate('/profile')}
          style={{
            width: '100%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0',
            background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 12px rgba(22,163,74,0.25)',
          }}
        >
          <i className="ti ti-arrow-up-circle" style={{ fontSize: 14 }} />
          I-upgrade ang Plan
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────
export default function UtangPage() {
  const { storeId, store, isLoading: authLoading } = useAuthStore()
  const {
    debtors,
    utangRecords,
    isLoading,
    error,
    fetchDebtors,
    fetchUtangRecords,
    fetchUtangPayments,
    deleteUtangRecord,
    getDebtorBalance,
    getDebtorTotalUtang,
    getDebtorTotalPaid,
    getGrandTotalBalance,
  } = useUtangStore()

  const [selectedDebtorId, setSelectedDebtorId] = useState(null)
  const [search, setSearch] = useState('')
  const [showDebtorModal, setShowDebtorModal] = useState(false)
  const [editingDebtor, setEditingDebtor] = useState(null)
  const [showUtangModal, setShowUtangModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [recordFilter, setRecordFilter] = useState('all')

  // ── Plan-based access check ──────────────────────────────────────
  // Utang ay locked sa: No Plan (walang plan_id) AT Free Plan (price = 0).
  // Available simula Basic Plan pataas. Kinukuha natin ang price mula sa
  // `plans` table base sa store.plan_id dahil hindi ito kasama sa authStore.
  const [planPrice, setPlanPrice] = useState(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!store?.plan_id) {
      setPlanPrice(null)
      setPlanLoading(false)
      return
    }

    let cancelled = false
    setPlanLoading(true)
    supabase
      .from('plans')
      .select('price')
      .eq('id', store.plan_id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('Failed to fetch plan price:', error)
          setPlanPrice(null)
        } else {
          setPlanPrice(Number(data?.price ?? 0))
        }
        setPlanLoading(false)
      })

    return () => { cancelled = true }
  }, [store?.plan_id, authLoading])

  // Locked kapag walang plan, o Free plan (price === 0). Habang naglo-load
  // pa ang plan price, huwag munang i-lock (avoid flash of locked state).
  const hasNoAccess = !authLoading && !planLoading && (!store?.plan_id || planPrice === 0)

  useEffect(() => {
    if (authLoading || !storeId || hasNoAccess) return
    fetchDebtors(storeId)
    fetchUtangRecords(storeId)
    fetchUtangPayments(storeId)
  }, [storeId, authLoading, hasNoAccess])

  const selectedDebtor = useMemo(
    () => debtors.find((d) => d.id === selectedDebtorId) || null,
    [debtors, selectedDebtorId]
  )

  const filteredDebtors = useMemo(() => {
    const q = search.toLowerCase()
    return debtors.filter((d) => d.name.toLowerCase().includes(q))
  }, [debtors, search])

  const debtorRecords = useMemo(() => {
    if (!selectedDebtorId) return []
    const all = utangRecords
      .filter((r) => r.debtor_id === selectedDebtorId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    if (recordFilter === 'unpaid') {
      return all.filter((r) => {
        const { getRecordBalance } = useUtangStore.getState()
        return getRecordBalance(r) > 0
      })
    }
    if (recordFilter === 'paid') {
      return all.filter((r) => {
        const { getRecordBalance } = useUtangStore.getState()
        return getRecordBalance(r) <= 0
      })
    }
    return all
  }, [utangRecords, selectedDebtorId, recordFilter])

  const handleSelectDebtor = (debtor) => {
    setSelectedDebtorId(debtor.id)
    setRecordFilter('all')
  }

  const handleAddPayment = (record) => {
    setSelectedRecord(record)
    setShowPaymentModal(true)
  }

  const handleDeleteRecord = async (recordId) => {
    await deleteUtangRecord(recordId)
  }

  const handleEditDebtor = (debtor) => {
    setEditingDebtor(debtor)
    setShowDebtorModal(true)
  }

  const grandTotal = getGrandTotalBalance()

  return (
    <div style={{ position: 'relative' }}>
      {hasNoAccess && <PlanLockOverlay />}

      <div
        className="utang-page-root"
        style={{
          fontFamily: 'Inter, sans-serif',
          background: '#f9fafb',
          minHeight: '100vh',
          ...(hasNoAccess ? {
            filter: 'blur(6px)',
            pointerEvents: 'none',
            userSelect: 'none',
          } : {}),
        }}
        aria-hidden={hasNoAccess}
      >
      <style>{`
        .utang-quick-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 10px; font-size: 14px;
          font-weight: 600; cursor: pointer; border: none;
          transition: all 0.15s ease; font-family: Inter, sans-serif;
        }
        .utang-quick-btn:hover { transform: translateY(-1px); }
        .utang-debtor-item {
          padding: 14px 16px; border-radius: 12px; cursor: pointer;
          border: 1px solid #f0f0f0; background: #fff;
          transition: all 0.15s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }
        .utang-debtor-item:hover { border-color: #d1d5db; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
        .utang-debtor-item.active {
          border-color: #86efac; background: #f0fdf4;
          box-shadow: 0 2px 8px rgba(22,163,74,0.12);
        }

        /* Responsive layout containers */
        .utang-header-inner {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; flex-wrap: wrap;
        }
        .utang-content-wrap {
          padding-left: 22px; padding-right: 22px; padding-top: 24px; padding-bottom: 96px;
        }
        .utang-main-grid {
          display: grid; grid-template-columns: 330px 1fr; gap: 26px;
        }
        .utang-left-panel { display: flex; flex-direction: column; }
        .utang-debtor-list {
          flex: 1; display: flex; flex-direction: column; gap: 8px;
        }
        .utang-debtor-list.has-selection {
          max-height: 280px; overflow-y: auto;
        }
        .utang-detail-header-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .utang-balance-summary {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
          padding-top: 16px; border-top: 1px solid #f0f0f0;
        }
        .utang-records-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
        }

        /* Floating Action Button */
        .utang-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 100;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 22px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: #16a34a;
          color: #fff;
          box-shadow: 0 6px 20px rgba(22,163,74,0.4), 0 2px 6px rgba(0,0,0,0.15);
          transition: all 0.2s ease;
          font-family: Inter, sans-serif;
          letter-spacing: -0.01em;
          white-space: nowrap;
        }
        .utang-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(22,163,74,0.45), 0 4px 8px rgba(0,0,0,0.15);
          background: #15803d;
        }
        .utang-fab:active {
          transform: translateY(0);
          box-shadow: 0 4px 12px rgba(22,163,74,0.3);
        }

        /* ── MOBILE / TABLET ── */
        @media (max-width: 768px) {
          .utang-header-inner { padding-right: 0; }
          .utang-content-wrap {
            padding-left: 14px; padding-right: 14px; padding-top: 16px; padding-bottom: 110px;
          }
          .utang-main-grid {
            grid-template-columns: 1fr; gap: 18px;
          }
          .utang-debtor-list.has-selection {
            max-height: 220px;
          }
          .utang-balance-summary {
            grid-template-columns: 1fr 1fr; row-gap: 14px;
          }
          .utang-balance-summary > div:nth-child(2) {
            border-left: none !important; border-right: none !important;
          }
          .utang-balance-summary > div:nth-child(3) {
            grid-column: 1 / -1;
            border-top: 1px solid #f0f0f0; padding-top: 12px;
          }
          .utang-records-toolbar {
            flex-direction: column; align-items: stretch;
          }
          .utang-records-toolbar > div:first-child {
            width: 100%; justify-content: space-between;
          }
          .utang-quick-btn { width: 100%; justify-content: center; }

          /* keep FAB above bottom nav on mobile */
          .utang-fab {
            bottom: 84px;
            right: 16px;
            padding: 13px 18px;
            font-size: 13px;
          }
        }

        @media (max-width: 420px) {
          .utang-fab span { display: none; }
        }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        paddingTop: 24,
        paddingBottom: 24,
        paddingLeft: 22,
        paddingRight: 22,
      }}>
        <div className="utang-header-inner">
          <div>
            <h1 style={{
              fontSize: 28, fontWeight: 900, color: '#1a3a2a',
              fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 6px',
            }}>
              Utang 📊
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              I-track ang mga utang ng iyong mga suki
            </p>
          </div>

          {grandTotal > 0 && (
            <div style={{
              textAlign: 'right',
              background: '#fef2f2', borderRadius: 12, padding: '12px 16px',
              border: '1px solid #fee2e2',
            }}>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px' }}>Kabuuang Natatanggap</p>
              <p style={{
                fontSize: 18, fontWeight: 800, color: '#dc2626', margin: 0,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                {formatPeso(grandTotal)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="utang-content-wrap">
        {error && (
          <div style={{
            marginBottom: 16, padding: 14, background: '#fee2e2', border: '1px solid #fecaca',
            borderRadius: 12,
          }}>
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>
              <span style={{ fontWeight: 700 }}>Error:</span> {error}
            </p>
          </div>
        )}

        <div className="utang-main-grid">
          {/* ── LEFT PANEL: Debtor List ── */}
          <div className="utang-left-panel">
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <i className="ti ti-search" style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#9ca3af', fontSize: 14,
              }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hanapin ang debtor..."
                style={{
                  width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
                  border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13,
                  fontFamily: 'Inter, sans-serif', background: '#fff',
                  outline: 'none', transition: 'border-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#16a34a'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Debtor list */}
            <div className={`utang-debtor-list${selectedDebtorId ? ' has-selection' : ''}`}>
              {isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} style={{
                      height: 60, background: '#f9fafb', borderRadius: 12,
                      animation: 'pulse 1.5s infinite',
                    }} />
                  ))}
                </div>
              )}

              {!isLoading && filteredDebtors.length === 0 && (
                <div style={{
                  textAlign: 'center', paddingTop: 32, paddingBottom: 32,
                  background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0',
                }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 48, height: 48, background: '#f3f4f6', borderRadius: 12,
                    marginBottom: 12, fontSize: 20,
                  }}>
                    👥
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
                    {search ? 'Walang nahanap' : 'Walang debtor pa'}
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                    {search ? 'Subukan ang ibang pangalan' : 'I-click ang "Bagong Debtor" para magsimula'}
                  </p>
                </div>
              )}

              {!isLoading && filteredDebtors.map((debtor) => {
                const balance = getDebtorBalance(debtor.id)
                const totalUtang = getDebtorTotalUtang(debtor.id)
                const isSelected = selectedDebtorId === debtor.id
                const isFullyPaid = totalUtang > 0 && balance <= 0

                return (
                  <div
                    key={debtor.id}
                    onClick={() => handleSelectDebtor(debtor)}
                    className={`utang-debtor-item${isSelected ? ' active' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: 16, fontWeight: 800,
                        background: isFullyPaid ? '#d1fae5' : balance > 0 ? '#fee2e2' : '#f3f4f6',
                        color: isFullyPaid ? '#047857' : balance > 0 ? '#dc2626' : '#6b7280',
                      }}>
                        {debtor.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {debtor.name}
                        </p>
                        {debtor.contact_number && (
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {debtor.contact_number}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        {totalUtang === 0 ? (
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Walang utang</p>
                        ) : isFullyPaid ? (
                          <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, margin: 0 }}>✓ Bayad na</p>
                        ) : (
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', margin: 0 }}>
                            {formatPeso(balance)}
                          </p>
                        )}
                      </div>
                      <span style={{
                        paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2,
                        background: isFullyPaid ? '#d1fae5' : balance > 0 ? '#fee2e2' : '#f3f4f6',
                        color: isFullyPaid ? '#047857' : balance > 0 ? '#dc2626' : '#6b7280',
                        borderRadius: 6, fontSize: 9, fontWeight: 700,
                      }}>
                        {isFullyPaid ? '✓' : balance > 0 ? '!' : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT PANEL: Debtor Detail ── */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {!selectedDebtor ? (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', paddingTop: 40, paddingBottom: 40,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 64, height: 64, background: '#f0fdf4', borderRadius: 16,
                    marginBottom: 16, fontSize: 28,
                  }}>
                    🔍
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>
                    Pumili ng debtor
                  </h3>
                  <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                    I-click ang pangalan sa kaliwa para makita ang kanilang utang
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Debtor detail header */}
                <div style={{
                  background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: 20, marginBottom: 16,
                }}>
                  <div className="utang-detail-header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12, background: '#d1fae5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#047857', fontWeight: 800, fontSize: 18, flexShrink: 0,
                      }}>
                        {selectedDebtor.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h2 style={{
                          fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 4px',
                          fontFamily: 'Plus Jakarta Sans, sans-serif',
                        }}>
                          {selectedDebtor.name}
                        </h2>
                        {selectedDebtor.contact_number && (
                          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                            <i className="ti ti-phone" style={{ marginRight: 4, fontSize: 11 }} />
                            {selectedDebtor.contact_number}
                          </p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => handleEditDebtor(selectedDebtor)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: 12,
                          paddingTop: 8, paddingBottom: 8, background: '#fff', color: '#374151',
                          border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer',
                          fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseOver={(e) => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#d1d5db' }}
                        onMouseOut={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#e5e7eb' }}
                      >
                        <i className="ti ti-edit" style={{ fontSize: 13 }} />
                        I-edit
                      </button>
                    </div>
                  </div>

                  {selectedDebtor.notes && (
                    <p style={{
                      fontSize: 12, color: '#9ca3af', fontStyle: 'italic', margin: '0 0 16px',
                      paddingLeft: 14, paddingTop: 12, borderLeft: '2px solid #e5e7eb',
                    }}>
                      {selectedDebtor.notes}
                    </p>
                  )}

                  {/* Balance summary row */}
                  <div className="utang-balance-summary">
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', fontWeight: 500 }}>Total Utang</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {formatPeso(getDebtorTotalUtang(selectedDebtor.id))}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center', borderLeft: '1px solid #f0f0f0', borderRight: '1px solid #f0f0f0' }}>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', fontWeight: 500 }}>Nabayad</p>
                      <p style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                        {formatPeso(getDebtorTotalPaid(selectedDebtor.id))}
                      </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', fontWeight: 500 }}>Balance</p>
                      <p style={{
                        fontSize: 16, fontWeight: 800,
                        color: getDebtorBalance(selectedDebtor.id) <= 0 ? '#16a34a' : '#dc2626',
                        margin: 0, fontFamily: 'Plus Jakarta Sans, sans-serif',
                      }}>
                        {formatPeso(getDebtorBalance(selectedDebtor.id))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Records toolbar */}
                <div className="utang-records-toolbar">
                  <div style={{
                    display: 'inline-flex', borderRadius: 10, border: '1px solid #e5e7eb',
                    padding: 4, background: '#f9fafb', gap: 2,
                  }}>
                    {[
                      { value: 'all', label: 'Lahat' },
                      { value: 'unpaid', label: 'Hindi pa bayad' },
                      { value: 'paid', label: 'Bayad na' },
                    ].map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setRecordFilter(f.value)}
                        style={{
                          paddingLeft: 12, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                          borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none',
                          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                          background: recordFilter === f.value ? '#fff' : 'transparent',
                          color: recordFilter === f.value ? '#16a34a' : '#6b7280',
                          boxShadow: recordFilter === f.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowUtangModal(true)}
                    className="utang-quick-btn"
                    style={{ background: '#16a34a', color: '#fff', boxShadow: '0 4px 12px rgba(22,163,74,0.25)', flexShrink: 0 }}
                  >
                    <i className="ti ti-plus" />
                    Magdagdag ng Utang
                  </button>
                </div>

                {/* Records list */}
                {debtorRecords.length === 0 ? (
                  <div style={{
                    textAlign: 'center', paddingTop: 32, paddingBottom: 32,
                    background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0',
                  }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 56, height: 56, background: '#f3f4f6', borderRadius: 12,
                      marginBottom: 12, fontSize: 24,
                    }}>
                      📋
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
                      {recordFilter !== 'all' ? 'Walang records dito' : `Wala pang utang si ${selectedDebtor.name}`}
                    </p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                      {recordFilter !== 'all'
                        ? 'Subukan ang ibang filter'
                        : 'I-click ang "Magdagdag ng Utang" para magsimula'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {debtorRecords.map((record) => (
                      <UtangRecordCard
                        key={record.id}
                        record={record}
                        onAddPayment={handleAddPayment}
                        onDeleteRecord={handleDeleteRecord}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── FLOATING ACTION BUTTON ── */}
      <button
        className="utang-fab"
        onClick={() => {
          setEditingDebtor(null)
          setShowDebtorModal(true)
        }}
      >
        <i className="ti ti-user-plus" aria-hidden="true" style={{ fontSize: 16 }} />
        <span>Bagong Debtor</span>
      </button>

      {/* Modals */}
      <AddDebtorModal
        isOpen={showDebtorModal}
        onClose={() => {
          setShowDebtorModal(false)
          setEditingDebtor(null)
        }}
        storeId={storeId}
        editingDebtor={editingDebtor}
      />

      <AddUtangModal
        isOpen={showUtangModal}
        onClose={() => setShowUtangModal(false)}
        storeId={storeId}
        debtorId={selectedDebtor?.id}
        debtorName={selectedDebtor?.name}
      />

      <AddPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false)
          setSelectedRecord(null)
        }}
        storeId={storeId}
        utangRecord={selectedRecord}
        debtorName={selectedDebtor?.name}
      />
      </div>
    </div>
  )
}