import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

export default function ProfilePage() {
  const { user } = useAuthStore()

  const [storeName, setStoreName] = useState(user?.user_metadata?.store_name || '')
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(null)
  const [profileError, setProfileError] = useState(null)

  const [passLoading, setPassLoading] = useState(false)
  const [passSuccess, setPassSuccess] = useState(null)
  const [passError, setPassError] = useState(null)

  const handleSaveProfile = async () => {
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          store_name: storeName.trim(),
          full_name: fullName.trim(),
        },
      })
      if (error) throw error
      setProfileSuccess('Profile updated!')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleChangePassword = async () => {
    setPassError(null)
    setPassSuccess(null)
    if (!newPassword) return setPassError('Ilagay ang bagong password')
    if (newPassword.length < 6) return setPassError('Minimum 6 characters ang password')
    if (newPassword !== confirmPassword) return setPassError('Hindi magkapareho ang passwords')

    setPassLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPassSuccess('Password changed!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPassError(err.message)
    } finally {
      setPassLoading(false)
    }
  }

  const initials = (storeName || '?').charAt(0).toUpperCase()

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        .prof-input {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb;
          border-radius: 10px; font-size: 14px; font-family: Inter, sans-serif;
          background: #fff; transition: all 0.2s ease; box-sizing: border-box;
        }
        .prof-input:focus {
          outline: none; border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .prof-label {
          display: block; font-size: 12px; font-weight: 600; color: #6b7280;
          margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .prof-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 11px 20px; border-radius: 10px; font-size: 14px; font-weight: 600;
          cursor: pointer; border: none; transition: all 0.15s ease;
          font-family: Inter, sans-serif; background: #16a34a; color: #fff;
          box-shadow: 0 4px 12px rgba(22,163,74,0.25);
        }
        .prof-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(22,163,74,0.3); }
        .prof-btn:disabled { background: #d1d5db; box-shadow: none; transform: none; cursor: not-allowed; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Header — full width bg, content with left margin */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ padding: '24px 28px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1a3a2a', fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px' }}>
            Profile
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>I-manage ang iyong account</p>
        </div>
      </div>

      {/* Content — full width with horizontal padding, no maxWidth */}
      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #16a34a, #4ade80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {initials}
            </span>
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: '#111827', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {storeName || 'Aking Tindahan'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{user?.email}</p>
          </div>
        </div>

        {/* Equal-width two-column grid, fills full width */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

          {/* ── PROFILE CARD ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-user" style={{ fontSize: 14, color: '#16a34a' }} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Profile Info
              </p>
            </div>

            {profileError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" style={{ color: '#dc2626', fontSize: 14 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>{profileError}</p>
              </div>
            )}
            {profileSuccess && (
              <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-circle-check" style={{ color: '#16a34a', fontSize: 14 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>{profileSuccess}</p>
              </div>
            )}

            <div>
              <label className="prof-label">Pangalan ng Tindahan</label>
              <input className="prof-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g., Aling Nena's Store" />
            </div>
            <div>
              <label className="prof-label">Full Name</label>
              <input className="prof-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g., Juan dela Cruz" />
            </div>
            <div>
              <label className="prof-label">Email</label>
              <input className="prof-input" value={user?.email || ''} disabled style={{ background: '#f9fafb', color: '#9ca3af' }} />
            </div>

            <button className="prof-btn" onClick={handleSaveProfile} disabled={profileLoading}>
              {profileLoading ? <><i className="ti ti-loader-3" style={{ animation: 'spin 1s linear infinite' }} /> Nag-save...</> : <><i className="ti ti-check" /> I-save ang Profile</>}
            </button>
          </div>

          {/* ── PASSWORD CARD ── */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-lock" style={{ fontSize: 14, color: '#ea580c' }} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Baguhin ang Password
              </p>
            </div>

            {passError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" style={{ color: '#dc2626', fontSize: 14 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>{passError}</p>
              </div>
            )}
            {passSuccess && (
              <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-circle-check" style={{ color: '#16a34a', fontSize: 14 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>{passSuccess}</p>
              </div>
            )}

            <div>
              <label className="prof-label">Bagong Password</label>
              <input className="prof-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" />
            </div>
            <div>
              <label className="prof-label">Kumpirmahin ang Password</label>
              <input className="prof-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulitin ang bagong password" />
            </div>

            <button
              className="prof-btn"
              onClick={handleChangePassword}
              disabled={passLoading}
              style={{ background: passLoading ? '#d1d5db' : '#ea580c', boxShadow: '0 4px 12px rgba(234,88,12,0.25)' }}
            >
              {passLoading ? <><i className="ti ti-loader-3" style={{ animation: 'spin 1s linear infinite' }} /> Nagbabago...</> : <><i className="ti ti-lock" /> Baguhin ang Password</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}