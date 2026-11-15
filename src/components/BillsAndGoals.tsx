import { useEffect, useState } from 'react'
import type {
  BillGoal,
  GoalAllocation,
  SavingsVault,
  Profile,
  AddContributionInput,
  WithdrawalInput,
  CreateVaultInput,
  PeakDaySuggestion,
} from '../types'
import {
  fetchBillGoals,
  fetchGoalAllocations,
  fetchVaults,
  createBillGoal,
  addContribution,
  createVault,
  withdrawFromGoal,
  fetchHistoricalBaseline,
  fetchTodayEarnings,
} from '../services/mockData'
import {
  calculateBillGoalProgress,
  calculateVaultProgress,
  calculatePeakDaySavings,
  type CreateBillGoalInput,
} from '../engine/goals'
import BillCard from './BillCard'
import VaultCard from './VaultCard'
import CreateBillModal from './CreateBillModal'
import CreateVaultModal from './CreateVaultModal'
import AddContributionModal from './AddContributionModal'
import WithdrawalModal from './WithdrawalModal'
import PeakDayCard from './PeakDayCard'

interface BillsAndGoalsProps {
  profile: Profile
}

interface ContributionTarget {
  id: string
  name: string
  type: 'bill' | 'vault'
  remainingPaise?: number
}

interface WithdrawalTarget {
  id: string
  name: string
  type: 'bill' | 'vault'
  availablePaise: number
}

