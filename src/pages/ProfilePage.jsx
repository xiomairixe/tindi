import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { uploadImageToCloudinary } from '../lib/cloudinary'

// ── Subscription helpers ──────────────────────────────────────────────────────

async function fetchSubscriptionData(userId) {
  console.log('🔍 Fetching subscription for userId:', userId)
  
  if (!userId) {
    console.warn('⚠️ No userId provided')
    return null
  }

  // Fetch store + plan data
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select(`
      id,
      plan_id,
      plan_started_at,
      plan_expires_at,
      plans (
        id, name, price, features, limits, is_active
      )
    `)
    .eq('user_id', userId)
    .single()

  if (storeErr) {
    console.error('❌ Store fetch error:', storeErr)
    // Debug: log the error details
    console.error('Error code:', storeErr.code, '| Message:', storeErr.message)
    return null
  }

  if (!store) {
    console.warn('⚠️ No store found for userId:', userId)
    return null
  }

  console.log('✅ Store found:', store)

  // Fetch usage counts
  try {
    const [
      { count: usedProducts, error: prodErr },
      { count: usedSales, error: salesErr },
      { count: usedExpenses, error: expErr },
    ] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', store.id),
      supabase.from('sales').select('*', { count: 'exact', head: true }).eq('store_id', store.id),
      supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('store_id', store.id),
    ])

    if (prodErr) console.error('❌ Products count error:', prodErr)
    if (salesErr) console.error('❌ Sales count error:', salesErr)
    if (expErr) console.error('❌ Expenses count error:', expErr)

    const result = {
      storeId: store.id,
      plan: store.plans,
      plan_started_at: store.plan_started_at,
      plan_expires_at: store.plan_expires_at,
      usage: {
        products: usedProducts ?? 0,
        sales: usedSales ?? 0,
        expenses: usedExpenses ?? 0,
      },
    }
    console.log('✅ Subscription data ready:', result)
    return result
  } catch (err) {
    console.error('❌ Error fetching usage counts:', err)
    return null
  }
}

async function fetchAllPlans() {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, price, features, limits')
    .eq('is_active', true)
    .order('price', { ascending: true })
  
  if (error) {
    console.error('❌ Plans fetch error:', error)
    return []
  }
  
  console.log('✅ Plans fetched:', data?.length)
  return data ?? []
}

async function fetchPendingRequest(storeId) {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('id, status, plan_id, created_at, ewallet_type, amount_paid')
    .eq('store_id', storeId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows found", which is expected
    console.error('❌ Pending request error:', error)
  }
  
  return data ?? null
}

// ── Small UI pieces ───────────────────────────────────────────────────────────

function UsageBar({ label, used, max }) {
  const unlimited = max === -1 || max == null
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / max) * 100))
  const danger = pct >= 90
  const warn   = pct >= 70
  const barColor = danger ? '#ef4444' : warn ? '#f59e0b' : '#16a34a'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          {used.toLocaleString()}
          {unlimited ? ' / ∞' : ` / ${max.toLocaleString()}`}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden' }}>
        {!unlimited && (
          <div style={{
            width: `${pct}%`, height: '100%',
            background: barColor, borderRadius: 99,
            transition: 'width 0.6s ease',
          }} />
        )}
        {unlimited && (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(90deg, #16a34a22, #16a34a44)',
            borderRadius: 99,
          }} />
        )}
      </div>
      {danger && !unlimited && (
        <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 500 }}>
          Malapit na sa limit — i-upgrade ang plan.
        </span>
      )}
    </div>
  )
}

