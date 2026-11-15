import { useState } from 'react'
import type { UdhaarEntry, MoneyPaise, LocalDate, PaymentMode } from '../../types'
import { getTodayLocalDate, getUdhaarRemainingPaise } from '../../services/storage'

interface RepaymentModalProps {
  isOpen: boolean
  entry: UdhaarEntry
  customerName: string
  onClose: () => void
  onSave: (data: {
    requestId: string
    udhaarId: string
    amountPaise: MoneyPaise
    date: LocalDate
    paymentMode: PaymentMode
    note?: string
  }) => Promise<void>
}

const formatRupees = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)

export function RepaymentModal({
  isOpen,
  entry,
  customerName,
  onClose,
  onSave,
}: RepaymentModalProps) {
  const today = getTodayLocalDate()
  const remainingPaise = getUdhaarRemainingPaise(entry)
  const remainingRupees = (remainingPaise / 100).toString()

  const [rupeesInput, setRupeesInput] = useState(remainingRupees)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requestId] = useState(() => `req-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`)

  if (!isOpen) return null

  const numRupees = Number.parseFloat(rupeesInput)
  const computedPaise = Number.isFinite(numRupees) && numRupees > 0
    ? Math.round(numRupees * 100)
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!Number.isFinite(numRupees) || numRupees <= 0) {
      setValidationError('Please enter a valid positive repayment amount in Rupees.')
      return
    }

    if (computedPaise <= 0 || !Number.isSafeInteger(computedPaise)) {
      setValidationError('Repayment must be a valid safe integer in paise.')
      return
    }

    if (computedPaise > remainingPaise) {
      setValidationError(
        `Repayment amount (${formatRupees(computedPaise)}) cannot exceed the remaining balance of ${formatRupees(remainingPaise)}.`
      )
      return
    }

    if (!date) {
      setValidationError('Receipt date is required.')
      return
    }

    try {
      setIsSubmitting(true)
      await onSave({
        requestId,
        udhaarId: entry.id,
        amountPaise: computedPaise,
        date,
        paymentMode,
        note: note.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setValidationError((err as Error).message || 'Failed to record repayment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="repayment-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="repayment-modal-title" className="text-xl font-bold text-slate-900">
              Record Repayment
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Receiving cash from <strong className="text-slate-800">{customerName}</strong>
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

        {/* Entry Context Summary */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {entry.description}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              #{entry.id}
            </span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-2 text-center text-xs">
            <div>
              <p className="text-[10px] text-slate-500">Original Amount</p>
              <p className="font-semibold text-slate-800">{formatRupees(entry.originalAmountPaise)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Already Repaid</p>
              <p className="font-semibold text-emerald-700">{formatRupees(entry.repaidAmountPaise || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500">Remaining Balance</p>
              <p className="font-bold text-indigo-700">{formatRupees(remainingPaise)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Validation Error Banner */}
          {validationError && (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
              role="alert"
            >
              <strong>Error:</strong> {validationError}
            </div>
          )}

          {/* Repayment Amount */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="repayment-amount" className="block text-xs font-semibold text-slate-700">
                Repayment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setRupeesInput((remainingPaise / 100).toString())}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Set Full Remaining ({formatRupees(remainingPaise)})
              </button>
            </div>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-bold text-slate-500">
                ₹
              </span>
              <input
                id="repayment-amount"
                type="number"
                step="any"
                min="1"
                max={remainingPaise / 100}
                required
                value={rupeesInput}
                onChange={(e) => setRupeesInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-8 pr-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                autoFocus
              />
            </div>
            {computedPaise > 0 && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                {computedPaise === remainingPaise ? (
                  <span className="font-semibold text-emerald-700">✓ Full repayment will settle this entry</span>
                ) : (
                  <span>Partial repayment: leaves {formatRupees(remainingPaise - computedPaise)} remaining</span>
                )}
              </p>
            )}
          </div>

          {/* Payment Mode & Date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Payment Received As
              </label>
              <div className="mt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('cash')}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${paymentMode === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-2xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('digital')}
                  className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${paymentMode === 'digital' ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-2xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  📱 Digital / UPI
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="repayment-date" className="block text-xs font-semibold text-slate-700">
                Receipt Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="repayment-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="repayment-note" className="block text-xs font-semibold text-slate-700">
              Note (Optional)
            </label>
            <input
              id="repayment-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid in cash at evening meet"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Shared Accounting Disclaimer */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-950 flex items-start gap-2">
            <svg className="size-4 shrink-0 text-emerald-700 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <div>
              <strong>Atomic Accounting Link:</strong> This action records 1 repayment record, reduces this credit entry by {formatRupees(computedPaise)}, and creates 1 linked cash-received transaction in the shared transaction ledger.
            </div>
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || computedPaise <= 0 || computedPaise > remainingPaise}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Recording Repayment...' : 'Confirm Repayment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
