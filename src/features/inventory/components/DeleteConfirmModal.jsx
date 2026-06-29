import { useState } from 'react'
import Modal from './Modal'

export default function DeleteConfirmModal({ isOpen, productName, onConfirm, onCancel }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Delete Product" size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto">
          <i className="ti ti-alert-triangle text-red-600 text-xl" />
        </div>

        <div className="text-center">
          <p className="text-gray-900 font-medium mb-1">
            Delete "{productName}"?
          </p>
          <p className="text-sm text-gray-600">
            This action cannot be undone. The product will be permanently removed from your inventory.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors font-medium text-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <i className="ti ti-loader-3 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <i className="ti ti-trash" />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}