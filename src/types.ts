/** Shared contract. Money = integer paise. Dates = local YYYY-MM-DD. */

export type MoneyPaise = number
export type LocalDate = string
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night'

export interface Profile {
  id: string
  displayName: string
  language: 'en' | 'hi'
  currentCashPaise: MoneyPaise
  cashAsOfDate: LocalDate
  essentialDailySpendPaise: MoneyPaise
  minimumCushionPaise: MoneyPaise
}

export interface Bill {
  id: string
  profileId: string
  label: string
  amountPaise: MoneyPaise
  dueDate: LocalDate
}

export interface ShiftLog {
  id: string
  profileId: string
  date: LocalDate
  slot: TimeSlot
  hours: number
  grossEarningsPaise: MoneyPaise
  workCostsPaise: MoneyPaise
}

export interface PlannedExpense {
  id: string
  profileId: string
  date: LocalDate
  label: string
  amountPaise: MoneyPaise
}

export interface WorkAvailability {
  date: LocalDate
  availableSlots: TimeSlot[]
  maxHours: number
}

export interface Customer {
  id: string
  profileId?: string
  name: string
  contact: string
  note?: string
  createdAt: LocalDate
  isArchived?: boolean
  archivedAt?: LocalDate
}

export type UdhaarStatus = 'pending' | 'due-today' | 'overdue' | 'settled'

export type PaymentMode = 'cash' | 'digital'

export interface UdhaarEntry {
  id: string
  profileId: string
  customerId: string
  originalAmountPaise: MoneyPaise
  repaidAmountPaise?: MoneyPaise
  description: string
  entryDate: LocalDate
  dueDate: LocalDate
  isSettled?: boolean
  settledAt?: LocalDate
  createdAt?: string
}

export interface RepaymentRecord {
  id: string
  profileId: string
  udhaarId: string
  customerId: string
  amountPaise: MoneyPaise
  date: LocalDate
  paymentMode: PaymentMode
  transactionId: string
  note?: string
  createdAt?: string
}

export interface ForecastAssumptions {
  source: 'user-assumption' | 'historical-baseline'
  typicalNetHourlyPaise: MoneyPaise
  conservativeNetHourlyPaise: MoneyPaise
  comparableShiftCount: number
}

export interface PlanResult {
  currentCashPaise: MoneyPaise
  projectedCashByDay: {
    date: LocalDate
    closingCashPaise: MoneyPaise
  }[]
  estimatedBillGapPaise: MoneyPaise
  minimumCashWarning: boolean
  suggestedShifts: {
    date: LocalDate
    slot: TimeSlot
    hours: number
    estimatedNetPaise: MoneyPaise
  }[]
  dataQuality: 'insufficient' | 'assumed' | 'historical'
  assumptions: string[]
  explanation: string
}

/** Bill or EMI goal. */
export interface BillGoal {
  id: string
  profileId: string
  name: string
  targetPaise: MoneyPaise
  dueDate: LocalDate
  isPaid: boolean
  createdAt: LocalDate
}

/** Single allocation record towards a goal. */
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

/** Baseline output contract from the analytics engine. */
export interface BaselineOutput {
  available: boolean
  baselineDailyIncomePaise?: MoneyPaise
  reason?: string
  shiftsAnalyzed?: number
}

/** Calculated peak-day surplus savings suggestion. */
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

export type BillStatus =
  | 'active'
  | 'due-today'
  | 'overdue'
  | 'fully-funded'

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

export type VaultCategory =
  | 'emergency'
  | 'festival'
  | 'vehicle_maintenance'
  | 'future_investment'
  | 'custom'

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

/** Financial summary contract. */
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  profileId?: string
  date: LocalDate
  amountPaise: MoneyPaise
  type: TransactionType
  category: string
  description?: string
  shiftId?: string | null
  workSessionId?: string | null
  repaymentId?: string | null
}

export interface Repayment {
  id: string
  profileId?: string
  date: LocalDate
  amountPaise: MoneyPaise
  type: 'received' | 'paid'
  category?: string
  description?: string
  transactionId?: string | null
}

export interface DailySeriesItem {
  date: LocalDate
  incomePaise: MoneyPaise
  expensesPaise: MoneyPaise
  netPaise: MoneyPaise
}

export interface FinancialSummary {
  periodIncomePaise: MoneyPaise
  periodExpensesPaise: MoneyPaise
  netRecordedCashFlowPaise: MoneyPaise
  dailySeries: DailySeriesItem[]
  expenseCategoryTotals: Record<string, MoneyPaise>
}

export interface FinancialSummaryInput {
  startDate?: LocalDate
  endDate?: LocalDate
  transactions?: Transaction[]
}

/** Daily work status. A missing DayLog means unknown. */
export type DayStatus = 'complete' | 'no_work' | 'incomplete'

export interface DayLog {
  date: LocalDate
  status: DayStatus
}

/** Reminder preferences and display records. */
export interface ReminderPreferences {
  profileId: string
  dailyLoggingEnabled: boolean
  dailyLoggingPrimaryTime: string
  dailyLoggingSecondaryEnabled: boolean
  dailyLoggingSecondaryTime?: string
  udhaarDueEnabled: boolean
  billsDueEnabled: boolean
  advanceNoticeDays: number
  updatedAt?: string
}

export type ReminderType =
  | 'daily-logging'
  | 'udhaar-due'
  | 'bill-due'

export type ReminderUrgency = 'urgent' | 'warning' | 'info'

export interface InAppReminder {
  id: string
  type: ReminderType
  urgency: ReminderUrgency
  title: string
  message: string
  scheduledTime?: string
  dueDate?: LocalDate
  amountPaise?: MoneyPaise
  statusLabel?: string
  entityId?: string
  targetTab?: string
  dismissed?: boolean
  createdAt: string
}