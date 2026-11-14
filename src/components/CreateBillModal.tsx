import { useState, type FormEvent } from 'react'
import { validateBillGoalInput, type CreateBillGoalInput } from '../engine/goals'

interface CreateBillModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateBillGoalInput) => Promise<void>
}

export default function CreateBillModal({ isOpen, onClose, onSubmit }: CreateBillModalProps) {
  const [name, setName] = useState('')
  const [targetRupees, setTargetRupees] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [openingRupees, setOpeningRupees] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})

    const parsedTargetPaise = Math.round(parseFloat(targetRupees || '0') * 100)
    const parsedOpeningPaise = openingRupees.trim() !== ''
      ? Math.round(parseFloat(openingRupees) * 100)
      : undefined

    const inputPayload: CreateBillGoalInput = {
      name: name.trim(),
      targetPaise: parsedTargetPaise,
      dueDate: dueDate.trim(),
      openingContributionPaise: parsedOpeningPaise,
    }

    const validation = validateBillGoalInput(inputPayload)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(inputPayload)
      // Reset form on success
      setName('')
      setTargetRupees('')
      setDueDate('')
      setOpeningRupees('')
      onClose()
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to create bill' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 id="modal-title" className="text-xl font-bold text-slate-800">
            Create Bill / EMI Goal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {errors.form && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="bill-name" className="block text-sm font-medium text-slate-700">
              Bill / EMI Name *
            </label>
            <input
              id="bill-name"
              type="text"
              placeholder="e.g. Bike EMI, Room Rent, Electricity"
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden"
              required
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bill-target" className="block text-sm font-medium text-slate-700">
                Target Amount (₹) *
              </label>
              <input
                id="bill-target"
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 5000"
                value={targetRupees}
                onChange={e => setTargetRupees(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden"
                required
              />
              {errors.targetPaise && (
                <p className="mt-1 text-xs text-rose-600">{errors.targetPaise}</p>
              )}
            </div>

            <div>
              <label htmlFor="bill-due-date" className="block text-sm font-medium text-slate-700">
                Due Date *
              </label>
              <input
                id="bill-due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden"
                required
              />
              {errors.dueDate && <p className="mt-1 text-xs text-rose-600">{errors.dueDate}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="bill-opening" className="block text-sm font-medium text-slate-700">
              Optional Opening Contribution (₹)
            </label>
            <input
              id="bill-opening"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 1000 (already saved money)"
              value={openingRupees}
              onChange={e => setOpeningRupees(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden"
            />
            <p className="mt-1 text-xs text-slate-500">
              Recorded as a single opening allocation; not counted twice.
            </p>
            {errors.openingContributionPaise && (
              <p className="mt-1 text-xs text-rose-600">{errors.openingContributionPaise}</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Bill Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
