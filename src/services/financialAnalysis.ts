import { calculateDailyAverages, type DailyAveragesResult } from '../engine/dailyAverages'
import { calculateFinancialSummary } from '../engine/summary'
import { getStorageService } from './storage'
import type { StorageService } from './storage'
import type { DayStatus, FinancialSummary, LocalDate, Transaction } from '../types'

export type AnalysisPeriod = 'week' | 'month'
export interface AnalysisView {
  startDate: LocalDate
  endDate: LocalDate
  profileId: string
  summary: FinancialSummary
  recordedDates: LocalDate[]
  hasRecords: boolean
  dayStatuses: Record<LocalDate, DayStatus>
  dayAnalysis: { status: 'ready'; result: DailyAveragesResult } | { status: 'error'; message: string }
}

/** Civil-date validation: Member 4's engine checks format, not calendar validity. */
export function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Select a valid calendar date.')
  const [y, m, d] = value.split('-').map(Number)
  const result = new Date(0)
  result.setUTCHours(0, 0, 0, 0)
  result.setUTCFullYear(y, m - 1, d)
  if (y < 1900 || result.getUTCFullYear() !== y || result.getUTCMonth() !== m - 1 || result.getUTCDate() !== d) {
    throw new Error(`Invalid or unsupported calendar date: ${value}`)
  }
  return result
}

export function getTodayIST(now = new Date()): LocalDate {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** Week starts Monday. Both ranges stop at the selected day, inclusive. */
export function getAnalysisRange(period: AnalysisPeriod, endDate: LocalDate) {
  const date = parseCalendarDate(endDate)
  if (period === 'week') date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  else if (period === 'month') date.setUTCDate(1)
  else throw new Error('Choose week or month.')
  return { startDate: date.toISOString().slice(0, 10), endDate }
}

/** Adapter only: all financial aggregation stays in Member 4's engine. */
export async function loadFinancialAnalysis(
  period: AnalysisPeriod,
  endDate: LocalDate,
  service: Pick<StorageService, 'getProfile' | 'getTransactions' | 'getDayLogs'> = getStorageService(),
  today: LocalDate = getTodayIST(),
): Promise<AnalysisView> {
  const range = getAnalysisRange(period, endDate)
  parseCalendarDate(today)
  if (endDate > today) throw new Error('The selected period cannot end in the future.')
  const [profile, records] = await Promise.all([service.getProfile(), service.getTransactions()])
  // Existing UdhaarPage writes this local-demo profile ID. Never combine profiles.
  // This is a local selection convention, NOT authentication or backend access control.
  const profileId = profile?.id ?? 'profile-demo-1'
  const transactions: Transaction[] = records.filter(r => r.profileId === profileId).map(r => ({
    id: r.id, profileId: r.profileId, date: r.date, type: r.type,
    amountPaise: r.amountPaise, category: r.category,
    description: r.description, repaymentId: r.repaymentId,
  }))
  for (const tx of transactions) parseCalendarDate(tx.date)
  const summary = calculateFinancialSummary({ ...range, transactions })
  const amounts = [summary.periodIncomePaise, summary.periodExpensesPaise,
    summary.netRecordedCashFlowPaise, ...Object.values(summary.expenseCategoryTotals),
    ...summary.dailySeries.flatMap(d => [d.incomePaise, d.expensesPaise, d.netPaise])]
  if (!amounts.every(Number.isSafeInteger)) throw new Error('Recorded totals exceed the supported amount range.')
  const recordedDates = [...new Set(transactions
    .filter(t => t.date >= range.startDate && t.date <= range.endDate)
    .map(t => t.date))]
  let dayStatuses: Record<LocalDate, DayStatus> = {}
  let dayAnalysis: AnalysisView['dayAnalysis']
  try {
    // DayLog currently belongs to this browser, not to an authenticated profile.
    const logs = await service.getDayLogs()
    for (const log of logs) parseCalendarDate(log.date)
    const dayLogs = logs.filter(log => log.date >= range.startDate && log.date <= range.endDate)
    const result = calculateDailyAverages({ ...range, transactions, dayLogs, today })
    dayStatuses = Object.fromEntries(dayLogs.map(log => [log.date, log.status]))
    dayAnalysis = { status: 'ready', result }
  } catch (error: unknown) {
    // A classification problem must not hide valid transaction totals.
    dayAnalysis = { status: 'error', message: error instanceof Error ? error.message : 'Daily status analysis could not be loaded.' }
  }
  return { ...range, profileId, summary, recordedDates, hasRecords: recordedDates.length > 0, dayStatuses, dayAnalysis }
}
