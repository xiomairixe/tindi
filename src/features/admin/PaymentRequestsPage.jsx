import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchPaymentRequests(statusFilter) {
  let q = supabase
    .from('payment_requests')
    .select(`
      id,
      ewallet_type,
      amount_paid,
      receipt_url,
      note,
      status,
      admin_note,
      created_at,
      reviewed_at,
      plan_id,
      store_id,
      plans ( id, name, price ),
      stores ( id, user_id,
        plan_id, plan_started_at, plan_expires_at
      )
    `)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') q = q.eq('status', statusFilter)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

async function fetchStoreOwnerEmail(userId) {
  const { data } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null }))
  return data?.user?.email ?? null
}

async function fetchPaymentHistory(storeId) {
  const { data } = await supabase
    .from('payment_requests')
    .select('id, ewallet_type, amount_paid, status, created_at, plans(name)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(10)
  return data ?? []
}

// ── Approve / Reject ──────────────────────────────────────────────────────────
//
// IMPORTANT: approveRequest now calls a Postgres RPC function
// (`approve_payment_request`) instead of doing two separate client-side
// `.update()` calls. The previous version failed silently whenever RLS
// blocked the `stores` update for the logged-in admin: no error was thrown,
// the payment_requests row still flipped to "approved", but the store's
// plan never changed. The RPC runs as SECURITY DEFINER on the DB side, so
// it isn't subject to that RLS gap, and it does both updates atomically.
//
// You must run the matching SQL migration in Supabase first:
//   approve_payment_request.sql
//
async function approveRequest(requestId, storeId, planId) {
  console.log('Approving via RPC:', { requestId, storeId, planId })

  const { error } = await supabase.rpc('approve_payment_request', {
    p_request_id: requestId,
    p_store_id: storeId,
    p_plan_id: planId,
  })

  if (error) {
    console.error('❌ approve_payment_request RPC failed:', error)
    throw error
  }

  console.log('✅ Approved: payment_request + store updated atomically')
}

async function rejectRequest(requestId, adminNote) {
  const { data, error } = await supabase
    .from('payment_requests')
    .update({
      status: 'rejected',
      admin_note: adminNote,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()

  if (error) throw error

  // .update() can succeed with 0 rows affected if RLS silently blocks it.
  // Catch that case explicitly instead of pretending it worked.
  if (!data || data.length === 0) {
    throw new Error(
      'Walang na-update na row. Posibleng RLS permission issue — check ang admin policy sa payment_requests table.'
    )
  }
}

// ── Tiny UI pieces ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    pending:  { color: '#d97706', bg: '#fef3c7', label: 'Pending' },
    approved: { color: '#16a34a', bg: '#f0fdf4', label: 'Approved' },
    rejected: { color: '#dc2626', bg: '#fee2e2', label: 'Rejected' },
  }
  const s = map[status] ?? map.pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
      color: s.color, background: s.bg,
      padding: '3px 10px', borderRadius: 99,
    }}>
      {s.label}
    </span>
  )
}

function EwalletChip({ type }) {
  const isGcash = type === 'gcash'
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: isGcash ? '#1d4ed8' : '#15803d',
      background: isGcash ? '#eff6ff' : '#f0fdf4',
      padding: '2px 9px', borderRadius: 99,
      border: `1px solid ${isGcash ? '#bfdbfe' : '#bbf7d0'}`,
    }}>
      {isGcash ? 'GCash' : 'Maya'}
    </span>
  )
}

