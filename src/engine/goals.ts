import type {
  BillGoal,
  GoalAllocation,
  BillGoalProgress,
  BillStatus,
  LocalDate,
  MoneyPaise,
  SavingsVault,
  VaultProgress,
  CreateVaultInput,
  VaultCategory,
  BaselineOutput,
  PeakDaySuggestion,
} from '../types'

export interface CreateBillGoalInput {
  name: string
  targetPaise: number
  dueDate: LocalDate
  openingContributionPaise?: number
}

export function formatRupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)
}

/** Check if string is a valid YYYY-MM-DD calendar date */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  const [y, m, d] = dateStr.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dateObj = new Date(y, m - 1, d)
  return (
    dateObj.getFullYear() === y &&
    dateObj.getMonth() === m - 1 &&
    dateObj.getDate() === d
  )
}

/**
 * Calculates calendar days difference (toDate - fromDate).
 * Uses UTC to avoid local timezone/daylight saving truncation issues.
 */
export function calendarDaysBetween(fromDateStr: LocalDate, toDateStr: LocalDate): number {
  if (!isValidCalendarDate(fromDateStr) || !isValidCalendarDate(toDateStr)) {
    throw new Error(`Invalid date format for calendar diff: ${fromDateStr}, ${toDateStr}`)
  }
  const [y1, m1, d1] = fromDateStr.split('-').map(Number)
  const [y2, m2, d2] = toDateStr.split('-').map(Number)
  const utc1 = Date.UTC(y1, m1 - 1, d1)
  const utc2 = Date.UTC(y2, m2 - 1, d2)
  const MS_PER_DAY = 1000 * 60 * 60 * 24
  return Math.round((utc2 - utc1) / MS_PER_DAY)
}

/**
 * Peak-Day Surplus Savings Calculation.
 *
 * Rules:
 * 1. Extra income = max(0, today's income - historical baseline).
 * 2. Suggested allocation = extra income * chosen percentage.
 * 3. If baseline is unavailable, explain that instead of inventing it.
 * 4. Generates a stable suggestion reference for deduplication / idempotency coordination.
 */
export function calculatePeakDaySavings(
  todayIncomePaise: number,
  baseline: BaselineOutput,
  percentage = 30,
  currentDate = '2026-11-14'
): PeakDaySuggestion {
  if (typeof todayIncomePaise !== 'number' || !Number.isSafeInteger(todayIncomePaise) || todayIncomePaise < 0) {
    throw new Error('Today income must be a non-negative integer paise.')
  }
  if (typeof percentage !== 'number' || percentage < 1 || percentage > 100) {
    throw new Error('Percentage must be between 1 and 100.')
  }

  const suggestionRef = `peak-${currentDate}-${todayIncomePaise}-${baseline.baselineDailyIncomePaise ?? 'no-baseline'}`

  if (!baseline.available || baseline.baselineDailyIncomePaise === undefined) {
    return {
      id: `suggestion-${currentDate}`,
      date: currentDate,
      hasBaseline: false,
      todayIncomePaise,
      extraIncomePaise: 0,
      percentage,
      suggestedPaise: 0,
      isEligible: false,
      explanation:
        baseline.reason ||
        'Historical baseline is unavailable. IncomeFlow will not invent baseline earnings until sufficient shift history is established.',
      suggestionRef,
    }
  }

  const extraIncomePaise = Math.max(0, todayIncomePaise - baseline.baselineDailyIncomePaise) as MoneyPaise
  const isEligible = extraIncomePaise > 0
  const suggestedPaise = isEligible
    ? (Math.round(extraIncomePaise * (percentage / 100)) as MoneyPaise)
    : (0 as MoneyPaise)

  const explanation = isEligible
    ? `You earned ${formatRupees(extraIncomePaise)} above your typical baseline of ${formatRupees(
        baseline.baselineDailyIncomePaise
      )} today. Saving ${percentage}% (${formatRupees(suggestedPaise)}) strengthens your goals.`
    : `Today's earnings (${formatRupees(todayIncomePaise)}) did not exceed your typical daily baseline (${formatRupees(
        baseline.baselineDailyIncomePaise
      )}).`

  return {
    id: `suggestion-${currentDate}`,
    date: currentDate,
    hasBaseline: true,
    todayIncomePaise,
    baselineDailyIncomePaise: baseline.baselineDailyIncomePaise,
    extraIncomePaise,
    percentage,
    suggestedPaise,
    isEligible,
    explanation,
    suggestionRef,
  }
}

