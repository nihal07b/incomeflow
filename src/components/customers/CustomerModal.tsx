import { useState } from 'react'
import type { Customer } from '../../types'

interface CustomerModalProps {
  isOpen: boolean
  customerToEdit?: Customer | null
  onClose: () => void
  onSave: (data: { id?: string; name: string; contact: string; note?: string }) => Promise<void>
}

export function CustomerModal({
  isOpen,
  customerToEdit,
  onClose,
  onSave,
}: CustomerModalProps) {
  const isEditing = Boolean(customerToEdit)
  const [name, setName] = useState(customerToEdit?.name ?? '')
  const [contact, setContact] = useState(customerToEdit?.contact ?? '')
  const [note, setNote] = useState(customerToEdit?.note ?? '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const trimmedName = name.trim()
    const trimmedContact = contact.trim()

    if (!trimmedName) {
      setValidationError('Customer name is required.')
      return
    }

    if (!trimmedContact) {
      setValidationError('Contact number or detail is required.')
      return
    }

    try {
      setIsSubmitting(true)
      await onSave({
        id: customerToEdit?.id,
        name: trimmedName,
        contact: trimmedContact,
        note: note.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setValidationError((err as Error).message || 'Failed to save customer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="customer-modal-title" className="text-xl font-bold text-slate-900">
              {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isEditing
                ? 'Update customer details. ID remains unchanged.'
                : 'Register a friend, shopkeeper, or mechanic for informal credit tracking.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Display ID when editing */}
          {isEditing && customerToEdit && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Customer Unique ID (Permanent)
              </span>
              <p className="font-mono text-xs font-bold text-slate-700">
                #{customerToEdit.id}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Distinguishes this customer even if other contacts share the same name.
              </p>
            </div>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
              role="alert"
            >
              <strong>Error:</strong> {validationError}
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label htmlFor="customer-name" className="block text-xs font-semibold text-slate-700">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="customer-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Sharma"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
          </div>

          {/* Contact Details */}
          <div>
            <label htmlFor="customer-contact" className="block text-xs font-semibold text-slate-700">
              Contact / Phone / Location <span className="text-rose-500">*</span>
            </label>
            <input
              id="customer-contact"
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. +91 98765 43210 or Sector 18 Tea Stall"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Note */}
          <div>
            <label htmlFor="customer-note" className="block text-xs font-semibold text-slate-700">
              Notes (Optional)
            </label>
            <textarea
              id="customer-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Chai stall next to hub, settles accounts every Saturday..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-hidden"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : isEditing ? (
                <span>Update Customer</span>
              ) : (
                <span>Add Customer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
