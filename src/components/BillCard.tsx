import { useState } from 'react'
import type { BillGoalProgress, GoalAllocation } from '../types'
import { formatRupees, getGoalAllocationsSorted } from '../engine/goals'

interface BillCardProps {
  progress: BillGoalProgress
  allocations?: GoalAllocation[]
  onAddContribution: () => void
}

export default function BillCard({
  progress,
  allocations = [],
  onAddContribution,
}: BillCardProps) {
  const [showHistory, setShowHistory] = useState(false)

  const {
    goal,
    allocatedPaise,
    remainingPaise,
    contributionDays,
    requiredDailyPaise,
    progressPercent,
    isFullyFunded,
    isOverdue,
    isDueToday,
  } = progress

  const goalHistory = getGoalAllocationsSorted(allocations, goal.id)

  return (
    <article
      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 sm:p-6"
      aria-label={`Bill goal: ${goal.name}`}
    >
      <div>
        {/* Header: Name and status badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{goal.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">Due {goal.dueDate}</p>
          </div>

          <div>
            {isFullyFunded && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                Fully funded
              </span>
            )}
            {isDueToday && !isFullyFunded && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                Due today
              </span>
            )}
            {isOverdue && !isFullyFunded && (
              <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                Overdue
              </span>
            )}
            {!isFullyFunded && !isDueToday && !isOverdue && (
              <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                {contributionDays} days left
              </span>
            )}
          </div>
        </div>

        {/* Financial metrics grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-slate-50 p-2.5">
            <span className="text-xs text-slate-500">Target</span>
            <p className="font-semibold text-slate-900">{formatRupees(goal.targetPaise)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <span className="text-xs text-slate-500">Allocated</span>
            <p className="font-semibold text-teal-700">{formatRupees(allocatedPaise)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <span className="text-xs text-slate-500">Remaining</span>
            <p className="font-semibold text-slate-900">{formatRupees(remainingPaise)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5">
            <span className="text-xs text-slate-500">Daily Needed</span>
            <p className="font-semibold text-teal-900">{formatRupees(requiredDailyPaise)} / day</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Progress</span>
            <span className="font-medium text-slate-900">{progressPercent}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-300 ${
                isFullyFunded ? 'bg-emerald-500' : isOverdue ? 'bg-rose-500' : 'bg-teal-600'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Actions bar: Add contribution & View History */}
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onAddContribution}
            className="inline-flex items-center justify-center rounded-xl bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            + Add Contribution
          </button>

          {goalHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              {showHistory ? 'Hide history' : `History (${goalHistory.length})`}
            </button>
          )}
        </div>

        {/* Expandable History List */}
        {showHistory && goalHistory.length > 0 && (
          <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs">
            <p className="font-semibold text-slate-700">Allocation Records</p>
            <ul className="divide-y divide-slate-200">
              {goalHistory.map(alloc => (
                <li key={alloc.id} className="py-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-teal-800">
                      +{formatRupees(alloc.amountPaise)}
                    </span>
                    <span className="text-slate-400">{alloc.date}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-slate-600">
                    <span className="capitalize">{alloc.type}</span>
                    {alloc.note && <span className="italic">“{alloc.note}”</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Explanatory footer per state */}
      <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
        {isFullyFunded && (
          <p className="text-emerald-700">
            ✨ Fully funded. <em>Note:</em> Money is reserved, not automatically transferred or paid.
          </p>
        )}
        {isDueToday && !isFullyFunded && (
          <p className="font-medium text-amber-800">
            ⚠️ Bill is due today. Complete remaining {formatRupees(remainingPaise)} allocation today.
          </p>
        )}
        {isOverdue && !isFullyFunded && (
          <p className="font-medium text-rose-700">
            🚨 Bill is past due date ({goal.dueDate}). Outstanding gap: {formatRupees(remainingPaise)}.
          </p>
        )}
        {!isFullyFunded && !isDueToday && !isOverdue && (
          <p className="text-slate-600">
            Saving {formatRupees(requiredDailyPaise)}/day over {contributionDays} days fulfills this bill.
          </p>
        )}
      </div>
    </article>
  )
}
