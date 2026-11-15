import { useState } from 'react'
import type { Customer, MoneyPaise, LocalDate } from '../../types'
import { getTodayLocalDate, addDaysToLocalDate } from '../../services/storage'

interface UdhaarModalProps {
  isOpen: boolean
  customer: Customer
  onClose: () => void
  onSave: (data: {
    originalAmountPaise: MoneyPaise
    description: string
    entryDate: LocalDate
    dueDate: LocalDate
  }) => Promise<void>
}

export function UdhaarModal({
  isOpen,
  customer,
  onClose,
  onSave,
}: UdhaarModalProps) {
  const today = getTodayLocalDate()
  const defaultDueDate = addDaysToLocalDate(today, 7)

  const [rupeesInput, setRupeesInput] = useState('')
  const [description, setDescription] = useState('')
  const [entryDate, setEntryDate] = useState(today)
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  // Calculate integer paise from input
  const numRupees = Number.parseFloat(rupeesInput)
  const computedPaise = Number.isFinite(numRupees) && numRupees > 0
    ? Math.round(numRupees * 100)
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!Number.isFinite(numRupees) || numRupees <= 0) {
      setValidationError('Please enter a valid positive credit amount in Rupees.')
      return
    }

    if (computedPaise <= 0 || !Number.isSafeInteger(computedPaise)) {
      setValidationError('Amount must be a valid safe integer in paise.')
      return
    }

    const trimmedDesc = description.trim()
    if (!trimmedDesc) {
      setValidationError('Product or service description is required.')
      return
    }

    if (!entryDate) {
      setValidationError('Entry date is required.')
      return
    }

    if (!dueDate) {
      setValidationError('Due date is required.')
      return
    }

    try {
      setIsSubmitting(true)
      await onSave({
        originalAmountPaise: computedPaise,
        description: trimmedDesc,
        entryDate,
        dueDate,
      })
      onClose()
    } catch (err) {
      setValidationError((err as Error).message || 'Failed to save Udhaar entry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="udhaar-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="udhaar-modal-title" className="text-xl font-bold text-slate-900">
              Record Udhaar Credit
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Log credit for <strong className="text-slate-800">{customer.name}</strong>{' '}
              <span className="font-mono text-[11px] text-indigo-600">
                (#{customer.id})
              </span>
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
          {/* Error Banner */}
          {validationError && (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
              role="alert"
            >
              <strong>Error:</strong> {validationError}
            </div>
          )}

          {/* Original Amount Input */}
          <div>
            <label htmlFor="udhaar-amount" className="block text-xs font-semibold text-slate-700">
              Original Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-bold text-slate-500">
                ₹
              </span>
              <input
                id="udhaar-amount"
                type="number"
                step="any"
                min="1"
                required
                value={rupeesInput}
                onChange={(e) => setRupeesInput(e.target.value)}
                placeholder="e.g. 350"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-8 pr-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />
            </div>
            {computedPaise > 0 && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                Stored as integer paise: <strong>{computedPaise.toLocaleString('en-IN')} paise</strong>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="udhaar-desc" className="block text-xs font-semibold text-slate-700">
              Product / Service Description <span className="text-rose-500">*</span>
            </label>
            <input
              id="udhaar-desc"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bike tyre tube & puncher repair credit, weekly chai tab"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Dates: Entry Date and Due Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="udhaar-entry-date" className="block text-xs font-semibold text-slate-700">
                Entry Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="udhaar-entry-date"
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label htmlFor="udhaar-due-date" className="block text-xs font-semibold text-slate-700">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="udhaar-due-date"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* No Cash Income Disclaimer */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 flex items-start gap-2">
            <svg className="size-4 shrink-0 text-amber-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <strong>Accounting Rule:</strong> Udhaar represents informal peer receivable credit. Recording credit here <em>does not</em> add cash income to your declared on-hand balance.
            </div>
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
              {isSubmitting ? 'Saving...' : 'Record Udhaar Credit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
