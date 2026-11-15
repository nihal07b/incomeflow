import { useState, type FormEvent } from 'react'
import type { WithdrawalInput } from '../types'
import { validateWithdrawalInput, formatRupees } from '../engine/goals'

interface WithdrawalTarget {
  id: string
  name: string
  type: 'bill' | 'vault'
  availablePaise: number
}

interface WithdrawalModalProps {
  isOpen: boolean
  target: WithdrawalTarget | null
  onClose: () => void
  onSubmit: (input: WithdrawalInput) => Promise<void>
}

export default function WithdrawalModal({
  isOpen,
  target,
  onClose,
  onSubmit,
}: WithdrawalModalProps) {
  const [amountRupees, setAmountRupees] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !target) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return // Prevent accidental double submissions

    setErrors({})
    const parsedAmountPaise = Math.round(parseFloat(amountRupees || '0') * 100)

    const validation = validateWithdrawalInput(parsedAmountPaise, target.availablePaise, note)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    const idempotencyKey = `idem-with-${target.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    const payload: WithdrawalInput = {
      targetId: target.id,
      targetType: target.type,
      amountPaise: parsedAmountPaise,
      note: note.trim() || undefined,
      idempotencyKey,
    }

    try {
      setIsSubmitting(true)
      await onSubmit(payload)
      setAmountRupees('')
      setNote('')
      onClose()
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to process withdrawal. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="withdrawal-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="withdrawal-modal-title" className="text-xl font-bold text-slate-800">
              Withdraw from Reserve
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Withdrawing from <strong className="text-slate-700">{target.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs">
          <span className="text-slate-500">Available allocated balance:</span>
          <p className="text-base font-bold text-teal-800">{formatRupees(target.availablePaise)}</p>
        </div>

        {errors.form && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            <p className="font-semibold">Withdrawal failed</p>
            <p className="mt-0.5 text-xs">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="with-amount" className="block text-sm font-medium text-slate-700">
              Withdrawal Amount (₹) *
            </label>
            <input
              id="with-amount"
              type="number"
              min="1"
              step="any"
              max={target.availablePaise / 100}
              placeholder="e.g. 500"
              value={amountRupees}
              onChange={e => setAmountRupees(e.target.value)}
              disabled={isSubmitting}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
              required
            />
            {errors.amountPaise && (
              <p className="mt-1 text-xs text-rose-600">{errors.amountPaise}</p>
            )}
          </div>

          <div>
            <label htmlFor="with-note" className="block text-sm font-medium text-slate-700">
              Reason / Note
            </label>
            <input
              id="with-note"
              type="text"
              placeholder="e.g. Bike tyre repair, emergency medicine"
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={isSubmitting}
              maxLength={200}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
            />
            {errors.note && <p className="mt-1 text-xs text-rose-600">{errors.note}</p>}
          </div>

          <p className="text-xs text-slate-500">
            Releases allocated money from this reserve. IncomeFlow does not perform any bank transfers.
          </p>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || target.availablePaise <= 0}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-rose-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Processing...</span>
                </>
              ) : (
                'Confirm Withdrawal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
