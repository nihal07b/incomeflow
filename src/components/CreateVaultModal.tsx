import { useState, type FormEvent } from 'react'
import type { CreateVaultInput, VaultCategory } from '../types'
import { validateCreateVaultInput } from '../engine/goals'

interface CreateVaultModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateVaultInput) => Promise<void>
}

const CATEGORY_DEFAULTS: Record<VaultCategory, { label: string; desc: string }> = {
  emergency: {
    label: 'Emergency Fund',
    desc: 'Buffer for unexpected medical, family or unplanned costs.',
  },
  festival: {
    label: 'Festival Fund',
    desc: 'Preparation for Diwali, Eid, weddings and seasonal family celebrations.',
  },
  vehicle_maintenance: {
    label: 'Vehicle Maintenance',
    desc: 'Periodic oil change, tyre replacements and emergency scooter repairs.',
  },
  future_investment: {
    label: 'Future Investment Fund',
    desc: 'Named savings goal for your long-term wealth building aspirations.',
  },
  custom: {
    label: 'Custom Savings Goal',
    desc: 'Personalized savings target for your own specific milestones.',
  },
}

export default function CreateVaultModal({ isOpen, onClose, onSubmit }: CreateVaultModalProps) {
  const [category, setCategory] = useState<VaultCategory>('emergency')
  const [label, setLabel] = useState(CATEGORY_DEFAULTS.emergency.label)
  const [targetRupees, setTargetRupees] = useState('')
  const [openingRupees, setOpeningRupees] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleCategoryChange = (newCat: VaultCategory) => {
    setCategory(newCat)
    setLabel(CATEGORY_DEFAULTS[newCat].label)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setErrors({})
    const parsedTargetPaise = Math.round(parseFloat(targetRupees || '0') * 100)
    const parsedOpeningPaise = openingRupees.trim() !== ''
      ? Math.round(parseFloat(openingRupees) * 100)
      : undefined

    const inputPayload: CreateVaultInput = {
      label: label.trim(),
      category,
      targetPaise: parsedTargetPaise,
      openingContributionPaise: parsedOpeningPaise,
    }

    const validation = validateCreateVaultInput(inputPayload)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(inputPayload)
      setTargetRupees('')
      setOpeningRupees('')
      onClose()
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to create savings vault' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 id="vault-modal-title" className="text-xl font-bold text-slate-800">
            Create Savings Vault
          </h2>
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

        {errors.form && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Vault Type *
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {(Object.keys(CATEGORY_DEFAULTS) as VaultCategory[]).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    category === cat
                      ? 'border-teal-700 bg-teal-50 font-semibold text-teal-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {CATEGORY_DEFAULTS[cat].label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{CATEGORY_DEFAULTS[category].desc}</p>
          </div>

          <div>
            <label htmlFor="vault-label" className="block text-sm font-medium text-slate-700">
              Vault Name *
            </label>
            <input
              id="vault-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden"
              required
            />
            {errors.label && <p className="mt-1 text-xs text-rose-600">{errors.label}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vault-target" className="block text-sm font-medium text-slate-700">
                Target Amount (₹) *
              </label>
              <input
                id="vault-target"
                type="number"
                min="1"
                step="any"
                placeholder="e.g. 10000"
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
              <label htmlFor="vault-opening" className="block text-sm font-medium text-slate-700">
                Opening Deposit (₹)
              </label>
              <input
                id="vault-opening"
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 1000"
                value={openingRupees}
                onChange={e => setOpeningRupees(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-hidden"
              />
              {errors.openingContributionPaise && (
                <p className="mt-1 text-xs text-rose-600">{errors.openingContributionPaise}</p>
              )}
            </div>
          </div>

          {category === 'future_investment' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Notice:</strong> Future Investment Fund is a named savings goal for your long-term plans. IncomeFlow does not provide investment recommendations or financial transfers.
            </div>
          )}

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
              className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
