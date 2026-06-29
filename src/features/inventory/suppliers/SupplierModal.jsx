import { useState } from 'react'
import { useSuppliersStore } from '../suppliers/store'
import Modal from '../components/Modal'

export default function SuppliersModal({ isOpen, onClose, storeId }) {
  const { suppliers, addSupplier, deleteSupplier, updateSupplier, isLoading, error: storeError } = useSuppliersStore()
  const [formData, setFormData] = useState({ name: '', contact: '', email: '' })
  const [error, setError] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Supplier name is required')
      return
    }

    if (!storeId) {
      setError('Store ID is missing')
      return
    }

    setIsAdding(true)

    try {
      if (editingId) {
        await updateSupplier(editingId, {
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          email: formData.email.trim(),
        })
        setEditingId(null)
      } else {
        await addSupplier(storeId, {
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          email: formData.email.trim(),
        })
      }
      setFormData({ name: '', contact: '', email: '' })
    } catch (err) {
      setError(err.message || 'Failed to save supplier')
    } finally {
      setIsAdding(false)
    }
  }

  const handleEdit = (supplier) => {
    setEditingId(supplier.id)
    setFormData({
      name: supplier.name,
      contact: supplier.contact || '',
      email: supplier.email || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', contact: '', email: '' })
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this supplier?')) {
      try {
        await deleteSupplier(id)
        if (editingId === id) handleCancelEdit()
      } catch (err) {
        setError(err.message || 'Failed to delete supplier')
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mga Suppliers" size="md">
      <style>{`
        .sup-input {
          width: 100%; padding: 10px 12px 10px 36px;
          border: 1.5px solid #e5e7eb; border-radius: 10px;
          font-size: 14px; font-family: Inter, sans-serif;
          background: #fff; transition: all 0.2s ease; box-sizing: border-box;
        }
        .sup-input:focus {
          outline: none; border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .sup-input:disabled { background: #f9fafb; color: #9ca3af; }
        .sup-input-wrap { position: relative; }
        .sup-input-icon {
          position: absolute; left: 11px; top: 50%;
          transform: translateY(-50%); color: #9ca3af; font-size: 15px;
          pointer-events: none;
        }
        .sup-label {
          display: block; font-size: 12px; font-weight: 600;
          color: #374151; margin-bottom: 6px; letter-spacing: 0.02em;
        }
        .sup-btn-primary {
          flex: 1; display: inline-flex; align-items: center; justify-content: center;
          gap: 7px; padding: 10px 16px; border-radius: 10px; font-size: 14px;
          font-weight: 600; cursor: pointer; border: none;
          background: #16a34a; color: #fff;
          box-shadow: 0 4px 12px rgba(22,163,74,0.25);
          transition: all 0.15s ease; font-family: Inter, sans-serif;
        }
        .sup-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(22,163,74,0.3);
        }
        .sup-btn-primary:disabled { background: #d1d5db; box-shadow: none; cursor: not-allowed; }
        .sup-btn-cancel {
          display: inline-flex; align-items: center; justify-content: center;
          gap: 7px; padding: 10px 16px; border-radius: 10px; font-size: 14px;
          font-weight: 600; cursor: pointer; border: 1.5px solid #e5e7eb;
          background: #fff; color: #374151; transition: all 0.15s ease;
          font-family: Inter, sans-serif;
        }
        .sup-btn-cancel:hover { background: #f9fafb; border-color: #d1d5db; }
        .sup-card {
          padding: 14px 16px; border: 1.5px solid #e5e7eb; border-radius: 12px;
          display: flex; align-items: flex-start; justify-content: space-between;
          transition: all 0.15s ease; background: #fff;
        }
        .sup-card:hover { border-color: #d1fae5; background: #f0fdf4; }
        .sup-card.editing { border-color: #86efac; background: #f0fdf4; }
        .sup-icon-btn {
          width: 30px; height: 30px; display: inline-flex; align-items: center;
          justify-content: center; border-radius: 8px; border: none;
          cursor: pointer; transition: all 0.15s ease; font-size: 15px;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── FORM ── */}
        <div style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: editingId ? '#dbeafe' : '#d1fae5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`ti ${editingId ? 'ti-edit' : 'ti-plus'}`} style={{ fontSize: 16, color: editingId ? '#2563eb' : '#16a34a' }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {editingId ? 'I-edit ang Supplier' : 'Magdagdag ng Supplier'}
            </span>
          </div>

          {(error || storeError) && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: '#991b1b', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-alert-circle" /> {error || storeError}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="sup-label">Pangalan ng Supplier *</label>
              <div className="sup-input-wrap">
                <i className="ti ti-building-store sup-input-icon" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Happy Foods Distributor"
                  className="sup-input"
                  disabled={isAdding}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="sup-label">Contact Number</label>
                <div className="sup-input-wrap">
                  <i className="ti ti-phone sup-input-icon" />
                  <input
                    type="tel"
                    value={formData.contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="09123456789"
                    className="sup-input"
                    disabled={isAdding}
                  />
                </div>
              </div>
              <div>
                <label className="sup-label">Email</label>
                <div className="sup-input-wrap">
                  <i className="ti ti-mail sup-input-icon" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="sales@supplier.com"
                    className="sup-input"
                    disabled={isAdding}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isAdding}
                className="sup-btn-primary"
              >
                {isAdding ? (
                  <>
                    <i className="ti ti-loader-3" style={{ animation: 'spin 1s linear infinite' }} />
                    {editingId ? 'Ina-update...' : 'Idinaragdag...'}
                  </>
                ) : (
                  <>
                    <i className={`ti ${editingId ? 'ti-check' : 'ti-plus'}`} />
                    {editingId ? 'I-update' : 'Idagdag'}
                  </>
                )}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancelEdit} className="sup-btn-cancel">
                  <i className="ti ti-x" /> Kanselahin
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── LIST ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Listahan ng Suppliers
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#d1fae5', padding: '2px 10px', borderRadius: 999 }}>
              {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {suppliers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', background: '#f9fafb', borderRadius: 12, border: '1.5px dashed #e5e7eb' }}>
              <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <i className="ti ti-building-store" style={{ fontSize: 24, color: '#d1d5db' }} />
              </div>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Wala pang suppliers. Magdagdag na!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', paddingRight: 2 }}>
              {suppliers.map((supplier) => (
                <div key={supplier.id} className={`sup-card ${editingId === supplier.id ? 'editing' : ''}`}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                    <div style={{ width: 36, height: 36, background: editingId === supplier.id ? '#dbeafe' : '#d1fae5', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-building-store" style={{ fontSize: 16, color: editingId === supplier.id ? '#2563eb' : '#16a34a' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{supplier.name}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
                        {supplier.contact && (
                          <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-phone" style={{ fontSize: 11 }} /> {supplier.contact}
                          </span>
                        )}
                        {supplier.email && (
                          <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-mail" style={{ fontSize: 11 }} /> {supplier.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="sup-icon-btn"
                      style={{ background: '#eff6ff', color: '#2563eb' }}
                      title="I-edit"
                    >
                      <i className="ti ti-edit" />
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      className="sup-icon-btn"
                      style={{ background: '#fee2e2', color: '#dc2626' }}
                      title="Burahin"
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}