function Spinner({ size = 18, color = '#16a34a' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}33`,
      borderTopColor: color, borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fil-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({ request, onClose, onApproved, onRejected }) {
  const [history, setHistory]       = useState([])
  const [histLoading, setHistLoad]  = useState(true)
  const [rejectNote, setRejectNote] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [actionLoading, setActLoad] = useState(false)
  const [actionError, setActErr]    = useState(null)
  const [imgZoom, setImgZoom]       = useState(false)

  useEffect(() => {
    fetchPaymentHistory(request.store_id)
      .then(setHistory)
      .finally(() => setHistLoad(false))
  }, [request.store_id])

  const handleApprove = async () => {
    setActErr(null)
    setActLoad(true)
    try {
      await approveRequest(request.id, request.store_id, request.plan_id)
      onApproved()
    } catch (e) {
      setActErr(e.message)
    } finally {
      setActLoad(false)
    }
  }

  const handleReject = async () => {
    if (!rejectNote.trim()) return setActErr('Kailangan ng reason para sa rejection.')
    setActErr(null)
    setActLoad(true)
    try {
      await rejectRequest(request.id, rejectNote.trim())
      onRejected()
    } catch (e) {
      setActErr(e.message)
    } finally {
      setActLoad(false)
    }
  }

  const isPending = request.status === 'pending'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
        }}
      />

      {/* Image zoom overlay */}
      {imgZoom && (
        <div
          onClick={() => setImgZoom(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1300,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={request.receipt_url}
            alt="Receipt full"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }}
          />
          <button
            onClick={() => setImgZoom(false)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 8, width: 36, height: 36, cursor: 'pointer',
              color: '#fff', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="ti ti-x" />
          </button>
        </div>
      )}

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1200, width: '100%', maxWidth: 680,
        maxHeight: '92vh', overflowY: 'auto',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
        fontFamily: 'Inter, sans-serif',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff',
          borderRadius: '20px 20px 0 0', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: '#f0fdf4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-receipt" style={{ fontSize: 17, color: '#16a34a' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827',
                fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Payment Request
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                {fmt(request.created_at)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={request.status} />
            <button onClick={onClose} style={{
              background: '#f3f4f6', border: 'none', borderRadius: 8,
              width: 30, height: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
            }}>
              <i className="ti ti-x" style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Two-col: receipt + info ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)',
            gap: 16,
          }}>
            {/* Receipt image */}
            <div>
              <p style={labelStyle}>Receipt</p>
              <div
                onClick={() => setImgZoom(true)}
                style={{
                  border: '1.5px solid #e5e7eb', borderRadius: 12,
                  overflow: 'hidden', cursor: 'zoom-in',
                  background: '#f9fafb', position: 'relative',
                  minHeight: 180,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <img
                  src={request.receipt_url}
                  alt="Receipt"
                  style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div style={{
                  position: 'absolute', bottom: 6, right: 6,
                  background: 'rgba(0,0,0,0.5)', borderRadius: 6,
                  padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <i className="ti ti-zoom-in" style={{ fontSize: 11, color: '#fff' }} />
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>I-zoom</span>
                </div>
              </div>
              <a
                href={request.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  marginTop: 6, fontSize: 11, color: '#2563eb',
                  textDecoration: 'none', fontWeight: 500,
                }}
              >
                <i className="ti ti-external-link" style={{ fontSize: 11 }} />
                Buksan sa bagong tab
              </a>
            </div>

            {/* Info column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Store info */}
              <div style={infoCard}>
                <p style={labelStyle}>Store Info</p>
                <p style={valStyle}>{request.stores?.store_name ?? `Store ID: ${request.store_id.slice(0,8)}…`}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>
                  store_id: {request.store_id.slice(0, 12)}…
                </p>
              </div>

              {/* Payment details */}
              <div style={infoCard}>
                <p style={labelStyle}>Payment Details</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Row label="E-wallet">
                    <EwalletChip type={request.ewallet_type} />
                  </Row>
                  <Row label="Halaga">
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>
                      ₱{Number(request.amount_paid).toLocaleString('fil-PH', { minimumFractionDigits: 2 })}
                    </span>
                  </Row>
                  <Row label="Plan">
                    <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>
                      {request.plans?.name ?? '—'}
                      {request.plans?.price > 0 && (
                        <span style={{ color: '#9ca3af', fontWeight: 400 }}>
                          {' '}(₱{Number(request.plans.price).toLocaleString()}/mo)
                        </span>
                      )}
                    </span>
                  </Row>
                  {isPending && (
                    <Row label="Ma-expire">
                      <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                        +30 days mula approval
                      </span>
                    </Row>
                  )}
                  {request.reviewed_at && (
                    <Row label="Reviewed">
                      <span style={{ fontSize: 12, color: '#374151' }}>
                        {fmt(request.reviewed_at)}
                      </span>
                    </Row>
                  )}
                </div>
              </div>

              {/* User note */}
              {request.note && (
                <div style={{ ...infoCard, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p style={{ ...labelStyle, color: '#15803d' }}>Note ng User</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#166534', lineHeight: 1.5 }}>
                    {request.note}
                  </p>
                </div>
              )}

              {/* Admin note (if rejected) */}
              {request.admin_note && (
                <div style={{ ...infoCard, background: '#fee2e2', border: '1px solid #fecaca' }}>
                  <p style={{ ...labelStyle, color: '#991b1b' }}>Admin Note</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>
                    {request.admin_note}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Payment history ── */}
          <div>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Payment History ng Store</p>
            {histLoading ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0' }}>
                <Spinner size={14} /> <span style={{ fontSize: 12, color: '#9ca3af' }}>Loading...</span>
              </div>
            ) : history.length === 0 ? (
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Walang history.</p>
            ) : (
              <div style={{
                border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Petsa', 'Plan', 'E-wallet', 'Halaga', 'Status'].map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left',
                          fontWeight: 700, color: '#6b7280', fontSize: 11,
                          borderBottom: '1px solid #e5e7eb',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr
                        key={h.id}
                        style={{
                          background: h.id === request.id ? '#f0fdf4' : i % 2 === 0 ? '#fff' : '#fafafa',
                          borderBottom: i < history.length - 1 ? '1px solid #f3f4f6' : 'none',
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: '#374151' }}>
                          {new Date(h.created_at).toLocaleDateString('fil-PH', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#374151', fontWeight: 600 }}>
                          {h.plans?.name ?? '—'}
                          {h.id === request.id && (
                            <span style={{
                              marginLeft: 5, fontSize: 9, fontWeight: 700, color: '#16a34a',
                              background: '#dcfce7', padding: '1px 6px', borderRadius: 99,
                            }}>ITO</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <EwalletChip type={h.ewallet_type} />
                        </td>
                        <td style={{ padding: '8px 12px', color: '#111827', fontWeight: 600 }}>
                          ₱{Number(h.amount_paid).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <StatusBadge status={h.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Action area (pending only) ── */}
          {isPending && (
            <div style={{
              background: '#f9fafb', border: '1.5px solid #e5e7eb',
              borderRadius: 14, padding: '16px 18px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#374151' }}>
                Aksyon
              </p>

              {/* Error */}
              {actionError && (
                <div style={{
                  padding: '10px 14px', background: '#fee2e2',
                  border: '1px solid #fecaca', borderRadius: 10,
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <i className="ti ti-alert-circle" style={{ color: '#dc2626', fontSize: 14, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>{actionError}</p>
                </div>
              )}

              {/* Reject reason input (toggleable) */}
              {showReject && (
                <div>
                  <label style={labelStyle}>Reason ng Rejection</label>
                  <textarea
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="e.g., Hindi malinaw ang receipt, maling amount, etc."
                    rows={2}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1.5px solid #fca5a5', borderRadius: 10,
                      fontSize: 13, fontFamily: 'Inter, sans-serif',
                      background: '#fff', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                {/* Approve */}
                <button
                  onClick={handleApprove}
                  disabled={actionLoading || showReject}
                  style={{
                    flex: 1, padding: '11px 0',
                    background: actionLoading || showReject ? '#d1d5db' : '#16a34a',
                    border: 'none', borderRadius: 10,
                    fontSize: 13, fontWeight: 700, color: '#fff',
                    cursor: actionLoading || showReject ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all 0.15s',
                    boxShadow: actionLoading || showReject ? 'none' : '0 4px 12px rgba(22,163,74,0.25)',
                  }}
                >
                  {actionLoading && !showReject
                    ? <><Spinner size={15} color="#fff" /> Nag-a-approve...</>
                    : <><i className="ti ti-check" style={{ fontSize: 14 }} /> I-approve (+30 days)</>}
                </button>

                {/* Reject toggle / confirm */}
                {!showReject ? (
                  <button
                    onClick={() => { setShowReject(true); setActErr(null) }}
                    disabled={actionLoading}
                    style={{
                      flex: 1, padding: '11px 0',
                      background: '#fff',
                      border: '1.5px solid #fca5a5',
                      borderRadius: 10,
                      fontSize: 13, fontWeight: 700, color: '#dc2626',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      transition: 'all 0.15s',
                    }}
                  >
                    <i className="ti ti-x" style={{ fontSize: 14 }} /> I-reject
                  </button>
                ) : (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setShowReject(false); setRejectNote(''); setActErr(null) }}
                      style={{
                        flex: 1, padding: '11px 0',
                        background: '#f3f4f6', border: 'none', borderRadius: 10,
                        fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer',
                      }}
                    >
                      Kanselahin
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      style={{
                        flex: 1.4, padding: '11px 0',
                        background: actionLoading ? '#d1d5db' : '#dc2626',
                        border: 'none', borderRadius: 10,
                        fontSize: 13, fontWeight: 700, color: '#fff',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        boxShadow: actionLoading ? 'none' : '0 4px 12px rgba(220,38,38,0.25)',
                      }}
                    >
                      {actionLoading
                        ? <><Spinner size={15} color="#fff" /> Nag-re-reject...</>
                        : <><i className="ti ti-send" style={{ fontSize: 14 }} /> Kumpirmahin</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ── Shared micro-styles ───────────────────────────────────────────────────────

const labelStyle = {
  margin: '0 0 4px', fontSize: 10, fontWeight: 700,
  color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5,
}
const valStyle = {
  margin: 0, fontSize: 14, fontWeight: 700, color: '#111827',
}
const infoCard = {
  background: '#f9fafb', border: '1px solid #e5e7eb',
  borderRadius: 10, padding: '12px 14px',
}
function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span>{children}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: 'all',      label: 'Lahat' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default function PaymentRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [statusTab, setStatus]  = useState('pending')
  const [selected, setSelected] = useState(null)
  const [search, setSearch]     = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchPaymentRequests(statusTab)
      .then(setRequests)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [statusTab])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetchPaymentRequests('all').then(data => {
      console.log('🔍 All payment requests:', data)
      console.log('Count:', data.length)
      if (data.length > 0) {
        console.log('First record:', data[0])
      }
    }).catch(err => {
      console.error('❌ Fetch error:', err)
    })
  }, [])

  const filtered = requests.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.store_id?.toLowerCase().includes(q) ||
      r.plans?.name?.toLowerCase().includes(q) ||
      r.ewallet_type?.toLowerCase().includes(q) ||
      String(r.amount_paid).includes(q)
    )
  })

  const handleActionDone = () => {
    setSelected(null)
    load()
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .pr-row { transition: background 0.12s ease; cursor: pointer; }
        .pr-row:hover { background: #f0fdf4 !important; }
      `}</style>

      {/* Page header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ padding: '24px 28px' }}>
          <h1 style={{
            fontSize: 26, fontWeight: 900, color: '#1a3a2a',
            fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px',
          }}>
            Payment Requests
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            I-review at i-approve o i-reject ang mga bayad na isinumite ng mga user.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 28px', display: 'flex', gap: 4, borderTop: '1px solid #f3f4f6' }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              style={{
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                color: statusTab === tab.value ? '#16a34a' : '#6b7280',
                borderBottom: `2px solid ${statusTab === tab.value ? '#16a34a' : 'transparent'}`,
                transition: 'all 0.15s', marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Search + refresh */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: '#9ca3af',
            }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Hanapin (plan, store, halaga...)"
              style={{
                width: '100%', padding: '9px 12px 9px 32px',
                border: '1.5px solid #e5e7eb', borderRadius: 10,
                fontSize: 13, fontFamily: 'Inter, sans-serif',
                background: '#fff', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', border: '1.5px solid #e5e7eb',
              borderRadius: 10, background: '#fff', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: '#374151',
            }}
          >
            {loading
              ? <Spinner size={14} color="#9ca3af" />
              : <i className="ti ti-refresh" style={{ fontSize: 14 }} />}
            I-refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px', background: '#fee2e2',
            border: '1px solid #fecaca', borderRadius: 12,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <i className="ti ti-alert-circle" style={{ color: '#dc2626', fontSize: 15, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>{error}</p>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{
            background: '#fff', border: '1.5px solid #e5e7eb',
            borderRadius: 14, padding: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <Spinner />
            <span style={{ fontSize: 13, color: '#6b7280' }}>Kinukuha ang mga requests...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: '#fff', border: '1.5px solid #e5e7eb',
            borderRadius: 14, padding: '48px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <i className="ti ti-inbox" style={{ fontSize: 40, color: '#d1d5db' }} />
            <p style={{ margin: 0, fontSize: 14, color: '#9ca3af', fontWeight: 500 }}>
              Walang {statusTab !== 'all' ? statusTab : ''} payment requests.
            </p>
          </div>
        ) : (
          <div style={{
            background: '#fff', border: '1.5px solid #e5e7eb',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Store', 'Plan', 'E-wallet', 'Halaga', 'Petsa', 'Status', ''].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontWeight: 700, color: '#6b7280', fontSize: 11,
                      textTransform: 'uppercase', letterSpacing: 0.4,
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    className="pr-row"
                    onClick={() => setSelected(r)}
                    style={{
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                      borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        {r.stores?.store_name ?? '—'}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>
                        {r.store_id.slice(0, 10)}…
                      </p>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827' }}>
                      {r.plans?.name ?? '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <EwalletChip type={r.ewallet_type} />
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#111827' }}>
                      ₱{Number(r.amount_paid).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: 12 }}>
                      {new Date(r.created_at).toLocaleDateString('fil-PH', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(r) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '6px 12px',
                          background: r.status === 'pending' ? '#0f2318' : '#f3f4f6',
                          border: 'none', borderRadius: 8,
                          fontSize: 12, fontWeight: 600,
                          color: r.status === 'pending' ? '#4ade80' : '#6b7280',
                          cursor: 'pointer',
                        }}
                      >
                        <i className={`ti ${r.status === 'pending' ? 'ti-eye-check' : 'ti-eye'}`}
                          style={{ fontSize: 13 }} />
                        {r.status === 'pending' ? 'I-review' : 'Tignan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', textAlign: 'right' }}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <DetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onApproved={handleActionDone}
          onRejected={handleActionDone}
        />
      )}
    </div>
  )
}