import { describe, it, expect } from 'vitest'
import {
  validateBillGoalInput,
  validateContributionInput,
  validateWithdrawalInput,
  validateCreateVaultInput,
  calculateGoalBalance,
  calculateVaultProgress,
  calculatePeakDaySavings,
  getGoalAllocationsSorted,
  calculateBillGoalProgress,
  calendarDaysBetween,
  isValidCalendarDate,
} from './goals'
import type { BillGoal, GoalAllocation, SavingsVault, BaselineOutput } from '../types'

describe('goal validation and date helpers', () => {
  it('validates calendar date formats and boundaries', () => {
    expect(isValidCalendarDate('2026-11-14')).toBe(true)
    expect(isValidCalendarDate('2026-02-28')).toBe(true)
    expect(isValidCalendarDate('2026-02-29')).toBe(false) // 2026 is not a leap year
    expect(isValidCalendarDate('2026-13-01')).toBe(false)
    expect(isValidCalendarDate('invalid-date')).toBe(false)
  })

  it('calculates calendar days difference accurately', () => {
    expect(calendarDaysBetween('2026-11-01', '2026-11-30')).toBe(29)
    expect(calendarDaysBetween('2026-11-14', '2026-11-14')).toBe(0)
    expect(calendarDaysBetween('2026-11-15', '2026-11-14')).toBe(-1)
  })

  it('validates correct bill goal inputs', () => {
    const valid = validateBillGoalInput({
      name: 'Bike EMI',
      targetPaise: 600000,
      dueDate: '2026-12-30',
      openingContributionPaise: 50000,
    })
    expect(valid.isValid).toBe(true)
    expect(Object.keys(valid.errors).length).toBe(0)
  })

  it('rejects empty or whitespace-only name', () => {
    const res = validateBillGoalInput({
      name: '   ',
      targetPaise: 500000,
      dueDate: '2026-12-30',
    })
    expect(res.isValid).toBe(false)
    expect(res.errors.name).toBeDefined()
  })

  it('rejects non-integer, zero and negative target amounts', () => {
    for (const invalid of [0, -100, 1500.5, NaN, Infinity]) {
      const res = validateBillGoalInput({
        name: 'Electric Bill',
        targetPaise: invalid,
        dueDate: '2026-12-30',
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.targetPaise).toBeDefined()
    }
  })

  it('rejects invalid due dates', () => {
    const res = validateBillGoalInput({
      name: 'Phone Bill',
      targetPaise: 100000,
      dueDate: '2026-02-30',
    })
    expect(res.isValid).toBe(false)
    expect(res.errors.dueDate).toBeDefined()
  })

  it('rejects invalid or exceeding opening contributions', () => {
    const neg = validateBillGoalInput({
      name: 'Rent',
      targetPaise: 1000000,
      dueDate: '2026-12-30',
      openingContributionPaise: -500,
    })
    expect(neg.isValid).toBe(false)
    expect(neg.errors.openingContributionPaise).toBeDefined()

    const excess = validateBillGoalInput({
      name: 'Rent',
      targetPaise: 1000000,
      dueDate: '2026-12-30',
      openingContributionPaise: 1200000,
    })
    expect(excess.isValid).toBe(false)
    expect(excess.errors.openingContributionPaise).toBeDefined()
  })
})

describe('bill goal progress and contribution calculations', () => {
  const baseGoal: BillGoal = {
    id: 'goal-bike-emi',
    profileId: 'profile-1',
    name: 'Bike Loan EMI',
    targetPaise: 600000, // ₹6,000
    dueDate: '2026-11-30',
    isPaid: false,
    createdAt: '2026-11-01',
  }

  it('computes 30-day contribution rule with no opening contribution', () => {
    // From 2026-11-01 to 2026-11-30 = 29 day diff + 1 = 30 contribution days
    const result = calculateBillGoalProgress(baseGoal, [], '2026-11-01')

    expect(result.allocatedPaise).toBe(0)
    expect(result.remainingPaise).toBe(600000)
    expect(result.contributionDays).toBe(30)
    expect(result.requiredDailyPaise).toBe(20000) // ₹200 / day
    expect(result.progressPercent).toBe(0)
    expect(result.status).toBe('active')
  })

  it('represents opening contribution as a single allocation without double-counting', () => {
    const openingAllocation: GoalAllocation = {
      id: 'alloc-1',
      goalId: baseGoal.id,
      profileId: baseGoal.profileId,
      amountPaise: 100000, // ₹1,000
      date: '2026-11-01',
      type: 'opening',
    }

    const result = calculateBillGoalProgress(baseGoal, [openingAllocation], '2026-11-06')
    // From Nov 6 to Nov 30 = 24 day diff + 1 = 25 contribution days
    // Remaining = 600000 - 100000 = 500000
    // Required daily = 500000 / 25 = 20000 paise (₹200 / day)
    expect(result.allocatedPaise).toBe(100000)
    expect(result.remainingPaise).toBe(500000)
    expect(result.contributionDays).toBe(25)
    expect(result.requiredDailyPaise).toBe(20000)
    expect(result.progressPercent).toBe(17) // 100k / 600k = ~17%
  })

  it('handles due-today explicitly', () => {
    const result = calculateBillGoalProgress(baseGoal, [], '2026-11-30')

    expect(result.isDueToday).toBe(true)
    expect(result.status).toBe('due-today')
    expect(result.contributionDays).toBe(1)
    expect(result.requiredDailyPaise).toBe(600000) // Full remaining needed today
  })

  it('handles overdue bills explicitly', () => {
    const result = calculateBillGoalProgress(baseGoal, [], '2026-12-01')

    expect(result.isOverdue).toBe(true)
    expect(result.status).toBe('overdue')
    expect(result.contributionDays).toBe(0)
    expect(result.requiredDailyPaise).toBe(600000)
  })

  it('handles fully funded bills explicitly and never marks them as automatically paid', () => {
    const fullAllocation: GoalAllocation = {
      id: 'alloc-full',
      goalId: baseGoal.id,
      profileId: baseGoal.profileId,
      amountPaise: 600000,
      date: '2026-11-10',
      type: 'manual',
    }

    const result = calculateBillGoalProgress(baseGoal, [fullAllocation], '2026-11-14')

    expect(result.isFullyFunded).toBe(true)
    expect(result.status).toBe('fully-funded')
    expect(result.remainingPaise).toBe(0)
    expect(result.requiredDailyPaise).toBe(0)
    expect(result.progressPercent).toBe(100)
    // Fully funded bill is NOT automatically paid
    expect(result.goal.isPaid).toBe(false)
  })

  it('recalculates balance, remaining amount, and required daily savings after incremental contributions', () => {
    // Initial state: 0 allocated
    const initial = calculateBillGoalProgress(baseGoal, [], '2026-11-14')
    expect(initial.allocatedPaise).toBe(0)
    expect(initial.remainingPaise).toBe(600000)
    // 17 days: Nov 14 to Nov 30 = 16 days diff + 1 = 17 days
    expect(initial.contributionDays).toBe(17)
    expect(initial.requiredDailyPaise).toBe(Math.ceil(600000 / 17)) // 35295 paise

    // Add first contribution: ₹2,000 (200000 paise)
    const alloc1: GoalAllocation = {
      id: 'alloc-1',
      goalId: baseGoal.id,
      profileId: baseGoal.profileId,
      amountPaise: 200000,
      date: '2026-11-14',
      type: 'manual',
      note: 'Friday evening surge savings',
    }
    const afterFirst = calculateBillGoalProgress(baseGoal, [alloc1], '2026-11-14')
    expect(afterFirst.allocatedPaise).toBe(200000)
    expect(afterFirst.remainingPaise).toBe(400000)
    expect(afterFirst.requiredDailyPaise).toBe(Math.ceil(400000 / 17)) // 23530 paise
    expect(afterFirst.progressPercent).toBe(33)

    // Add second contribution: ₹4,000 (400000 paise) -> fully covers the bill
    const alloc2: GoalAllocation = {
      id: 'alloc-2',
      goalId: baseGoal.id,
      profileId: baseGoal.profileId,
      amountPaise: 400000,
      date: '2026-11-15',
      type: 'manual',
      note: 'Saturday earnings boost',
    }
    const afterSecond = calculateBillGoalProgress(baseGoal, [alloc1, alloc2], '2026-11-15')
    expect(afterSecond.allocatedPaise).toBe(600000)
    expect(afterSecond.remainingPaise).toBe(0)
    expect(afterSecond.isFullyFunded).toBe(true)
    expect(afterSecond.status).toBe('fully-funded')
    expect(afterSecond.requiredDailyPaise).toBe(0)
    expect(afterSecond.progressPercent).toBe(100)
  })
})

describe('contribution input validation and allocation history', () => {
  it('validates valid contribution amounts with and without note', () => {
    const validWithNote = validateContributionInput(50000, 'Saved from lunch shift')
    expect(validWithNote.isValid).toBe(true)
    expect(Object.keys(validWithNote.errors).length).toBe(0)

    const validNoNote = validateContributionInput(10000)
    expect(validNoNote.isValid).toBe(true)
  })

  it('rejects zero, negative, fractional, and non-integer amounts', () => {
    for (const invalid of [0, -500, 100.5, NaN, Infinity]) {
      const res = validateContributionInput(invalid)
      expect(res.isValid).toBe(false)
      expect(res.errors.amountPaise).toBeDefined()
    }
  })

  it('rejects notes that exceed 200 characters', () => {
    const longNote = 'a'.repeat(201)
    const res = validateContributionInput(50000, longNote)
    expect(res.isValid).toBe(false)
    expect(res.errors.note).toBeDefined()
  })

  it('sorts and filters goal allocations newest first', () => {
    const allocs: GoalAllocation[] = [
      { id: '1', goalId: 'goal-1', profileId: 'p1', amountPaise: 100, date: '2026-11-01', type: 'opening' },
      { id: '2', goalId: 'goal-2', profileId: 'p1', amountPaise: 200, date: '2026-11-05', type: 'manual' },
      { id: '3', goalId: 'goal-1', profileId: 'p1', amountPaise: 300, date: '2026-11-14', type: 'manual' },
      { id: '4', goalId: 'goal-1', profileId: 'p1', amountPaise: 150, date: '2026-11-10', type: 'manual' },
    ]

    const sorted = getGoalAllocationsSorted(allocs, 'goal-1')
    expect(sorted.length).toBe(3)
    expect(sorted.map(a => a.id)).toEqual(['3', '4', '1'])
  })
})

describe('savings vaults and withdrawals', () => {
  const emergencyVault: SavingsVault = {
    id: 'vault-emergency',
    profileId: 'p1',
    label: 'Emergency Fund',
    category: 'emergency',
    targetPaise: 2000000, // ₹20,000
    currentPaise: 0,
    createdAt: '2026-11-01',
  }

  it('validates supported vault categories including future investment and custom', () => {
    const categories = ['emergency', 'festival', 'vehicle_maintenance', 'future_investment', 'custom'] as const
    for (const cat of categories) {
      const res = validateCreateVaultInput({
        label: `Test ${cat}`,
        category: cat,
        targetPaise: 500000,
        openingContributionPaise: 100000,
      })
      expect(res.isValid).toBe(true)
    }

    // Invalid category
    const invalidCat = validateCreateVaultInput({
      label: 'Crypto Vault',
      category: 'crypto' as any,
      targetPaise: 500000,
    })
    expect(invalidCat.isValid).toBe(false)
    expect(invalidCat.errors.category).toBeDefined()
  })

  it('validates withdrawal amounts strictly', () => {
    // Valid withdrawal within balance
    const valid = validateWithdrawalInput(20000, 50000, 'Tyre replacement')
    expect(valid.isValid).toBe(true)

    // Withdrawal exceeding available allocated balance
    const excess = validateWithdrawalInput(60000, 50000)
    expect(excess.isValid).toBe(false)
    expect(excess.errors.amountPaise).toBeDefined()

    // Non-positive, zero, fractional, or non-integer amounts
    for (const invalid of [0, -100, 50.5, NaN, Infinity]) {
      const res = validateWithdrawalInput(invalid, 50000)
      expect(res.isValid).toBe(false)
      expect(res.errors.amountPaise).toBeDefined()
    }
  })

  it('reuses the allocation accounting engine for deposits and withdrawals on vaults', () => {
    // 1. Initial deposit (₹10,000)
    const deposit1: GoalAllocation = {
      id: 'dep-1',
      goalId: emergencyVault.id,
      profileId: 'p1',
      amountPaise: 1000000,
      date: '2026-11-01',
      type: 'opening',
    }

    const initialProgress = calculateVaultProgress(emergencyVault, [deposit1])
    expect(initialProgress.allocatedPaise).toBe(1000000)
    expect(initialProgress.remainingPaise).toBe(1000000)
    expect(initialProgress.progressPercent).toBe(50)
    expect(initialProgress.isFullyFunded).toBe(false)

    // 2. Withdrawal (₹3,000 for unexpected medical bill)
    const withdrawal1: GoalAllocation = {
      id: 'with-1',
      goalId: emergencyVault.id,
      profileId: 'p1',
      amountPaise: 300000,
      date: '2026-11-05',
      type: 'withdrawal',
      note: 'Emergency medical visit',
    }

    const afterWithdrawal = calculateVaultProgress(emergencyVault, [deposit1, withdrawal1])
    // 10,000 - 3,000 = 7,000 allocated (700000 paise)
    expect(afterWithdrawal.allocatedPaise).toBe(700000)
    expect(afterWithdrawal.remainingPaise).toBe(1300000)
    expect(afterWithdrawal.totalContributionsPaise).toBe(1000000)
    expect(afterWithdrawal.totalWithdrawalsPaise).toBe(300000)
    expect(afterWithdrawal.progressPercent).toBe(35)

    // 3. Additional deposit of ₹13,000 to fully fund the vault
    const deposit2: GoalAllocation = {
      id: 'dep-2',
      goalId: emergencyVault.id,
      profileId: 'p1',
      amountPaise: 1300000,
      date: '2026-11-10',
      type: 'manual',
    }

    const fullyFunded = calculateVaultProgress(emergencyVault, [deposit1, withdrawal1, deposit2])
    expect(fullyFunded.allocatedPaise).toBe(2000000)
    expect(fullyFunded.remainingPaise).toBe(0)
    expect(fullyFunded.isFullyFunded).toBe(true)
    expect(fullyFunded.progressPercent).toBe(100)

    // 4. Ensure withdrawal history is preserved in allocations
    const sortedHistory = getGoalAllocationsSorted([deposit1, withdrawal1, deposit2], emergencyVault.id)
    expect(sortedHistory.length).toBe(3)
    expect(sortedHistory[0].id).toBe('dep-2') // Nov 10
    expect(sortedHistory[1].id).toBe('with-1') // Nov 05
    expect(sortedHistory[2].id).toBe('dep-1') // Nov 01

    // 5. Direct verification of calculateGoalBalance accounting engine
    const balanceSummary = calculateGoalBalance([deposit1, withdrawal1, deposit2], emergencyVault.id)
    expect(balanceSummary.totalContributionsPaise).toBe(2300000)
    expect(balanceSummary.totalWithdrawalsPaise).toBe(300000)
    expect(balanceSummary.allocatedPaise).toBe(2000000)
  })
})

describe('peak-day surplus savings', () => {
  it('calculates the exact roadmap example: Today ₹1,500, baseline ₹800, percentage 30%, suggestion ₹210', () => {
    const todayIncomePaise = 150000 // ₹1,500
    const baseline: BaselineOutput = {
      available: true,
      baselineDailyIncomePaise: 80000, // ₹800
      shiftsAnalyzed: 14,
    }

    const result = calculatePeakDaySavings(todayIncomePaise, baseline, 30, '2026-11-14')

    expect(result.hasBaseline).toBe(true)
    expect(result.isEligible).toBe(true)
    expect(result.todayIncomePaise).toBe(150000)
    expect(result.baselineDailyIncomePaise).toBe(80000)
    expect(result.extraIncomePaise).toBe(70000) // ₹700 extra
    expect(result.percentage).toBe(30)
    expect(result.suggestedPaise).toBe(21000) // ₹210 suggested allocation!
    expect(result.suggestionRef).toBe('peak-2026-11-14-150000-80000')
  })

  it('adjusts suggested allocation when percentage changes', () => {
    const todayIncomePaise = 150000 // ₹1,500
    const baseline: BaselineOutput = {
      available: true,
      baselineDailyIncomePaise: 80000, // ₹800
    }

    // 20% of 700 = 140
    const res20 = calculatePeakDaySavings(todayIncomePaise, baseline, 20)
    expect(res20.suggestedPaise).toBe(14000)

    // 50% of 700 = 350
    const res50 = calculatePeakDaySavings(todayIncomePaise, baseline, 50)
    expect(res50.suggestedPaise).toBe(35000)
  })

  it('handles income below or equal to baseline with zero extra income', () => {
    const baseline: BaselineOutput = {
      available: true,
      baselineDailyIncomePaise: 80000, // ₹800
    }

    // Equal to baseline
    const equal = calculatePeakDaySavings(80000, baseline, 30)
    expect(equal.extraIncomePaise).toBe(0)
    expect(equal.suggestedPaise).toBe(0)
    expect(equal.isEligible).toBe(false)

    // Below baseline
    const below = calculatePeakDaySavings(60000, baseline, 30)
    expect(below.extraIncomePaise).toBe(0)
    expect(below.suggestedPaise).toBe(0)
    expect(below.isEligible).toBe(false)
  })

  it('explains when baseline is unavailable without inventing history', () => {
    const unavailableBaseline: BaselineOutput = {
      available: false,
      reason: 'Need 3 logged shifts to calculate your typical baseline.',
    }

    const result = calculatePeakDaySavings(150000, unavailableBaseline, 30)

    expect(result.hasBaseline).toBe(false)
    expect(result.isEligible).toBe(false)
    expect(result.suggestedPaise).toBe(0)
    expect(result.explanation).toContain('Need 3 logged shifts')
    // Ensure no invented baseline value was injected
    expect(result.baselineDailyIncomePaise).toBeUndefined()
  })
})
