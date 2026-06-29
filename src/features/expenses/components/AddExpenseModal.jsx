import { useState, useEffect } from 'react'
import { useExpensesStore } from '../../../stores/expensesStore'
import Modal from '../../inventory/components/Modal'

const FIXED_CATEGORIES = [
  'Supplies',
  'Utilities',
  'Rent',
  'Salaries',
  'Maintenance',
  'Transport',
  'Other',
]

const todayStr = () => new Date().toISOString().split('T')[0]

export default function AddExpenseModal({ isOpen, onClose, storeId, editingExpense }) {
  const { addExpense, updateExpense, addCustomCategory, customCategories } = useExpensesStore()
  const isEditMode = !!editingExpense

  const [formData, setFormData] = useState({
    expense_date: todayStr(),
    amount: '',
    category: 'Supplies',
    notes: '',
  })
  const [customCategoryInput, setCustomCategoryInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const allCategories = [
    ...FIXED_CATEGORIES,
    ...customCategories.map((c) => c.name).filter((n) => !FIXED_CATEGORIES.includes(n)),
  ]

  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setFormData({
          expense_date: editingExpense.expense_date || todayStr(),
          amount: editingExpense.amount ?? '',
          category: editingExpense.category || 'Supplies',
          notes: editingExpense.notes || '',
        })
      } else {
        setFormData({
          expense_date: todayStr(),
          amount: '',
          category: 'Supplies',
          notes: '',
        })
      }
      setCustomCategoryInput('')
      setShowCustomInput(false)
      setError(null)
    }
  }, [isOpen, editingExpense])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = (e) => {
    const val = e.target.value
    if (val === '__custom__') {
      setShowCustomInput(true)
      setFormData((prev) => ({ ...prev, category: '' }))
    } else {
      setShowCustomInput(false)
      setFormData((prev) => ({ ...prev, category: val }))
    }
  }

  const handleSaveCustomCategory = async () => {
    const trimmed = customCategoryInput.trim()
    if (!trimmed) return
    try {
      await addCustomCategory(storeId, trimmed)
      setFormData((prev) => ({ ...prev, category: trimmed }))
      setShowCustomInput(false)
      setCustomCategoryInput('')
    } catch (err) {
      setError('Failed to save custom category: ' + err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (!formData.expense_date) throw new Error('Date is required')
      if (!formData.amount || parseFloat(formData.amount) <= 0)
        throw new Error('Enter a valid expense amount')
      if (!formData.category) throw new Error('Category is required')
      if (!storeId) throw new Error('Store ID is missing')

      const expenseData = {
        expense_date: formData.expense_date,
        amount: parseFloat(formData.amount),
        category: formData.category,
        notes: formData.notes.trim() || null,
      }

      if (isEditMode) {
        await updateExpense(editingExpense.id, expenseData)
      } else {
        await addExpense(storeId, expenseData)
      }

      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Expense' : 'Add Expense'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Date */}
        <div>
          <label htmlFor="expense_date" className="block text-sm font-medium text-gray-700 mb-1">
            Date *
          </label>
          <input
            type="date"
            id="expense_date"
            name="expense_date"
            value={formData.expense_date}
            onChange={handleInputChange}
            max={todayStr()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={showCustomInput ? '__custom__' : formData.category}
            onChange={handleCategoryChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
          >
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="__custom__">+ Add custom category...</option>
          </select>

          {/* Custom category input */}
          {showCustomInput && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customCategoryInput}
                onChange={(e) => setCustomCategoryInput(e.target.value)}
                placeholder="e.g., Packaging, Ice, Plastic bags"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveCustomCategory()
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSaveCustomCategory}
                className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomCategoryInput('')
                  setFormData((prev) => ({ ...prev, category: 'Supplies' }))
                }}
                className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (₱) *
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Halaga ng gastos</p>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="e.g., Binayaran si Meralco ngayong buwan"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <i className="ti ti-loader-3 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <i className={isEditMode ? 'ti ti-check' : 'ti ti-plus'} />
                {isEditMode ? 'Save Changes' : 'Add Expense'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}