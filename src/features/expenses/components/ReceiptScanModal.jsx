import { useState, useRef, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { useExpensesStore } from '../../../stores/expensesStore'
import Modal from '../../inventory/components/Modal'
import { FIXED_CATEGORIES } from './AddExpenseModal'

const todayStr = () => new Date().toISOString().split('T')[0]

// Resize + compress the photo before sending to the edge function.
// Keeps payload small (mas mabilis mag-upload, mas tipid sa bandwidth ng user).
const compressImage = (file, maxDimension = 1600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve({
          base64: dataUrl.split(',')[1],
          previewUrl: dataUrl,
          mimeType: 'image/jpeg',
        })
      }
      img.onerror = () => reject(new Error('Hindi mabuksan ang larawan'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Hindi mabasa ang file'))
    reader.readAsDataURL(file)
  })
}

// ── Line-item helpers ──────────────────────────────────────────────

const makeItemId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

// Normalize an item coming from the AI scan into our editable shape.
const normalizeItem = (raw) => {
  const quantity = raw.quantity && Number(raw.quantity) > 0 ? Number(raw.quantity) : 1
  let unit_price = raw.unit_price != null ? Number(raw.unit_price) : null
  if (unit_price == null || !Number.isFinite(unit_price)) {
    unit_price = raw.total_price != null ? Number(raw.total_price) / quantity : 0
  }
  return {
    id: makeItemId(),
    name: raw.name || 'Item',
    quantity,
    unit_price: Number.isFinite(unit_price) ? unit_price : 0,
    included: true,
  }
}

const blankItem = () => ({ id: makeItemId(), name: '', quantity: 1, unit_price: 0, included: true })

const lineTotal = (item) => (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)

// Builds a readable Notes block out of the (currently included) items list.
const buildNotes = (storeName, items) => {
  const lines = []
  if (storeName) lines.push(storeName)
  items
    .filter((i) => i.included && i.name.trim())
    .forEach((item) => {
      const qty = item.quantity && Number(item.quantity) !== 1 ? `${item.quantity}x ` : ''
      lines.push(`${qty}${item.name} - ₱${lineTotal(item).toFixed(2)}`)
    })
  return lines.join('\n')
}

const STEPS = {
  CAPTURE: 'capture',
  LOADING: 'loading',
  REVIEW: 'review',
  SAVING: 'saving',
}

