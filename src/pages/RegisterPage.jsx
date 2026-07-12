import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { trackRegistration } from '../lib/analytics'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle } = useAuthStore()

  const [form, setForm] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Hindi magkapareho ang password. Subukan ulit.')
      return
    }
    if (form.password.length < 6) {
      setError('Kailangan ng minimum 6 na character ang password.')
      return
    }

    setLoading(true)

    try {
      await signUp(form.email, form.password, form.storeName, form.ownerName)
      await trackRegistration(form.email, { storeName: form.storeName, ownerName: form.ownerName })
      navigate('/login?registered=true')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
      // Redirect is handled by Supabase OAuth flow (redirectTo option)
    } catch (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#fff',
      fontFamily: 'Inter, sans-serif',
    }}>
      <style>{`
        @keyframes rp-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes rp-error-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rp-spin {
          to { transform: rotate(360deg); }
        }

        .rp-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          font-family: Inter, sans-serif;
          background: #fff;
          color: #111827;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .rp-input:focus {
          border-color: #3d8f7d;
          box-shadow: 0 0 0 3px rgba(61, 143, 125, 0.12);
        }
        .rp-input::placeholder { color: #9ca3af; }

        .rp-submit {
          width: 100%;
          padding: 12px;
          background: #3d8f7d;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: Plus Jakarta Sans, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
        }
        .rp-submit:hover:not(:disabled) {
          background: #2d7a6f;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(61, 143, 125, 0.28);
        }
        .rp-submit:active:not(:disabled) { transform: translateY(0) scale(0.98); }
        .rp-submit:disabled { background: #9fd3cb; cursor: not-allowed; }

        .rp-google-btn {
          width: 100%;
          padding: 11px;
          background: #fff;
          border: 1.5px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          font-family: Inter, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
        }
        .rp-google-btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #d1d5db;
        }
        .rp-google-btn:active:not(:disabled) { transform: scale(0.98); }
        .rp-google-btn:disabled { cursor: not-allowed; opacity: 0.6; }

        .rp-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
        }
        .rp-divider-line {
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }
        .rp-divider-text {
          font-size: 12px;
          color: #9ca3af;
          font-weight: 600;
        }

        .rp-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          animation: rp-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .rp-spinner-dark {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(55,65,81,0.2);
          border-top-color: #374151;
          animation: rp-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        .rp-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 600; color: #6b7280;
          text-decoration: none; padding: 8px 0;
          transition: color 0.2s ease;
        }
        .rp-back:hover { color: #3d8f7d; }

        /* Tablet: 641px - 1024px */
        @media (max-width: 1024px) {
          .rp-image-panel {
            width: 35%;
          }
          .rp-form-container {
            padding: 40px 32px;
          }
        }

        /* Mobile: 640px and below */
        @media (max-width: 640px) {
          .rp-image-panel {
            display: none;
          }
          .rp-form-container {
            padding: 32px 24px;
            width: 100%;
          }
          .rp-form-wrapper {
            max-width: 100% !important;
          }
          .rp-header h2 {
            font-size: 24px !important;
          }
          .rp-header p {
            font-size: 13px !important;
          }
          .rp-form-group {
            margin-bottom: 13px !important;
          }
          .rp-input {
            padding: 10px 12px !important;
            font-size: 13px !important;
          }
          .rp-submit {
            padding: 11px !important;
            font-size: 13px !important;
            margin-top: 16px !important;
          }
          .rp-google-btn {
            padding: 10px !important;
            font-size: 13px !important;
          }
          .rp-back {
            font-size: 12px !important;
            margin-bottom: 24px !important;
          }
          .rp-terms {
            font-size: 11px !important;
          }
          .rp-logo-text {
            font-size: 18px !important;
          }
          .rp-tagline-main {
            font-size: 18px !important;
          }
          .rp-tagline-sub {
            font-size: 12px !important;
          }
        }

        /* Small mobile: 480px and below */
        @media (max-width: 480px) {
          .rp-form-container {
            padding: 24px 16px;
            justify-content: flex-start;
            padding-top: 40px;
          }
          .rp-header h2 {
            font-size: 22px !important;
          }
          .rp-header {
            margin-bottom: 20px !important;
          }
          .rp-form-group {
            margin-bottom: 12px !important;
          }
          .rp-submit {
            margin-top: 14px !important;
          }
        }
      `}</style>

      {/* LEFT PANEL — Image (hidden on mobile) */}
      <div className="rp-image-panel" style={{
        width: '48%',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        borderRight: '1px solid #f0f0f0',
      }}>
        <img
          src="/Tindi_Sign.png"
          alt="Tindi"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',     
            objectPosition: 'bottom right',
            transform: 'scaleX(-1)'
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)',
          zIndex: 1,
        }} />

        {/* Logo */}
        <div style={{ position: 'absolute', top: 32, left: 36, zIndex: 2 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <img src="/Tindi.png" alt="Tindi" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span className="rp-logo-text" style={{
              color: '#322f2f', fontSize: 22, fontWeight: 900,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              textShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }}>TINDI</span>
          </Link>
        </div>

        {/* Bottom tagline */}
        <div style={{ position: 'absolute', bottom: 36, left: 36, right: 36, zIndex: 2 }}>
          <p className="rp-tagline-sub" style={{
            fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            margin: '0 0 4px', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            Sari-sari store management
          </p>
          <p className="rp-tagline-main" style={{
            fontSize: 22, fontWeight: 900, color: '#fff',
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            margin: 0, lineHeight: 1.3,
            textShadow: '0 1px 6px rgba(0,0,0,0.3)',
          }}>
            Simple. Smart. <span style={{ color: '#9fd3cb' }}>Tindi.</span>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL — Register form */}
      <div className="rp-form-container" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        background: '#fff',
        animation: 'rp-slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        overflowY: 'auto',
      }}>
        <div className="rp-form-wrapper" style={{ width: '100%', maxWidth: 400 }}>

          {/* Back link */}
          <Link to="/" className="rp-back" style={{ marginBottom: 32, display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Bumalik sa home
          </Link>

          {/* Header */}
          <div className="rp-header" style={{ marginBottom: 28 }}>
            <h2 style={{
              fontSize: 28, fontWeight: 900, color: '#111827',
              fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 6px',
            }}>
              Gumawa ng account
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              May account ka na?{' '}
              <Link to="/login" style={{ color: '#3d8f7d', fontWeight: 700, textDecoration: 'none' }}>
                Mag-login
              </Link>
            </p>
          </div>

          {/* Google Sign Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || googleLoading}
            className="rp-google-btn"
            style={{ marginBottom: 20 }}
          >
            {googleLoading ? (
              <span className="rp-spinner-dark" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Konek sa Google...' : 'Mag-register gamit ang Google'}
          </button>

          {/* Divider */}
          <div className="rp-divider">
            <div className="rp-divider-line" />
            <span className="rp-divider-text">o mag-register gamit ang email</span>
            <div className="rp-divider-line" />
          </div>

          {/* Store name */}
          <div className="rp-form-group" style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Pangalan ng tindahan
            </label>
            <input
              className="rp-input"
              name="storeName"
              type="text"
              placeholder="Aling Nena's Store"
              value={form.storeName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Owner name */}
          <div className="rp-form-group" style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Pangalan mo
            </label>
            <input
              className="rp-input"
              name="ownerName"
              type="text"
              placeholder="Juan dela Cruz"
              value={form.ownerName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="rp-form-group" style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <input
              className="rp-input"
              name="email"
              type="email"
              placeholder="juan@tindahan.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password */}
          <div className="rp-form-group" style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Password
            </label>
            <input
              className="rp-input"
              name="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {/* Confirm password */}
          <div className="rp-form-group" style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Ulitin ang password
            </label>
            <input
              className="rp-input"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16,
              animation: 'rp-error-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}>
              <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            className="rp-submit"
            onClick={handleSubmit}
            disabled={loading || googleLoading || !form.email || !form.password || !form.storeName || !form.ownerName}
          >
            {loading && <span className="rp-spinner" />}
            {loading ? 'Nagre-register...' : 'Gumawa ng account'}
          </button>

          {/* Terms note */}
          <p className="rp-terms" style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            Sa pag-register, sumasang-ayon ka sa aming{' '}
            <a href="#" style={{ color: '#6b7280', textDecoration: 'underline' }}>Terms of Service</a>
            {' '}at{' '}
            <a href="#" style={{ color: '#6b7280', textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>

        </div>
      </div>
    </div>
  )
}