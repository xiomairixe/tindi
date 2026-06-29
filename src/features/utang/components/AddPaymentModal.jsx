import { useState, useEffect } from 'react'
import { useUtangStore } from '../../../stores/utangStore'

const todayStr = () => new Date().toISOString().split('T')[0]

export default function AddPaymentModal({ isOpen, onClose, storeId, utangRecord, debtorName }) {
  const { addPayment, getRecordBalance } = useUtangStore()
  const [form, setForm] = useState({ amount_paid: '', payment_date: todayStr(), notes: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const remainingBalance = utangRecord ? getRecordBalance(utangRecord) : 0

  useEffect(() => {
    if (!isOpen) return
    setForm({ amount_paid: '', payment_date: todayStr(), notes: '' })
    setError(null)
  }, [isOpen])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePayFull = () => {
    setForm((prev) => ({
      ...prev,
      amount_paid: remainingBalance.toFixed(2),
    }))
  }

  const handleSubmit = async () => {
    setError(null)

    const amount = parseFloat(form.amount_paid)
    if (!form.amount_paid || isNaN(amount) || amount <= 0) {
      setError('Ilagay ang tamang halaga ng bayad.')
      return
    }
    if (amount > remainingBalance + 0.001) {
      setError(`Ang bayad (₱${amount.toFixed(2)}) ay mas malaki sa natitirang balance (₱${remainingBalance.toFixed(2)}).`)
      return
    }
    if (!form.payment_date) {
      setError('Pumili ng petsa ng bayad.')
      return
    }

    setIsSubmitting(true)
    const result = await addPayment(storeId, {
      utang_record_id: utangRecord.id,
      debtor_id: utangRecord.debtor_id,
      amount_paid: amount,
      payment_date: form.payment_date,
      notes: form.notes.trim() || null,
    })

    setIsSubmitting(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onClose()
  }

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!isOpen || !utangRecord) return null

  const isFullyPaid = remainingBalance <= 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Magbayad ng Utang</h2>
            {debtorName && (
              <p className="text-sm text-teal-600 font-medium mt-0.5">Kay {debtorName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ti ti-x text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Utang record info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">{utangRecord.description}</p>
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-xs text-gray-500">Orihinal na halaga</p>
                <p className="text-sm font-semibold text-gray-700">
                  ₱{parseFloat(utangRecord.amount).toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Natitirang balance</p>
                <p
                  className={`text-sm font-bold ${
                    isFullyPaid ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  ₱{remainingBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {isFullyPaid ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
              <i className="ti ti-circle-check text-green-600 text-xl" />
              <p className="text-sm text-green-700 font-medium">Fully paid na ang utang na ito!</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    Halaga ng Bayad (₱) <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={handlePayFull}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Bayaran lahat (₱{remainingBalance.toFixed(2)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    ₱
                  </span>
                  <input
                    type="number"
                    name="amount_paid"
                    value={form.amount_paid}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0.01"
                    max={remainingBalance}
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Petsa ng Bayad <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="payment_date"
                  value={form.payment_date}
                  max={todayStr()}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="hal. Bayad sa cash, GCash..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isFullyPaid ? 'Isara' : 'Kanselahin'}
          </button>
          {!isFullyPaid && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Sine-save...' : 'I-record ang Bayad'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}