export default function ReceiptScanModal({ isOpen, onClose, storeId, onSaved }) {
  const { addExpense } = useExpensesStore()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState(STEPS.CAPTURE)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState(null)
  const [scanResult, setScanResult] = useState(null)

  const [storeName, setStoreName] = useState('')
  const [items, setItems] = useState([])
  const [expenseDate, setExpenseDate] = useState(todayStr())
  const [category, setCategory] = useState('Supplies')
  const [amount, setAmount] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)

  const itemsTotal = useMemo(
    () => items.filter((i) => i.included).reduce((sum, i) => sum + lineTotal(i), 0),
    [items]
  )

  const resetState = () => {
    setStep(STEPS.CAPTURE)
    setPreviewUrl(null)
    setError(null)
    setScanResult(null)
    setStoreName('')
    setItems([])
    setExpenseDate(todayStr())
    setCategory('Supplies')
    setAmount('')
    setAmountTouched(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setStep(STEPS.LOADING)

    try {
      const { base64, previewUrl: preview, mimeType } = await compressImage(file)
      setPreviewUrl(preview)

      const { data, error: fnError } = await supabase.functions.invoke('scan-receipt', {
        body: { imageBase64: base64, mimeType },
      })

      if (fnError) throw new Error(fnError.message || 'Nabigo ang pag-scan ng resibo')
      if (!data?.success) throw new Error(data?.error || 'Nabigo ang pag-scan ng resibo')

      const result = data.data
      setScanResult(result)

      const normalizedItems = (result.items || []).map(normalizeItem)
      const suggestedCategory = FIXED_CATEGORIES.includes(result.suggested_category)
        ? result.suggested_category
        : 'Other'
      const computedTotal = normalizedItems
        .filter((i) => i.included)
        .reduce((sum, i) => sum + lineTotal(i), 0)

      setStoreName(result.store_name || '')
      setItems(normalizedItems)
      setExpenseDate(result.date || todayStr())
      setCategory(suggestedCategory)
      // Prefer the receipt's printed grand total when available, otherwise fall back to item sum
      setAmount(
        result.total_amount != null
          ? String(result.total_amount)
          : computedTotal
          ? computedTotal.toFixed(2)
          : ''
      )
      setAmountTouched(false)

      setStep(STEPS.REVIEW)
    } catch (err) {
      setError(err.message)
      setStep(STEPS.CAPTURE)
    }
  }

  const handleItemField = (id, field, value) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  }

  const handleRemoveItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const handleAddItem = () => {
    setItems((prev) => [...prev, blankItem()])
  }

  const handleUseItemsTotal = () => {
    setAmount(itemsTotal.toFixed(2))
    setAmountTouched(true)
  }

  const handleAmountChange = (e) => {
    setAmount(e.target.value)
    setAmountTouched(true)
  }

  const handleRetake = () => {
    resetState()
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError(null)

    if (!expenseDate) return setError('Date is required')
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid expense amount')
    if (!category) return setError('Category is required')
    if (!storeId) return setError('Store ID is missing')

    setStep(STEPS.SAVING)

    try {
      await addExpense(storeId, {
        expense_date: expenseDate,
        amount: parseFloat(amount),
        category,
        notes: buildNotes(storeName, items) || null,
      })
      onSaved?.()
      handleClose()
    } catch (err) {
      setError(err.message)
      setStep(STEPS.REVIEW)
    }
  }

  const isLowConfidence = scanResult?.confidence === 'low'
  const activeItemsCount = items.filter((i) => i.included).length
  const amountMismatch =
    !amountTouched && itemsTotal > 0 && Math.abs(parseFloat(amount || 0) - itemsTotal) > 0.01

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan Receipt" size="sm">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── STEP: CAPTURE ── */}
        {step === STEPS.CAPTURE && (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #d1d5db', borderRadius: 14, padding: '40px 20px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s ease',
                background: '#f9fafb',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#14b8a6'; e.currentTarget.style.background = '#f0fdfa' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb' }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#ccfbf1',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
              }}>
                <i className="ti ti-camera" style={{ fontSize: 26, color: '#0d9488' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
                I-picturan ang resibo
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                Tap para mag-camera o pumili ng photo
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelected}
              style={{ display: 'none' }}
            />
            <p className="text-xs text-gray-500 mt-3 text-center">
              Titignan ng AI ang items at presyo — pwede mo pa ring i-edit bago i-save
            </p>
          </div>
        )}

        {/* ── STEP: LOADING ── */}
        {step === STEPS.LOADING && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Receipt preview"
                style={{ maxHeight: 180, borderRadius: 10, margin: '0 auto 16px', display: 'block' }}
              />
            )}
            <div style={{
              width: 44, height: 44, background: '#ccfbf1', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
            }}>
              <i className="ti ti-loader-3" style={{ fontSize: 22, color: '#0d9488', animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ fontSize: 13, color: '#374151', fontWeight: 600, margin: 0 }}>
              Binabasa ang resibo...
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
              Sandali lang, kinukuha ang items at presyo
            </p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── STEP: REVIEW ── */}
        {step === STEPS.REVIEW && (
          <form onSubmit={handleSave} className="space-y-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Receipt preview"
                style={{ maxHeight: 140, borderRadius: 10, margin: '0 auto', display: 'block' }}
              />
            )}

            {isLowConfidence && (
              <div style={{
                padding: '10px 12px', background: '#fef9c3', borderRadius: 10,
                border: '1.5px solid #fde68a', display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 15, color: '#a16207', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11, color: '#854d0e', margin: 0, lineHeight: 1.4 }}>
                  Medyo malabo ang resibo — paki-check ulit ang items at presyo bago i-save.
                </p>
              </div>
            )}

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Mga Item {activeItemsCount > 0 && `(${activeItemsCount})`}
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                >
                  <i className="ti ti-plus" style={{ fontSize: 13 }} />
                  Magdagdag
                </button>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg py-4 text-center">
                  Walang na-detect na item. Pindutin ang "Magdagdag" para maglagay ng manual.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid #e5e7eb', borderRadius: 10, padding: 8,
                        opacity: item.included ? 1 : 0.45, transition: 'opacity 0.15s ease',
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={item.included}
                          onChange={(e) => handleItemField(item.id, 'included', e.target.checked)}
                          className="mt-2"
                          title={item.included ? 'Isama sa total' : 'Hindi isasama'}
                        />
                        <div className="flex-1 space-y-1 min-w-0">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemField(item.id, 'name', e.target.value)}
                            placeholder="Pangalan ng item"
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                          <div className="flex gap-1 items-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => handleItemField(item.id, 'quantity', e.target.value)}
                              className="w-14 px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                              title="Quantity"
                            />
                            <span className="text-xs text-gray-400">x ₱</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleItemField(item.id, 'unit_price', e.target.value)}
                              className="w-20 px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                              title="Presyo per unit"
                            />
                            <span className="text-xs text-gray-600 ml-auto font-semibold whitespace-nowrap">
                              = ₱{lineTotal(item).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-gray-300 hover:text-red-500 mt-1 flex-shrink-0"
                          title="Alisin sa listahan"
                        >
                          <i className="ti ti-trash" style={{ fontSize: 15 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-gray-500">Kabuuan ng mga item:</span>
                <button
                  type="button"
                  onClick={handleUseItemsTotal}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  ₱{itemsTotal.toFixed(2)} — gamitin bilang total
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="expense_date" className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                id="expense_date"
                name="expense_date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                max={todayStr()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
              >
                {FIXED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount (₱) *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
              {amountMismatch && (
                <p className="text-xs text-amber-600 mt-1">
                  Iba ang naka-lagay na total (₱{parseFloat(amount || 0).toFixed(2)}) kumpara sa kabuuan
                  ng mga item (₱{itemsTotal.toFixed(2)}). Pwede mong i-tap ang "gamitin bilang total" sa
                  itaas kung gusto mo itong i-sync.
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                <i className="ti ti-camera-retake" style={{ marginRight: 6 }} />
                Ulitin
              </button>
              <button
                type="submit"
                disabled={step === STEPS.SAVING}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                {step === STEPS.SAVING ? (
                  <>
                    <i className="ti ti-loader-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="ti ti-check" />
                    Save Expense
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}