function DaysChip({ expiresAt }) {
  if (!expiresAt) return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: '#6b7280',
      background: '#f3f4f6', padding: '2px 10px', borderRadius: 99,
    }}>
      Walang expiry
    </span>
  )
  const days = Math.ceil((new Date(expiresAt) - Date.now()) / 86400000)
  const expired = days <= 0
  const danger  = days <= 7 && !expired
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: expired ? '#dc2626' : danger ? '#d97706' : '#16a34a',
      background: expired ? '#fee2e2' : danger ? '#fef3c7' : '#f0fdf4',
      padding: '3px 10px', borderRadius: 99,
    }}>
      {expired ? 'Expired na' : danger ? `${days} araw na lang` : `${days} araw pa`}
    </span>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? 20 : 7,
            height: 7,
            borderRadius: 99,
            background: i === step ? '#16a34a' : i < step ? '#bbf7d0' : '#e5e7eb',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

// ── Payment Modal (multi-step) ────────────────────────────────────────────────

const EWALLET_CONFIG = {
  gcash: {
    label: 'GCash',
    color: '#007DFF',
    bg: '#eff6ff',
    border: '#bfdbfe',
    number: '0916-706-0932',        // ← palitan ng actual number
  },
  maya: {
    label: 'Maya',
    color: '#00A86B',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    number: '0916-706-0932',        // ← palitan ng actual number
  },
}

// Auto-derives: /payment_gateway/gcash_advanced.png
// (plan.name "Advanced Plan" → slug "advanced_plan")
function getQrUrl(ewalletType, planName) {
  const slug = planName?.toLowerCase().trim().replace(/\s+/g, '_') ?? 'basic'
  return `/payment_gateway/${ewalletType}_${slug}.png`
}

