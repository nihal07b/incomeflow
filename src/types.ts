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

