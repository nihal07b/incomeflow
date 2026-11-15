import { useState } from 'react'
import type { VaultProgress, GoalAllocation, VaultCategory } from '../types'
import { formatRupees, getGoalAllocationsSorted } from '../engine/goals'

interface VaultCardProps {
  progress: VaultProgress
  allocations?: GoalAllocation[]
  onAddContribution: () => void
  onWithdraw: () => void
}

const CATEGORY_TAGS: Record<VaultCategory, { label: string; badgeClass: string }> = {
  emergency: {
    label: 'Emergency',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  festival: {
    label: 'Festival',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  vehicle_maintenance: {
    label: 'Vehicle',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  future_investment: {
    label: 'Future Fund',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  custom: {
    label: 'Custom Goal',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
  },
}

export default function VaultCard({
  progress,
  allocations = [],
  onAddContribution,
  onWithdraw,
}: VaultCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const { vault, allocatedPaise, remainingPaise, progressPercent, isFullyFunded } = progress

  const categoryInfo = CATEGORY_TAGS[vault.category] || CATEGORY_TAGS.custom
  const vaultHistory = getGoalAllocationsSorted(allocations, vault.id)

  return (
    <article
      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 sm:p-6"
      aria-label={`Savings vault: ${vault.label}`}
    >
      <div>
        {/* Header: Label and Category badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{vault.label}</h3>
            <span
              className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${categoryInfo.badgeClass}`}
            >
              {categoryInfo.label}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-teal-800">{progressPercent}%</span>
            {isFullyFunded && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                Funded
              </span>
            )}
          </div>
        </div>

        {/* Balance metrics */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <span className="text-xs text-slate-500">Allocated Balance</span>
            <p className="font-bold text-teal-700">{formatRupees(allocatedPaise)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <span className="text-xs text-slate-500">Target</span>
            <p className="font-semibold text-slate-900">{formatRupees(vault.targetPaise)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Remaining gap</span>
            <span className="font-medium text-slate-800">{formatRupees(remainingPaise)}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-300 ${
                isFullyFunded ? 'bg-emerald-500' : 'bg-teal-600'
              }`}
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Action buttons: Add Contribution, Withdraw, and History */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddContribution}
              className="inline-flex items-center justify-center rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-teal-700"
            >
              + Contribute
            </button>
            <button
              type="button"
              onClick={onWithdraw}
              disabled={allocatedPaise <= 0}
              className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-40"
            >
              Withdraw
            </button>
          </div>

          {vaultHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              {showHistory ? 'Hide history' : `History (${vaultHistory.length})`}
            </button>
          )}
        </div>

        {/* Expandable History */}
        {showHistory && vaultHistory.length > 0 && (
          <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
            <p className="font-semibold text-slate-700">Allocation &amp; Withdrawal History</p>
            <ul className="divide-y divide-slate-200">
              {vaultHistory.map(alloc => {
                const isWithdrawal = alloc.type === 'withdrawal'
                return (
                  <li key={alloc.id} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold ${
                          isWithdrawal ? 'text-rose-700' : 'text-teal-800'
                        }`}
                      >
                        {isWithdrawal ? '-' : '+'}
                        {formatRupees(alloc.amountPaise)}
                      </span>
                      <span className="text-slate-400">{alloc.date}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-slate-600">
                      <span className="capitalize text-slate-500">
                        {isWithdrawal ? 'Withdrawal' : alloc.type}
                      </span>
                      {alloc.note && <span className="italic">“{alloc.note}”</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        Reserves cash for {categoryInfo.label.toLowerCase()} purposes. No banking transfers.
      </div>
    </article>
  )
}
