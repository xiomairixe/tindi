import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultPlan = searchParams.get('plan') || 'basic'

  const [form, setForm] = useState({
    storeName: '',
    email: '',
    password: '',
    confirmPassword: '',
    plan: defaultPlan,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          store_name: form.storeName,
          plan: form.plan,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    navigate('/login?registered=true')
  }

  const plans = [
    {
      key: 'basic',
      label: 'Basic',
      price: 'Libre',
      desc: 'Web only, solo tindera/tindero',
    },
    {
      key: 'advanced',
      label: 'Advanced',
      price: 'Bayad',
      desc: 'Web + Mobile, offline sync',
    },
    {
      key: 'pro',
      label: 'Pro + POS',
      price: 'Premium',
      desc: 'Multi-branch, full POS',
    },
  ]

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
        .rp-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
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
        .rp-plan-btn {
          flex: 1;
          padding: 12px 8px;
          border-radius: 10px;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          font-family: Inter, sans-serif;
        }
        .rp-plan-btn:hover { border-color: #3d8f7d; }
        .rp-plan-btn.active {
          border-color: #3d8f7d;
          background: #f0faf8;
          box-shadow: 0 0 0 3px rgba(61, 143, 125, 0.1);
        }
      `}</style>

      {/* LEFT PANEL — Image */}
      <div style={{
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
            <span style={{
              color: '#322f2f', fontSize: 22, fontWeight: 900,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              textShadow: '0 1px 4px rgba(0,0,0,0.25)',
            }}>TINDI</span>
          </Link>
        </div>

        {/* Bottom tagline */}
        <div style={{ position: 'absolute', bottom: 36, left: 36, right: 36, zIndex: 2 }}>
          <p style={{
            fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            margin: '0 0 4px', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            Sari-sari store management
          </p>
          <p style={{
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
      <div style={{
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
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Back link */}
          <Link to="/" className="rp-back" style={{ marginBottom: 32, display: 'inline-flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Bumalik sa home
          </Link>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
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

          {/* Store name */}
          <div style={{ marginBottom: 16 }}>
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

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
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
          <div style={{ marginBottom: 16 }}>
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
          <div style={{ marginBottom: 20 }}>
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
            disabled={loading || !form.email || !form.password || !form.storeName}
          >
            {loading && <span className="rp-spinner" />}
            {loading ? 'Nagre-register...' : 'Gumawa ng account'}
          </button>

          {/* Terms note */}
          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
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