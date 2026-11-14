import { useState, type FormEvent } from 'react'
import type { AddContributionInput } from '../types'
import { validateContributionInput, formatRupees } from '../engine/goals'

interface AddContributionTarget {
  id: string
  name: string
  type: 'bill' | 'vault'
  remainingPaise?: number
}

interface AddContributionModalProps {
  isOpen: boolean
  target: AddContributionTarget | null
  onClose: () => void
  onSubmit: (input: AddContributionInput) => Promise<void>
}

export default function AddContributionModal({
  isOpen,
  target,
  onClose,
  onSubmit,
}: AddContributionModalProps) {
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

    const validation = validateContributionInput(parsedAmountPaise, note)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    // Generate client-side idempotency key for backend deduplication coordination
    const idempotencyKey = `idem-${target.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    const payload: AddContributionInput = {
      targetId: target.id,
      targetType: target.type,
      amountPaise: parsedAmountPaise,
      note: note.trim() || undefined,
      idempotencyKey,
    }

    try {
      setIsSubmitting(true)
      await onSubmit(payload)
      // Only reset and close on genuine success
      setAmountRupees('')
      setNote('')
      onClose()
    } catch (err) {
      // Retain form inputs and show clear failure state; never leave a false success
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to save contribution. Please try again.',
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
      aria-labelledby="contribution-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="contribution-modal-title" className="text-xl font-bold text-slate-800">
              Add Contribution
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Allocating savings to <strong className="text-slate-700">{target.name}</strong>
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

        {target.remainingPaise !== undefined && target.remainingPaise > 0 && (
          <div className="mt-3 rounded-xl bg-teal-50 px-3 py-2 text-xs text-teal-800">
            Remaining gap: <strong>{formatRupees(target.remainingPaise)}</strong>
          </div>
        )}

        {errors.form && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            <p className="font-semibold">Contribution failed</p>
            <p className="mt-0.5 text-xs">{errors.form}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="contrib-amount" className="block text-sm font-medium text-slate-700">
              Contribution Amount (₹) *
            </label>
            <input
              id="contrib-amount"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 500"
              value={amountRupees}
              onChange={e => setAmountRupees(e.target.value)}
              disabled={isSubmitting}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Allocates cash into this goal. Does not trigger any bank transfer.
            </p>
            {errors.amountPaise && (
              <p className="mt-1 text-xs text-rose-600">{errors.amountPaise}</p>
            )}
          </div>

          <div>
            <label htmlFor="contrib-note" className="block text-sm font-medium text-slate-700">
              Optional Note
            </label>
            <input
              id="contrib-note"
              type="text"
              placeholder="e.g. Friday peak shift earnings, festival bonus"
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={isSubmitting}
              maxLength={200}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
            />
            {errors.note && <p className="mt-1 text-xs text-rose-600">{errors.note}</p>}
          </div>

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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                'Save Contribution'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