// Renders plan-specific QR; graceful fallback kung hindi pa naka-upload ang image
function QrImage({ src, border, color, planName, ewalletLabel }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  if (failed) {
    return (
      <div style={{
        width: 160, height: 160, borderRadius: 12,
        background: '#fff', border: `1.5px dashed ${border}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <i className="ti ti-qrcode" style={{ fontSize: 48, color, opacity: 0.35 }} />
        <span style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
          QR para sa<br />
          <strong style={{ color: '#374151' }}>{ewalletLabel} – {planName}</strong><br />
          <span style={{ color: '#f59e0b' }}>Hindi pa naka-upload</span>
        </span>
      </div>
    )
  }

  return (
    <div style={{
      width: 160, height: 160, borderRadius: 12,
      background: '#fff', border: `1.5px solid ${border}`,
      overflow: 'hidden', flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    }}>
      <img
        src={src}
        alt={`${ewalletLabel} QR – ${planName}`}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  )
}

function PaymentModal({ targetPlan, storeId, onClose, onSuccess }) {
  const [step, setStep]             = useState(0)  // 0=pick wallet, 1=scan&fill, 2=success
  const [ewalletType, setEwallet]   = useState(null)
  const [amount, setAmount]         = useState(targetPlan?.price ? String(targetPlan.price) : '')
  const [note, setNote]             = useState('')
  const [receiptFile, setReceipt]   = useState(null)
  const [previewUrl, setPreview]    = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const fileRef = useRef()

  const cfg = ewalletType ? EWALLET_CONFIG[ewalletType] : null

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setReceipt(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    setError(null)
    if (!receiptFile) return setError('Kailangan ng receipt screenshot.')
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      return setError('Ilagay ang tamang halaga.')

    setLoading(true)
    try {
      // 1. Upload receipt to Cloudinary (required)
      console.log('🔍 Uploading receipt...', receiptFile)
      const receiptUrl = await uploadImageToCloudinary(receiptFile, 'receipts')
      console.log('✅ Receipt URL:', receiptUrl)
      if (!receiptUrl) throw new Error('Failed to upload receipt image.')

      // 2. Insert payment request
      const { error: insertErr } = await supabase
        .from('payment_requests')
        .insert({
          store_id:     storeId,
          plan_id:      targetPlan.id,
          ewallet_type: ewalletType,
          amount_paid:  Number(amount),
          receipt_url:  receiptUrl,
          note:         note.trim() || null,
          status:       'pending',
        })
      if (insertErr) throw insertErr

      setStep(2)
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
          zIndex: 1100,
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1101, width: '100%', maxWidth: 480,
        maxHeight: '92vh', overflowY: 'auto',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 28px 80px rgba(0,0,0,0.2)',
        fontFamily: 'Inter, sans-serif',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: step < 2 ? '1px solid #f3f4f6' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff',
          borderRadius: '20px 20px 0 0', zIndex: 1,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#111827',
              fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {step === 0 && 'Pumili ng E-Wallet'}
              {step === 1 && `Mag-bayad via ${cfg?.label}`}
              {step === 2 && 'Submitted! 🎉'}
            </p>
            {step < 2 && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                Upgrade sa <strong style={{ color: '#16a34a' }}>{targetPlan?.name}</strong>
                {targetPlan?.price > 0 && ` — ₱${Number(targetPlan.price).toLocaleString()}/mo`}
              </p>
            )}
          </div>
          {step < 2 && (
            <button onClick={onClose} style={{
              background: '#f3f4f6', border: 'none', borderRadius: 8,
              width: 30, height: 30, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
            }}>
              <i className="ti ti-x" style={{ fontSize: 16 }} />
            </button>
          )}
        </div>

        <div style={{ padding: '16px 22px 24px' }}>
          {/* Step dots */}
          {step < 2 && (
            <div style={{ marginBottom: 20 }}>
              <StepDots step={step} total={2} />
            </div>
          )}

          {/* ── STEP 0: Pick wallet ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                Saan mo ipapadala ang bayad?
              </p>
              {(['gcash', 'maya']).map(type => {
                const c = EWALLET_CONFIG[type]
                return (
                  <button
                    key={type}
                    onClick={() => { setEwallet(type); setStep(1) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px',
                      border: `1.5px solid ${c.border}`,
                      borderRadius: 14, background: c.bg, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: c.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 18, color: '#fff', fontWeight: 800 }}>
                        {type === 'gcash' ? 'G' : 'M'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{c.label}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{c.number}</p>
                    </div>
                    <i className="ti ti-chevron-right" style={{
                      marginLeft: 'auto', fontSize: 16, color: '#9ca3af',
                    }} />
                  </button>
                )
              })}
            </div>
          )}

          {/* ── STEP 1: Scan QR + fill form ── */}
          {step === 1 && cfg && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* QR box — plan-specific image */}
              <div style={{
                border: `2px dashed ${cfg.border}`,
                borderRadius: 14, padding: '20px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                background: cfg.bg,
              }}>
                <QrImage
                  src={getQrUrl(ewalletType, targetPlan?.name)}
                  border={cfg.border}
                  color={cfg.color}
                  planName={targetPlan?.name}
                  ewalletLabel={cfg.label}
                />
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                  I-scan ang QR code o mag-send sa<br />
                  <strong style={{ color: cfg.color }}>{cfg.number}</strong>
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                  Dapat: <strong style={{ color: '#374151' }}>
                    ₱{targetPlan?.price > 0 ? Number(targetPlan.price).toLocaleString() : 'ang agreed amount'}
                  </strong>
                </p>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '10px 14px', background: '#fee2e2',
                  border: '1px solid #fecaca', borderRadius: 10,
                  display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <i className="ti ti-alert-circle" style={{ color: '#dc2626', fontSize: 14, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>{error}</p>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="prof-label">Halaga na Binayad (₱)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 14, color: '#9ca3af', fontWeight: 600,
                  }}>₱</span>
                  <input
                    className="prof-input"
                    type="number"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ paddingLeft: 28 }}
                  />
                </div>
              </div>

              {/* Receipt upload */}
              <div>
                <label className="prof-label">Screenshot ng Receipt</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `1.5px dashed ${receiptFile ? '#16a34a' : '#d1d5db'}`,
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    cursor: 'pointer', background: receiptFile ? '#f0fdf4' : '#f9fafb',
                    transition: 'all 0.2s',
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="receipt preview"
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 8 }}
                    />
                  ) : (
                    <>
                      <i className="ti ti-upload" style={{ fontSize: 28, color: '#9ca3af' }} />
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
                        I-click para mag-upload ng screenshot<br />
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>PNG, JPG, WEBP • Max 5MB</span>
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {receiptFile && (
                  <p style={{ margin: '5px 0 0', fontSize: 11, color: '#16a34a' }}>
                    <i className="ti ti-check" /> {receiptFile.name}
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="prof-label">Note sa Admin <span style={{ color: '#9ca3af', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className="prof-input"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g., Bayad para sa Advanced plan, ref# 12345..."
                  rows={2}
                  style={{ resize: 'vertical', minHeight: 64 }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setStep(0); setError(null) }}
                  style={{
                    flex: 1, padding: '11px 0',
                    background: '#f3f4f6', border: 'none', borderRadius: 10,
                    fontSize: 13, fontWeight: 600, color: '#6b7280', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <i className="ti ti-arrow-left" style={{ fontSize: 14 }} />
                  Bumalik
                </button>
                <button
                  className="prof-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ flex: 2 }}
                >
                  {loading
                    ? <><i className="ti ti-loader-3" style={{ animation: 'spin 1s linear infinite' }} /> Nagsu-submit...</>
                    : <><i className="ti ti-send" /> I-submit ang Bayad</>}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Success ── */}
          {step === 2 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 16, padding: '10px 0 8px', textAlign: 'center',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(22,163,74,0.3)',
              }}>
                <i className="ti ti-check" style={{ fontSize: 36, color: '#fff' }} />
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#111827',
                  fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Nai-submit na!
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                  Ang iyong payment request para sa{' '}
                  <strong style={{ color: '#16a34a' }}>{targetPlan?.name}</strong>{' '}
                  ay nakatanggap na ng admin.<br />
                  Mag-a-activate ang plan mo after ma-approve.
                </p>
              </div>
              <div style={{
                width: '100%', background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <i className="ti ti-info-circle" style={{ fontSize: 15, color: '#16a34a', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#15803d', textAlign: 'left', lineHeight: 1.5 }}>
                  Karaniwang 1–24 oras ang processing. Makikita ang status
                  sa iyong Profile page.
                </p>
              </div>
              <button
                className="prof-btn"
                onClick={onClose}
                style={{ width: '100%', marginTop: 4 }}
              >
                <i className="ti ti-check" /> Okay, Salamat!
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Pending request banner ────────────────────────────────────────────────────

function PendingBanner({ request, plans }) {
  if (!request) return null
  const plan = plans.find(p => p.id === request.plan_id)
  return (
    <div style={{
      background: '#fffbeb', border: '1.5px solid #fde68a',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: '#fef3c7', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-clock" style={{ fontSize: 16, color: '#d97706' }} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' }}>
          May pending na payment request
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#a16207' }}>
          {plan ? `Para sa ${plan.name}` : 'Plan upgrade'} · via {request.ewallet_type?.toUpperCase()} ·{' '}
          Naghihintay ng approval ng admin
        </p>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
        color: '#d97706', background: '#fef3c7', padding: '3px 8px', borderRadius: 99,
      }}>
        PENDING
      </span>
    </div>
  )
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────────

function UpgradeModal({ plans, currentPlanId, storeId, hasPending, onClose, onPaymentSuccess }) {
  const [targetPlan, setTargetPlan] = useState(null)

  if (targetPlan) {
    return (
      <PaymentModal
        targetPlan={targetPlan}
        storeId={storeId}
        onClose={() => { setTargetPlan(null); onClose() }}
        onSuccess={() => { onPaymentSuccess?.(); onClose() }}
      />
    )
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
          zIndex: 1000,
        }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001, width: '100%', maxWidth: 560,
        maxHeight: '88vh', overflowY: 'auto',
        background: '#fff', borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        fontFamily: 'Inter, sans-serif',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>
              Mga Available na Plan
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              Pumili ng plan para simulan ang payment process.
            </p>
          </div>
          <button onClick={onClose} style={{
            background: '#f3f4f6', border: 'none', borderRadius: 8,
            width: 30, height: 30, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
          }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Pending warning */}
        {hasPending && (
          <div style={{ padding: '14px 24px 0' }}>
            <div style={{
              background: '#fffbeb', border: '1.5px solid #fde68a',
              borderRadius: 10, padding: '10px 14px',
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <i className="ti ti-alert-triangle" style={{ color: '#d97706', fontSize: 14, flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                May pending pa na request. Hintayin muna ang approval bago mag-submit ng bago.
              </p>
            </div>
          </div>
        )}

        {/* Plan cards */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {plans.map(plan => {
            const isCurrent = plan.id === currentPlanId
            const tierColor = plan.price === 0 ? '#6b7280' : plan.price < 500 ? '#2563eb' : '#9333ea'
            const canUpgrade = !isCurrent && plan.price > 0 && !hasPending

            return (
              <div key={plan.id} style={{
                border: `1.5px solid ${isCurrent ? '#16a34a' : '#e5e7eb'}`,
                borderRadius: 12, padding: '16px 18px',
                background: isCurrent ? '#f0fdf4' : '#fff',
                position: 'relative',
              }}>
                {isCurrent && (
                  <span style={{
                    position: 'absolute', top: -10, left: 14,
                    background: '#16a34a', color: '#fff',
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                    padding: '2px 10px', borderRadius: 99,
                  }}>
                    KASALUKUYAN
                  </span>
                )}
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: 10, gap: 10,
                }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{plan.name}</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: tierColor, flexShrink: 0 }}>
                    {plan.price === 0 ? 'Free' : `₱${Number(plan.price).toLocaleString()}`}
                    {plan.price > 0 && <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>/mo</span>}
                  </p>
                </div>
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-check" style={{ fontSize: 12, color: '#16a34a', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#4b5563' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                )}
                {canUpgrade && (
                  <button
                    onClick={() => setTargetPlan(plan)}
                    style={{
                      width: '100%', padding: '9px 0',
                      background: tierColor, border: 'none', borderRadius: 8,
                      fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <i className="ti ti-arrow-up-circle" style={{ fontSize: 14 }} />
                    Mag-upgrade sa {plan.name}
                  </button>
                )}
                {isCurrent && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, color: '#16a34a', fontWeight: 600,
                  }}>
                    <i className="ti ti-check" style={{ fontSize: 13 }} />
                    Kasalukuyang aktibong plan
                  </div>
                )}
                {!canUpgrade && !isCurrent && (
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>
                    {plan.price === 0 ? 'Free plan (default)' : 'May pending request na'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Subscription Card ─────────────────────────────────────────────────────────

function SubscriptionCard({ userId }) {
  const [subData, setSubData]     = useState(null)
  const [allPlans, setAllPlans]   = useState([])
  const [pendingReq, setPending]  = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showUpgrade, setUpgrade] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const load = () => {
    if (!userId) {
      console.warn('⚠️ No userId in SubscriptionCard')
      setLoading(false)
      return
    }
    
    setLoading(true)
    setLoadError(null)
    console.log('📋 Starting subscription load for userId:', userId)
    
    Promise.all([fetchSubscriptionData(userId), fetchAllPlans()])
      .then(async ([sub, plans]) => {
        console.log('📊 Load complete. Sub:', sub, 'Plans:', plans?.length)
        setSubData(sub)
        setAllPlans(plans)
        
        if (sub?.storeId) {
          console.log('🔔 Fetching pending requests for storeId:', sub.storeId)
          const pending = await fetchPendingRequest(sub.storeId)
          console.log('📌 Pending request:', pending)
          setPending(pending)
        }
      })
      .catch(err => {
        console.error('❌ Load error:', err)
        setLoadError(err.message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [userId])

  if (loading) return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb',
      padding: 20, display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 20, height: 20, border: '2px solid #d1fae5',
        borderTopColor: '#16a34a', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite', flexShrink: 0,
      }} />
      <span style={{ fontSize: 13, color: '#6b7280' }}>Kinukuha ang subscription info...</span>
    </div>
  )

  if (loadError) return (
    <div style={{
      background: '#fee2e2', borderRadius: 16, border: '1.5px solid #fecaca', padding: 20,
    }}>
      <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>
        <strong>Error loading subscription:</strong> {loadError}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#a16207' }}>
        Subukan ang refresh. Kung patuloy ang problema, makipag-ugnayan sa admin.
      </p>
    </div>
  )

  if (!subData) return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb', padding: 20,
    }}>
      <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
        Hindi makita ang subscription data. Makipag-ugnayan sa admin.
      </p>
    </div>
  )

  const { storeId, plan, plan_started_at, plan_expires_at, usage } = subData
  const limits = plan?.limits ?? {}
  const tierColor = !plan || plan.price === 0
    ? '#6b7280'
    : plan.price < 500 ? '#2563eb' : '#9333ea'

  return (
    <>
      <div style={{
        background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb',
        overflow: 'hidden',
      }}>
        {/* Plan header strip */}
        <div style={{
          background: `linear-gradient(135deg, ${tierColor}18, ${tierColor}08)`,
          borderBottom: `1px solid ${tierColor}22`,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: tierColor, opacity: 0.9,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className="ti ti-license" style={{ fontSize: 18, color: '#fff' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Kasalukuyang Plan
              </p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>
                {plan?.name ?? 'Walang Plan'}
                {plan && plan.price > 0 && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginLeft: 6 }}>
                    ₱{Number(plan.price).toLocaleString()}/mo
                  </span>
                )}
                {plan && plan.price === 0 && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginLeft: 6 }}>
                    Free
                  </span>
                )}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <DaysChip expiresAt={plan_expires_at} />
            <button
              onClick={() => setUpgrade(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: '#0f2318', border: 'none', borderRadius: 8,
                fontSize: 12, fontWeight: 600, color: '#4ade80',
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <i className="ti ti-arrow-up-circle" style={{ fontSize: 14 }} />
              Tingnan ang Plans
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Pending banner */}
          <PendingBanner request={pendingReq} plans={allPlans} />

          {/* Dates */}
          {(plan_started_at || plan_expires_at) && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {plan_started_at && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.4 }}>Nagsimula</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {new Date(plan_started_at).toLocaleDateString('fil-PH', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              )}
              {plan_expires_at && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.4 }}>Mag-e-expire</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                    {new Date(plan_expires_at).toLocaleDateString('fil-PH', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Usage bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Paggamit
            </p>
            <UsageBar label="Mga Produkto" used={usage.products} max={limits.max_products} />
            <UsageBar label="Mga Benta"    used={usage.sales}    max={limits.max_sales} />
            <UsageBar label="Mga Gastusin" used={usage.expenses} max={limits.max_expenses} />
          </div>

          {/* Features */}
          {Array.isArray(plan?.features) && plan.features.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Kasama sa Plan
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '4px 12px',
              }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="ti ti-check" style={{ fontSize: 12, color: '#16a34a', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#4b5563' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showUpgrade && (
        <UpgradeModal
          plans={allPlans}
          currentPlanId={plan?.id}
          storeId={storeId}
          hasPending={!!pendingReq}
          onClose={() => setUpgrade(false)}
          onPaymentSuccess={load}
        />
      )}
    </>
  )
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuthStore()

  const [storeName, setStoreName]             = useState(user?.user_metadata?.store_name || '')
  const [fullName, setFullName]               = useState(user?.user_metadata?.full_name || '')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(null)
  const [profileError, setProfileError]     = useState(null)

  const [passLoading, setPassLoading] = useState(false)
  const [passSuccess, setPassSuccess] = useState(null)
  const [passError, setPassError]     = useState(null)

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

      {/* Page Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ padding: '24px 28px' }}>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: '#1a3a2a',
            fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '0 0 4px',
          }}>
            Profile
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            I-manage ang iyong account at subscription
          </p>
        </div>
      </div>

      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, #16a34a, #4ade80)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#fff',
              fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {initials}
            </span>
          </div>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: '#111827',
              fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {storeName || 'Aking Tindahan'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{user?.email}</p>
          </div>
        </div>

        {/* Subscription Card */}
        <SubscriptionCard userId={user?.id} />

        {/* Profile + Password */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, alignItems: 'start',
        }}>
          {/* Profile Card */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb',
            padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: '#f0fdf4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-user" style={{ fontSize: 14, color: '#16a34a' }} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827',
                fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Profile Info
              </p>
            </div>

            {profileError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2',
                border: '1px solid #fecaca', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" style={{ color: '#dc2626', fontSize: 14 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>{profileError}</p>
              </div>
            )}
            {profileSuccess && (
              <div style={{ padding: '10px 14px', background: '#f0fdf4',
                border: '1px solid #bbf7d0', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-circle-check" style={{ color: '#16a34a', fontSize: 14 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>{profileSuccess}</p>
              </div>
            )}

            <div>
              <label className="prof-label">Pangalan ng Tindahan</label>
              <input className="prof-input" value={storeName}
                onChange={e => setStoreName(e.target.value)}
                placeholder="e.g., Aling Nena's Store" />
            </div>
            <div>
              <label className="prof-label">Full Name</label>
              <input className="prof-input" value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g., Juan dela Cruz" />
            </div>
            <div>
              <label className="prof-label">Email</label>
              <input className="prof-input" value={user?.email || ''} disabled
                style={{ background: '#f9fafb', color: '#9ca3af' }} />
            </div>
            <button className="prof-btn" onClick={handleSaveProfile} disabled={profileLoading}>
              {profileLoading
                ? <><i className="ti ti-loader-3" style={{ animation: 'spin 1s linear infinite' }} /> Nag-save...</>
                : <><i className="ti ti-check" /> I-save ang Profile</>}
            </button>
          </div>

          {/* Password Card */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1.5px solid #e5e7eb',
            padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: '#fff7ed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-lock" style={{ fontSize: 14, color: '#ea580c' }} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827',
                fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Baguhin ang Password
              </p>
            </div>

            {passError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2',
                border: '1px solid #fecaca', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-alert-circle" style={{ color: '#dc2626', fontSize: 14 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#991b1b' }}>{passError}</p>
              </div>
            )}
            {passSuccess && (
              <div style={{ padding: '10px 14px', background: '#f0fdf4',
                border: '1px solid #bbf7d0', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="ti ti-circle-check" style={{ color: '#16a34a', fontSize: 14 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#15803d' }}>{passSuccess}</p>
              </div>
            )}

            <div>
              <label className="prof-label">Bagong Password</label>
              <input className="prof-input" type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters" />
            </div>
            <div>
              <label className="prof-label">Kumpirmahin ang Password</label>
              <input className="prof-input" type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ulitin ang bagong password" />
            </div>
            <button
              className="prof-btn"
              onClick={handleChangePassword}
              disabled={passLoading}
              style={{
                background: passLoading ? '#d1d5db' : '#ea580c',
                boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
              }}
            >
              {passLoading
                ? <><i className="ti ti-loader-3" style={{ animation: 'spin 1s linear infinite' }} /> Nagbabago...</>
                : <><i className="ti ti-lock" /> Baguhin ang Password</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}