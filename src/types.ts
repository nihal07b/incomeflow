/** Draft shared contract. Money = integer paise. Dates = local YYYY-MM-DD. */
export type MoneyPaise = number
export type LocalDate = string
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night'
export interface Profile { id: string; displayName: string; language: 'en' | 'hi'; currentCashPaise: MoneyPaise; cashAsOfDate: LocalDate; essentialDailySpendPaise: MoneyPaise; minimumCushionPaise: MoneyPaise }
export interface Bill { id: string; profileId: string; label: string; amountPaise: MoneyPaise; dueDate: LocalDate }
export interface ShiftLog { id: string; profileId: string; date: LocalDate; slot: TimeSlot; hours: number; grossEarningsPaise: MoneyPaise; workCostsPaise: MoneyPaise }
export interface PlannedExpense { id: string; profileId: string; date: LocalDate; label: string; amountPaise: MoneyPaise }
export interface WorkAvailability { date: LocalDate; availableSlots: TimeSlot[]; maxHours: number }
export interface ForecastAssumptions { source: 'user-assumption' | 'historical-baseline'; typicalNetHourlyPaise: MoneyPaise; conservativeNetHourlyPaise: MoneyPaise; comparableShiftCount: number }
export interface PlanResult {
  currentCashPaise: MoneyPaise
  projectedCashByDay: { date: LocalDate; closingCashPaise: MoneyPaise }[]
  estimatedBillGapPaise: MoneyPaise
  minimumCashWarning: boolean
  suggestedShifts: { date: LocalDate; slot: TimeSlot; hours: number; estimatedNetPaise: MoneyPaise }[]
  dataQuality: 'insufficient' | 'assumed' | 'historical'
  assumptions: string[]
  explanation: string
}

/** Bill or EMI goal */
export interface BillGoal {
  id: string
  profileId: string
  name: string
  targetPaise: MoneyPaise
  dueDate: LocalDate
  isPaid: boolean
  createdAt: LocalDate
}

/** Single allocation record towards a goal (e.g. opening, manual, peak-day, withdrawal) */
export interface GoalAllocation {
  id: string
  goalId: string
  profileId: string
  amountPaise: MoneyPaise
  date: LocalDate
  type: 'opening' | 'manual' | 'peak_day' | 'withdrawal'
  note?: string
  idempotencyKey?: string
}

export interface AddContributionInput {
  targetId: string
  targetType: 'bill' | 'vault'
  amountPaise: MoneyPaise
  note?: string
  idempotencyKey?: string
  type?: 'manual' | 'peak_day'
}

/** Baseline output contract from Member 4 / analytics engine */
export interface BaselineOutput {
  available: boolean
  baselineDailyIncomePaise?: MoneyPaise
  reason?: string
  shiftsAnalyzed?: number
}

/** Calculated peak-day surplus savings suggestion */
export interface PeakDaySuggestion {
  id: string
  date: LocalDate
  hasBaseline: boolean
  todayIncomePaise: MoneyPaise
  baselineDailyIncomePaise?: MoneyPaise
  extraIncomePaise: MoneyPaise
  percentage: number
  suggestedPaise: MoneyPaise
  isEligible: boolean
  explanation: string
  suggestionRef: string
}

export interface WithdrawalInput {
  targetId: string
  targetType: 'bill' | 'vault'
  amountPaise: MoneyPaise
  note?: string
  idempotencyKey?: string
}

/** Calculated display state of a BillGoal */
export type BillStatus = 'active' | 'due-today' | 'overdue' | 'fully-funded'

export interface BillGoalProgress {
  goal: BillGoal
  allocatedPaise: MoneyPaise
  remainingPaise: MoneyPaise
  status: BillStatus
  contributionDays: number
  requiredDailyPaise: MoneyPaise
  progressPercent: number
  isFullyFunded: boolean
  isOverdue: boolean
  isDueToday: boolean
}

/** Supported Vault categories */
export type VaultCategory =
  | 'emergency'
  | 'festival'
  | 'vehicle_maintenance'
  | 'future_investment'
  | 'custom'

/** Savings vault that a user can allocate money to */
export interface SavingsVault {
  id: string
  profileId: string
  label: string
  category: VaultCategory
  targetPaise: MoneyPaise
  currentPaise: MoneyPaise
  createdAt?: LocalDate
}

export interface VaultProgress {
  vault: SavingsVault
  allocatedPaise: MoneyPaise
  remainingPaise: MoneyPaise
  progressPercent: number
  isFullyFunded: boolean
  totalContributionsPaise: MoneyPaise
  totalWithdrawalsPaise: MoneyPaise
}

export interface CreateVaultInput {
  label: string
  category: VaultCategory
  targetPaise: MoneyPaise
  openingContributionPaise?: MoneyPaise
}