export default function BillsAndGoals({ profile }: BillsAndGoalsProps) {
  const [goals, setGoals] = useState<BillGoal[] | null>(null)
  const [allocations, setAllocations] = useState<GoalAllocation[] | null>(null)
  const [vaults, setVaults] = useState<SavingsVault[] | null>(null)
  const [peakSuggestion, setPeakSuggestion] = useState<PeakDaySuggestion | null>(null)
  const [isPeakDismissed, setIsPeakDismissed] = useState(false)
  const [peakAcceptedMessage, setPeakAcceptedMessage] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isCreateBillModalOpen, setIsCreateBillModalOpen] = useState(false)
  const [isCreateVaultModalOpen, setIsCreateVaultModalOpen] = useState(false)
  const [contributionTarget, setContributionTarget] = useState<ContributionTarget | null>(null)
  const [withdrawalTarget, setWithdrawalTarget] = useState<WithdrawalTarget | null>(null)

  const reloadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [fetchedGoals, fetchedAllocations, fetchedVaults, baseline, todayIncome] =
        await Promise.all([
          fetchBillGoals(profile.id),
          fetchGoalAllocations(profile.id),
          fetchVaults(profile.id),
          fetchHistoricalBaseline(profile.id),
          fetchTodayEarnings(profile.id),
        ])
      setGoals(fetchedGoals)
      setAllocations(fetchedAllocations)
      setVaults(fetchedVaults)
      const suggestion = calculatePeakDaySavings(todayIncome, baseline, 30, profile.cashAsOfDate)
      setPeakSuggestion(suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills and goals.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    Promise.all([
      fetchBillGoals(profile.id),
      fetchGoalAllocations(profile.id),
      fetchVaults(profile.id),
      fetchHistoricalBaseline(profile.id),
      fetchTodayEarnings(profile.id),
    ])
      .then(([fetchedGoals, fetchedAllocations, fetchedVaults, baseline, todayIncome]) => {
        if (!isMounted) return
        setGoals(fetchedGoals)
        setAllocations(fetchedAllocations)
        setVaults(fetchedVaults)
        const suggestion = calculatePeakDaySavings(todayIncome, baseline, 30, profile.cashAsOfDate)
        setPeakSuggestion(suggestion)
        setIsLoading(false)
      })
      .catch(err => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Failed to load bills and goals.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [profile.id, profile.cashAsOfDate])

  const handleCreateBill = async (input: CreateBillGoalInput) => {
    await createBillGoal(profile.id, input, profile.cashAsOfDate)
    await reloadData()
  }

  const handleCreateVault = async (input: CreateVaultInput) => {
    await createVault(profile.id, input, profile.cashAsOfDate)
    await reloadData()
  }

  const handleAddContribution = async (input: AddContributionInput) => {
    await addContribution(profile.id, input, profile.cashAsOfDate)
    await reloadData()
  }

  const handleWithdrawal = async (input: WithdrawalInput) => {
    await withdrawFromGoal(profile.id, input, profile.cashAsOfDate)
    await reloadData()
  }

  const handleAcceptPeakSavings = async (
    targetId: string,
    targetType: 'bill' | 'vault',
    amountPaise: number,
    note: string,
    suggestionRef: string
  ) => {
    // Exactly one allocation with stable suggestion reference for deduplication
    await addContribution(profile.id, {
      targetId,
      targetType,
      amountPaise,
      note,
      idempotencyKey: suggestionRef,
      type: 'peak_day',
    })
    setPeakAcceptedMessage('Peak-day surplus allocation recorded successfully!')
    setIsPeakDismissed(true)
    await reloadData()
  }

  return (
    <div className="space-y-12">
      {/* SECTION 0: Peak-Day Savings Recommendation */}
      {!isLoading && peakSuggestion && !isPeakDismissed && (
        <section aria-label="Peak-day savings suggestion">
          <PeakDayCard
            suggestion={peakSuggestion}
            bills={goals || []}
            vaults={vaults || []}
            onAccept={handleAcceptPeakSavings}
            onDismiss={() => setIsPeakDismissed(true)}
          />
        </section>
      )}

      {peakAcceptedMessage && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-xs font-semibold text-teal-900" role="status">
          ✓ {peakAcceptedMessage}
        </div>
      )}

      {/* SECTION 1: Bills & EMI Goals */}
      <section aria-labelledby="bills-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="bills-heading" className="text-2xl font-bold tracking-tight text-slate-900">
              Bills & EMI Goals
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Daily savings targets to protect you from late penalties and cash pinches.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateBillModalOpen(true)}
            className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            + Add Bill
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            <p className="font-semibold">Unable to load data</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={reloadData}
              className="mt-2 text-xs font-semibold text-rose-900 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state skeleton */}
        {isLoading && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[1, 2].map(n => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <div className="h-5 w-1/3 rounded-sm bg-slate-200" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="h-12 rounded-xl bg-slate-100" />
                  <div className="h-12 rounded-xl bg-slate-100" />
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && goals && goals.length === 0 && (
          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center sm:p-12">
            <p className="text-base font-semibold text-slate-800">No active bills or EMIs</p>
            <p className="mt-1 text-sm text-slate-500">
              Add your upcoming bike EMI, phone bill or house rent to plan your daily income targets.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateBillModalOpen(true)}
              className="mt-4 inline-flex items-center rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              + Create First Bill
            </button>
          </div>
        )}

        {/* Goals list */}
        {!isLoading && !error && goals && goals.length > 0 && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {goals.map(goal => {
              const progress = calculateBillGoalProgress(goal, allocations || [], profile.cashAsOfDate)
              return (
                <BillCard
                  key={goal.id}
                  progress={progress}
                  allocations={allocations || []}
                  onAddContribution={() =>
                    setContributionTarget({
                      id: goal.id,
                      name: goal.name,
                      type: 'bill',
                      remainingPaise: progress.remainingPaise,
                    })
                  }
                />
              )
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Savings Vaults */}
      <section aria-labelledby="vaults-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="vaults-heading" className="text-2xl font-bold tracking-tight text-slate-900">
              Savings Vaults
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Dedicated reserves for emergencies, seasonal festivals and future vehicle repairs.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-teal-700/40 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-900 hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-teal-700"
            onClick={() => setIsCreateVaultModalOpen(true)}
          >
            + Create Vault
          </button>
        </div>

        {/* Vaults grid */}
        {!isLoading && vaults && vaults.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {vaults.map(v => {
              const progress = calculateVaultProgress(v, allocations || [])
              return (
                <VaultCard
                  key={v.id}
                  progress={progress}
                  allocations={allocations || []}
                  onAddContribution={() =>
                    setContributionTarget({
                      id: v.id,
                      name: v.label,
                      type: 'vault',
                      remainingPaise: progress.remainingPaise,
                    })
                  }
                  onWithdraw={() =>
                    setWithdrawalTarget({
                      id: v.id,
                      name: v.label,
                      type: 'vault',
                      availablePaise: progress.allocatedPaise,
                    })
                  }
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Create Bill Modal */}
      <CreateBillModal
        isOpen={isCreateBillModalOpen}
        onClose={() => setIsCreateBillModalOpen(false)}
        onSubmit={handleCreateBill}
      />

      {/* Create Vault Modal */}
      <CreateVaultModal
        isOpen={isCreateVaultModalOpen}
        onClose={() => setIsCreateVaultModalOpen(false)}
        onSubmit={handleCreateVault}
      />

      {/* Add Contribution Modal */}
      <AddContributionModal
        isOpen={contributionTarget !== null}
        target={contributionTarget}
        onClose={() => setContributionTarget(null)}
        onSubmit={handleAddContribution}
      />

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={withdrawalTarget !== null}
        target={withdrawalTarget}
        onClose={() => setWithdrawalTarget(null)}
        onSubmit={handleWithdrawal}
      />
    </div>
  )
}
