import { useState, useEffect } from 'react'
import { useUtangStore } from '../../../stores/utangStore'

const INITIAL_FORM = { name: '', contact_number: '', notes: '' }

export default function AddDebtorModal({ isOpen, onClose, storeId, editingDebtor }) {
  const { addDebtor, updateDebtor } = useUtangStore()
  const [form, setForm] = useState(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isEditing = !!editingDebtor

  useEffect(() => {
    if (!isOpen) return
    if (editingDebtor) {
      setForm({
        name: editingDebtor.name || '',
        contact_number: editingDebtor.contact_number || '',
        notes: editingDebtor.notes || '',
      })
    } else {
      setForm(INITIAL_FORM)
    }
    setError(null)
  }, [isOpen, editingDebtor])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    setError(null)
    if (!form.name.trim()) {
      setError('Pangalan ay required.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      name: form.name.trim(),
      contact_number: form.contact_number.trim() || null,
      notes: form.notes.trim() || null,
    }

    const result = isEditing
      ? await updateDebtor(editingDebtor.id, payload)
      : await addDebtor(storeId, payload)

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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'I-edit ang Debtor' : 'Bagong Debtor'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ti ti-x text-xl" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pangalan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="hal. Juan dela Cruz"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number
            </label>
            <input
              type="tel"
              name="contact_number"
              value={form.contact_number}
              onChange={handleChange}
              placeholder="hal. 09171234567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Para sa SMS reminders (Advanced plan)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="hal. Kapitbahay, suki..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Kanselahin
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting
              ? isEditing ? 'Sine-save...' : 'Idinaragdag...'
              : isEditing ? 'I-save' : 'Idagdag'}
          </button>
        </div>
      </div>
    </div>
  )
}