/**
 * Validate bill goal inputs.
 * Money must be integer paise.
 */
export function validateBillGoalInput(input: CreateBillGoalInput): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
    errors.name = 'Bill name is required.'
  } else if (input.name.trim().length > 100) {
    errors.name = 'Bill name cannot exceed 100 characters.'
  }

  if (typeof input.targetPaise !== 'number' || !Number.isSafeInteger(input.targetPaise) || input.targetPaise <= 0) {
    errors.targetPaise = 'Target amount must be a positive integer in paise.'
  }

  if (!input.dueDate || typeof input.dueDate !== 'string' || !isValidCalendarDate(input.dueDate)) {
    errors.dueDate = 'Due date must be a valid calendar date in YYYY-MM-DD format.'
  }

  if (input.openingContributionPaise !== undefined && input.openingContributionPaise !== null) {
    if (
      typeof input.openingContributionPaise !== 'number' ||
      !Number.isSafeInteger(input.openingContributionPaise) ||
      input.openingContributionPaise < 0
    ) {
      errors.openingContributionPaise = 'Opening contribution must be an integer paise >= 0.'
    } else if (typeof input.targetPaise === 'number' && input.openingContributionPaise > input.targetPaise) {
      errors.openingContributionPaise = 'Opening contribution cannot exceed target amount.'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate manual contribution input.
 * Amount must be integer paise > 0.
 * Note is optional, max 200 chars.
 */
export function validateContributionInput(
  amountPaise: number,
  note?: string
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (typeof amountPaise !== 'number' || !Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    errors.amountPaise = 'Contribution amount must be a positive integer in paise.'
  }

  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      errors.note = 'Note must be a valid text string.'
    } else if (note.trim().length > 200) {
      errors.note = 'Note cannot exceed 200 characters.'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate withdrawal input.
 * Amount must be integer paise > 0.
 * Amount cannot exceed current allocated balance.
 */
export function validateWithdrawalInput(
  amountPaise: number,
  currentAllocatedPaise: number,
  note?: string
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (typeof amountPaise !== 'number' || !Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    errors.amountPaise = 'Withdrawal amount must be a positive integer in paise.'
  } else if (amountPaise > currentAllocatedPaise) {
    errors.amountPaise = `Withdrawal amount exceeds available allocated balance (${formatRupees(currentAllocatedPaise)}).`
  }

  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      errors.note = 'Note must be a valid text string.'
    } else if (note.trim().length > 200) {
      errors.note = 'Note cannot exceed 200 characters.'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

const VALID_VAULT_CATEGORIES: VaultCategory[] = [
  'emergency',
  'festival',
  'vehicle_maintenance',
  'future_investment',
  'custom',
]

/**
 * Validate vault creation inputs.
 */
export function validateCreateVaultInput(
  input: CreateVaultInput
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (!input.label || typeof input.label !== 'string' || input.label.trim().length === 0) {
    errors.label = 'Vault name is required.'
  } else if (input.label.trim().length > 100) {
    errors.label = 'Vault name cannot exceed 100 characters.'
  }

  if (!input.category || !VALID_VAULT_CATEGORIES.includes(input.category)) {
    errors.category = 'Valid vault category is required.'
  }

  if (typeof input.targetPaise !== 'number' || !Number.isSafeInteger(input.targetPaise) || input.targetPaise <= 0) {
    errors.targetPaise = 'Target amount must be a positive integer in paise.'
  }

  if (input.openingContributionPaise !== undefined && input.openingContributionPaise !== null) {
    if (
      typeof input.openingContributionPaise !== 'number' ||
      !Number.isSafeInteger(input.openingContributionPaise) ||
      input.openingContributionPaise < 0
    ) {
      errors.openingContributionPaise = 'Opening contribution must be an integer paise >= 0.'
    } else if (typeof input.targetPaise === 'number' && input.openingContributionPaise > input.targetPaise) {
      errors.openingContributionPaise = 'Opening contribution cannot exceed target amount.'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Reused accounting engine:
 * Calculate the net allocated balance for any goal or vault from allocation records.
 * Contributions increase the balance; withdrawals decrease it.
 */
export function calculateGoalBalance(
  allocations: GoalAllocation[],
  goalId: string
): { allocatedPaise: MoneyPaise; totalContributionsPaise: MoneyPaise; totalWithdrawalsPaise: MoneyPaise } {
  const goalAllocs = allocations.filter(a => a.goalId === goalId)
  let totalContributionsPaise = 0
  let totalWithdrawalsPaise = 0

  for (const a of goalAllocs) {
    if (!Number.isSafeInteger(a.amountPaise) || a.amountPaise < 0) {
      throw new Error(`Invalid allocation amount: ${a.amountPaise}`)
    }
    if (a.type === 'withdrawal') {
      totalWithdrawalsPaise += a.amountPaise
    } else {
      totalContributionsPaise += a.amountPaise
    }
  }

  const allocatedPaise = Math.max(0, totalContributionsPaise - totalWithdrawalsPaise) as MoneyPaise
  return { allocatedPaise, totalContributionsPaise, totalWithdrawalsPaise }
}

/**
 * Calculate progress for a SavingsVault using the shared allocation records.
 */
export function calculateVaultProgress(
  vault: SavingsVault,
  allocations: GoalAllocation[]
): VaultProgress {
  const { allocatedPaise, totalContributionsPaise, totalWithdrawalsPaise } = calculateGoalBalance(
    allocations,
    vault.id
  )
  const remainingPaise = Math.max(0, vault.targetPaise - allocatedPaise) as MoneyPaise
  const isFullyFunded = vault.targetPaise > 0 && remainingPaise === 0
  const progressPercent = vault.targetPaise > 0
    ? Math.min(100, Math.round((allocatedPaise / vault.targetPaise) * 100))
    : 100

  return {
    vault,
    allocatedPaise,
    remainingPaise,
    progressPercent,
    isFullyFunded,
    totalContributionsPaise,
    totalWithdrawalsPaise,
  }
}

/**
 * Get allocations for a specific goal, sorted by date (newest first).
 */
export function getGoalAllocationsSorted(
  allocations: GoalAllocation[],
  goalId: string
): GoalAllocation[] {
  return allocations
    .filter(a => a.goalId === goalId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

/**
 * Calculate the progress and daily requirement for a BillGoal.
 *
 * Rules:
 * 1. Allocated balance = sum of all allocations for this goal (opening contribution is stored as a single allocation record, never double-counted).
 * 2. Remaining amount = max(0, targetPaise - allocatedPaise).
 * 3. Contribution days = calendar days from asOfDate to dueDate inclusive (i.e. diff + 1).
 * 4. A fully funded bill (allocated >= target) is NOT automatically paid (isPaid remains false).
 *    Its required daily contribution is 0.
 * 5. Due-today bill (asOfDate === dueDate): contributionDays = 1, required daily = remaining amount.
 * 6. Overdue bill (asOfDate > dueDate): contributionDays = 0, isOverdue = true.
 */
export function calculateBillGoalProgress(
  goal: BillGoal,
  allocations: GoalAllocation[],
  asOfDate: LocalDate
): BillGoalProgress {
  if (!isValidCalendarDate(asOfDate)) {
    throw new Error(`Invalid asOfDate: ${asOfDate}`)
  }

  // Calculate allocated paise strictly from shared allocation engine (contributions minus withdrawals)
  const { allocatedPaise } = calculateGoalBalance(allocations, goal.id)

  const remainingPaise = Math.max(0, goal.targetPaise - allocatedPaise) as MoneyPaise
  const isFullyFunded = remainingPaise === 0
  const progressPercent = goal.targetPaise > 0
    ? Math.min(100, Math.round((allocatedPaise / goal.targetPaise) * 100))
    : 100

  const diffDays = calendarDaysBetween(asOfDate, goal.dueDate)
  const isDueToday = diffDays === 0
  const isOverdue = diffDays < 0

  let status: BillStatus
  let contributionDays = 0
  let requiredDailyPaise: MoneyPaise = 0

  if (isFullyFunded) {
    status = 'fully-funded'
    contributionDays = Math.max(0, diffDays + 1)
    requiredDailyPaise = 0
  } else if (isOverdue) {
    status = 'overdue'
    contributionDays = 0
    requiredDailyPaise = remainingPaise
  } else if (isDueToday) {
    status = 'due-today'
    contributionDays = 1
    requiredDailyPaise = remainingPaise
  } else {
    status = 'active'
    contributionDays = diffDays + 1
    requiredDailyPaise = Math.ceil(remainingPaise / contributionDays)
  }

  return {
    goal,
    allocatedPaise,
    remainingPaise,
    status,
    contributionDays,
    requiredDailyPaise,
    progressPercent,
    isFullyFunded,
    isOverdue,
    isDueToday,
  }
}
