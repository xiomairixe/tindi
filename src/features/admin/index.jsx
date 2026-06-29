import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../stores/adminStore'

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const StatusBadge = ({ status }) => {
  const styles = {
    pending:   { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
    approved:  { bg: '#d1fae5', color: '#047857', icon: '✓'  },
    suspended: { bg: '#fee2e2', color: '#dc2626', icon: '⛔' },
  }
  const style = styles[status] || styles.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: style.bg, color: style.color, whiteSpace: 'nowrap',
    }}>
      {style.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Full-screen states ────────────────────────────────────────────────────
const FullScreenState = ({ icon, title, subtitle }) => (
  <div style={{
    fontFamily: 'Inter, sans-serif', background: '#f9fafb',
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{ textAlign: 'center' }}>
      {icon && <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>}
      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1a3a2a', margin: '0 0 6px' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{subtitle}</p>}
    </div>
  </div>
)

// ─── Suspend Modal ─────────────────────────────────────────────────────────
const SuspendModal = ({ onConfirm, onCancel, isLoading }) => {
  const [reason, setReason] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '0 16px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24,
        maxWidth: 400, width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
          Suspend User
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
          Reason (optional)
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="E.g., Violation of terms, suspicious activity..."
          style={{
            width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb',
            borderRadius: 10, fontSize: 13, fontFamily: 'Inter, sans-serif',
            marginBottom: 16, minHeight: 80, outline: 'none', resize: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => e.target.style.borderColor = '#dc2626'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 0', background: '#f3f4f6', color: '#374151',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)} disabled={isLoading} style={{
            flex: 1, padding: '10px 0', background: '#dc2626', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
            opacity: isLoading ? 0.6 : 1,
          }}>
            {isLoading ? 'Suspending...' : 'Confirm Suspend'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const {
    users, isLoading, isCheckingAdmin, error, isAdmin,
    checkIsAdmin, fetchUsers, approveUser, suspendUser, unsuspendUser, getUserStatus,
  } = useAdminStore()

  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // store userId being acted on

  useEffect(() => {
    const verify = async () => {
      const ok = await checkIsAdmin()
      if (!ok) navigate('/dashboard')
      else fetchUsers()
    }
    verify()
  }, [])

  const filteredUsers = useMemo(() => {
    let result = users
    if (statusFilter !== 'all') {
      result = result.filter(u => (getUserStatus(u.id).status || 'pending') === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(u =>
        u.email?.toLowerCase().includes(q) ||
        u.store_name?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
      )
    }
    return result
  }, [users, statusFilter, searchQuery])

  const stats = useMemo(() => ({
    total:     users.length,
    pending:   users.filter(u => (getUserStatus(u.id).status || 'pending') === 'pending').length,
    approved:  users.filter(u => (getUserStatus(u.id).status || 'pending') === 'approved').length,
    suspended: users.filter(u => (getUserStatus(u.id).status || 'pending') === 'suspended').length,
  }), [users])

  const handleApprove = async (userId) => {
    setActionLoading(userId)
    await approveUser(userId)
    setActionLoading(null)
  }

  const handleSuspend = async (reason) => {
    if (!selectedUserId) return
    setActionLoading(selectedUserId)
    await suspendUser(selectedUserId, reason)
    setShowSuspendModal(false)
    setSelectedUserId(null)
    setActionLoading(null)
  }

  const handleUnsuspend = async (userId) => {
    setActionLoading(userId)
    await unsuspendUser(userId)
    setActionLoading(null)
  }

  // ── Guard states ──
  if (isCheckingAdmin) {
    return <FullScreenState title="Checking permissions..." />
  }
  if (!isAdmin) {
    return <FullScreenState icon="🚫" title="Access Denied" subtitle="You do not have permission to access this page." />
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .action-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
          border: none; cursor: pointer; transition: opacity 0.15s ease;
          font-family: Inter, sans-serif; white-space: nowrap;
        }
        .action-btn:hover { opacity: 0.85; }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '24px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 900, color: '#1a3a2a', margin: '0 0 4px',
              fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
            }}>
              Super Admin 🛡️
            </h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Manage user registrations and account status
            </p>
          </div>

          <button
            onClick={() => fetchUsers()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb',
              borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: '#374151', fontFamily: 'Inter, sans-serif',
            }}
          >
            <i className="ti ti-refresh" /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 24px 40px' }}>

        {/* ── ERROR ── */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px',
            background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <p style={{ fontSize: 13, color: '#991b1b', margin: 0 }}>
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {/* ── STATS ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12, marginBottom: 24,
        }}>
          {[
            { label: 'Total Users', value: stats.total,     color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
            { label: 'Pending',     value: stats.pending,   color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
            { label: 'Approved',    value: stats.approved,  color: '#047857', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'Suspended',   value: stats.suspended, color: '#dc2626', bg: '#fff5f5', border: '#fecaca' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: stat.bg, border: `1px solid ${stat.border}`,
              borderRadius: 14, padding: '14px 16px',
            }}>
              <p style={{ fontSize: 12, color: stat.color, margin: '0 0 6px', fontWeight: 500, opacity: 0.8 }}>
                {stat.label}
              </p>
              <p style={{
                fontSize: 28, fontWeight: 800, color: stat.color, margin: 0,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── SEARCH & FILTERS ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#9ca3af', fontSize: 14, pointerEvents: 'none',
            }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email, store, or name..."
              style={{
                width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13,
                fontFamily: 'Inter, sans-serif', background: '#fff', outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = '#16a34a'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Status filter tabs */}
          <div style={{
            display: 'inline-flex', background: '#f3f4f6', borderRadius: 10,
            padding: 3, gap: 2, border: '1px solid #e5e7eb',
          }}>
            {[
              { value: 'all',       label: 'All'       },
              { value: 'pending',   label: 'Pending'   },
              { value: 'approved',  label: 'Approved'  },
              { value: 'suspended', label: 'Suspended' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  background: statusFilter === f.value ? '#fff' : 'transparent',
                  color: statusFilter === f.value ? '#16a34a' : '#6b7280',
                  boxShadow: statusFilter === f.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
                {f.value !== 'all' && (
                  <span style={{
                    marginLeft: 5, fontSize: 10, fontWeight: 700,
                    background: statusFilter === f.value ? '#dcfce7' : '#e5e7eb',
                    color: statusFilter === f.value ? '#16a34a' : '#9ca3af',
                    padding: '1px 6px', borderRadius: 10,
                  }}>
                    {stats[f.value]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── USER LIST ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Loading */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{
                width: 36, height: 36, border: '3px solid #d1fae5',
                borderTopColor: '#16a34a', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite', margin: '0 auto 12px',
              }} />
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Loading users...</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && filteredUsers.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 0',
              background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>
                {searchQuery ? 'Walang nahanap' : 'Walang users'}
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                {searchQuery ? 'Try a different search term' : 'Users will appear here once they sign up'}
              </p>
            </div>
          )}

          {/* User rows */}
          {!isLoading && filteredUsers.map((user) => {
            const status = getUserStatus(user.id).status || 'pending'
            const isActing = actionLoading === user.id

            return (
              <div key={user.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: '#fff', borderRadius: 12,
                border: '1px solid #f0f0f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'box-shadow 0.15s ease',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: 10, background: '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: '#6b7280', flexShrink: 0,
                }}>
                  {user.email?.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: 700, color: '#111827',
                    margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {user.store_name || 'Walang store name'}
                  </p>
                  <p style={{
                    fontSize: 12, color: '#6b7280',
                    margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {user.email}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                    {user.full_name || 'No name'} • Nag-sign up {formatDate(user.created_at)}
                  </p>
                </div>

                {/* Status + Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <StatusBadge status={status} />

                  {/* Approve — only for pending */}
                  {status === 'pending' && (
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={!!actionLoading}
                      className="action-btn"
                      style={{ background: '#16a34a', color: '#fff' }}
                    >
                      <i className="ti ti-check" />
                      Approve
                    </button>
                  )}

                  {/* Suspend — for pending and approved */}
                  {status !== 'suspended' && (
                    <button
                      onClick={() => { setSelectedUserId(user.id); setShowSuspendModal(true) }}
                      disabled={!!actionLoading}
                      className="action-btn"
                      style={{ background: '#fee2e2', color: '#dc2626' }}
                    >
                      {isActing ? (
                        <span style={{
                          display: 'inline-block', width: 12, height: 12,
                          border: '2px solid #dc262650', borderTopColor: '#dc2626',
                          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                        }} />
                      ) : (
                        <i className="ti ti-ban" />
                      )}
                      Suspend
                    </button>
                  )}

                  {/* Restore — only for suspended */}
                  {status === 'suspended' && (
                    <button
                      onClick={() => handleUnsuspend(user.id)}
                      disabled={!!actionLoading}
                      className="action-btn"
                      style={{ background: '#d1fae5', color: '#047857' }}
                    >
                      {isActing ? (
                        <span style={{
                          display: 'inline-block', width: 12, height: 12,
                          border: '2px solid #04785750', borderTopColor: '#047857',
                          borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                        }} />
                      ) : (
                        <i className="ti ti-check-circle" />
                      )}
                      Restore
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── SUSPEND MODAL ── */}
      {showSuspendModal && (
        <SuspendModal
          onConfirm={handleSuspend}
          onCancel={() => { setShowSuspendModal(false); setSelectedUserId(null) }}
          isLoading={actionLoading === selectedUserId}
        />
      )}
    </div>
  )
}