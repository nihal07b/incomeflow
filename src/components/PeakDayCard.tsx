import { useState, type FormEvent } from 'react'
import type { PeakDaySuggestion, BillGoal, SavingsVault } from '../types'
import { formatRupees, validateContributionInput } from '../engine/goals'

interface PeakDayCardProps {
  suggestion: PeakDaySuggestion
  bills: BillGoal[]
  vaults: SavingsVault[]
  onAccept: (
    targetId: string,
    targetType: 'bill' | 'vault',
    amountPaise: number,
    note: string,
    suggestionRef: string
  ) => Promise<void>
  onDismiss: () => void
}

export default function PeakDayCard({
  suggestion,
  bills,
  vaults,
  onAccept,
  onDismiss,
}: PeakDayCardProps) {
  const [selectedPercentage, setSelectedPercentage] = useState(suggestion.percentage)
  const [customRupees, setCustomRupees] = useState(
    (suggestion.suggestedPaise / 100).toString()
  )
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; type: 'bill' | 'vault' }>(() => {
    if (bills.length > 0) return { id: bills[0].id, type: 'bill' }
    if (vaults.length > 0) return { id: vaults[0].id, type: 'vault' }
    return { id: '', type: 'bill' }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 1. If baseline is unavailable, explain that without inventing history
  if (!suggestion.hasBaseline) {
    return (
      <aside
        className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-xs"
        aria-label="Peak-day savings baseline status"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl">ℹ️</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Peak-Day Savings Baseline Unavailable
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              {suggestion.explanation}
            </p>
          </div>
        </div>
      </aside>
    )
  }

  // If not eligible (income didn't exceed baseline)
  if (!suggestion.isEligible) {
    return null
  }

  const handlePercentageChange = (pct: number) => {
    setSelectedPercentage(pct)
    const newPaise = Math.round(suggestion.extraIncomePaise * (pct / 100))
    setCustomRupees((newPaise / 100).toString())
  }

  const handleCustomRupeesChange = (val: string) => {
    setCustomRupees(val)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setError(null)
    const parsedPaise = Math.round(parseFloat(customRupees || '0') * 100)

    const validation = validateContributionInput(parsedPaise)
    if (!validation.isValid) {
      setError(validation.errors.amountPaise || 'Invalid contribution amount.')
      return
    }

    if (!selectedTarget.id) {
      setError('Please select an existing bill or savings vault to receive this surplus.')
      return
    }

    const note = `Peak-day surplus savings (${selectedPercentage}% of ${formatRupees(
      suggestion.extraIncomePaise
    )} extra)`

    try {
      setIsSubmitting(true)
      await onAccept(
        selectedTarget.id,
        selectedTarget.type,
        parsedPaise,
        note,
        suggestion.suggestionRef
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to allocate peak savings.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <aside
      className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/60 to-white p-5 shadow-xs sm:p-6"
      aria-label="Peak-day savings suggestion"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl" role="img" aria-label="sparkles">
            🌟
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-teal-950">Peak-Day Surplus Detected</h3>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-900">
                +{formatRupees(suggestion.extraIncomePaise)} above baseline
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Today: <strong>{formatRupees(suggestion.todayIncomePaise)}</strong> · Typical baseline:{' '}
              <strong>{formatRupees(suggestion.baselineDailyIncomePaise || 0)}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          disabled={isSubmitting}
        >
          Dismiss
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Percentage quick options */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-slate-700">Save percentage:</span>
          {[20, 30, 50].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentageChange(pct)}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                selectedPercentage === pct
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {pct}% ({formatRupees(Math.round(suggestion.extraIncomePaise * (pct / 100)))})
            </button>
          ))}
        </div>

        {/* Inputs row: editable amount & destination selection */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="peak-amount" className="block text-xs font-medium text-slate-700">
              Surplus to Allocate (₹)
            </label>
            <input
              id="peak-amount"
              type="number"
              min="1"
              step="any"
              value={customRupees}
              onChange={e => handleCustomRupeesChange(e.target.value)}
              disabled={isSubmitting}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
              required
            />
          </div>

          <div>
            <label htmlFor="peak-target" className="block text-xs font-medium text-slate-700">
              Allocate to Goal / Vault
            </label>
            <select
              id="peak-target"
              value={`${selectedTarget.type}:${selectedTarget.id}`}
              onChange={e => {
                const [type, id] = e.target.value.split(':')
                setSelectedTarget({ id, type: type as 'bill' | 'vault' })
              }}
              disabled={isSubmitting}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-hidden disabled:bg-slate-100"
              required
            >
              {bills.length > 0 && (
                <optgroup label="Bills & EMI Goals">
                  {bills.map(b => (
                    <option key={b.id} value={`bill:${b.id}`}>
                      {b.name} (Target: {formatRupees(b.targetPaise)})
                    </option>
                  ))}
                </optgroup>
              )}
              {vaults.length > 0 && (
                <optgroup label="Savings Vaults">
                  {vaults.map(v => (
                    <option key={v.id} value={`vault:${v.id}`}>
                      {v.label} (Current: {formatRupees(v.currentPaise)})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Action bar and disclaimers */}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-slate-500 leading-tight">
            Planning suggestion only · Not money already saved · No bank transfer is performed
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Dismiss
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Allocating...</span>
                </>
              ) : (
                `Accept & Save ₹${customRupees || '0'}`
              )}
            </button>
          </div>
        </div>
      </form>
    </aside>
  )
}
