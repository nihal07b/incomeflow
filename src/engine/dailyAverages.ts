import type { DayLog, DayStatus, LocalDate, MoneyPaise, Transaction } from '../types'
import { calculateDailySeries, validateDate } from './summary'

export interface DailyAveragesInput {
  transactions: Transaction[]
  dayLogs: DayLog[]
  startDate: LocalDate
  endDate: LocalDate
  today: LocalDate
}

export interface DayIncomeRecord {
  date: LocalDate
  incomePaise: MoneyPaise
}

export interface AverageMetric {
  averagePaise: MoneyPaise
  totalIncomePaise: MoneyPaise
  dayCount: number
  label: string
}

export interface DailyAveragesResult {
  averageIncomePerRecordedWorkday: AverageMetric | null
  averageIncomePerRecordedWorkdayReason: string | null
  averageIncomePerFullyLoggedCalendarDay: AverageMetric | null
  averageIncomePerFullyLoggedCalendarDayReason: string | null
  bestRecordedDays: DayIncomeRecord[] | null
  worstRecordedDays: DayIncomeRecord[] | null
  eligibleDayCount: number
  noWorkDayCount: number
  incompleteDayCount: number
  missingDayCount: number
  firstEligibleDate: LocalDate | null
  lastEligibleDate: LocalDate | null
  bestEqualsWorst: boolean
  bestRecordedDayLabel: string
  worstRecordedDayLabel: string
}

/**
 * Pure function to calculate daily average income metrics, baseline period, and best/worst days.
 * - Categorizes each day in [startDate, endDate] as complete, no_work, incomplete, or missing.
 * - Missing and incomplete days are never counted as zero.
 * - Complete days with 0 income count as valid workdays.
 * - Reuses calculateDailySeries from summary.ts to leverage existing transaction validation.
 */
export function calculateDailyAverages(
  inputOrTransactions: DailyAveragesInput | Transaction[],
  dayLogsParam?: DayLog[],
  startDateParam?: LocalDate,
  endDateParam?: LocalDate,
  todayParam?: LocalDate,
): DailyAveragesResult {
  const input: DailyAveragesInput = Array.isArray(inputOrTransactions)
    ? {
        transactions: inputOrTransactions,
        dayLogs: dayLogsParam ?? [],
        startDate: startDateParam!,
        endDate: endDateParam!,
        today: todayParam!,
      }
    : inputOrTransactions

  const { transactions, dayLogs, startDate, endDate, today } = input

  validateDate(startDate, 'startDate')
  validateDate(endDate, 'endDate')
  validateDate(today, 'today')

  if (startDate > endDate) {
    throw new Error(`startDate (${startDate}) cannot be after endDate (${endDate})`)
  }

  // Validate dayLogs
  const dayLogsMap = new Map<LocalDate, DayStatus>()
  for (const log of dayLogs) {
    validateDate(log.date, 'DayLog date')
    if (log.status !== 'complete' && log.status !== 'no_work' && log.status !== 'incomplete') {
      throw new Error(`Invalid status for DayLog on ${log.date}: ${(log as { status: string }).status}`)
    }
    if (dayLogsMap.has(log.date)) {
      const existing = dayLogsMap.get(log.date)!
      if (existing !== log.status) {
        throw new Error(
          `Conflicting DayLog status for date ${log.date}: received '${existing}' and '${log.status}'`,
        )
      }
    }
    dayLogsMap.set(log.date, log.status)
  }

  // Reuse calculateDailySeries from summary.ts to aggregate and validate transactions
  const dailySeries = calculateDailySeries(transactions, { startDate, endDate })

  const completeWorkdays: DayIncomeRecord[] = []
  let noWorkDayCount = 0
  let incompleteDayCount = 0
  let missingDayCount = 0

  for (const day of dailySeries) {
    const rawStatus = dayLogsMap.get(day.date)

    // Determine category based on agreed rules:
    // 1. Any day on or after today that isn't complete is incomplete.
    // 2. A day before today with status 'complete' is complete.
    // 3. A day before today with status 'no_work' is no_work.
    // 4. A day before today with status 'incomplete' is incomplete.
    // 5. A day before today with no entry in dayLogs is missing.
    let category: 'complete' | 'no_work' | 'incomplete' | 'missing'

    if (day.date >= today) {
      if (rawStatus === 'complete') {
        category = 'complete'
      } else {
        category = 'incomplete'
      }
    } else {
      if (rawStatus === 'complete') {
        category = 'complete'
      } else if (rawStatus === 'no_work') {
        category = 'no_work'
      } else if (rawStatus === 'incomplete') {
        category = 'incomplete'
      } else {
        category = 'missing'
      }
    }

    // Decision on transactions on missing days:
    // Decision: Throw an error when transactions exist on a missing day.
    // Unlogged past days with recorded financial transactions indicate unclassified activity
    // that must be explicitly acknowledged in DayLog (as 'complete' or 'incomplete') before computing averages.
    if (category === 'missing') {
      const hasTxOnDate = transactions.some((tx) => tx.date === day.date)
      if (hasTxOnDate) {
        throw new Error(
          `Transaction found on missing day ${day.date}: days with transactions must have an explicit DayLog entry`,
        )
      }
    }

    // Validate that a no_work day has no income transactions
    if (category === 'no_work' && day.incomePaise > 0) {
      throw new Error(
        `Day ${day.date} is marked as no_work but has income transactions totaling ${day.incomePaise} paise`,
      )
    }

    switch (category) {
      case 'complete':
        completeWorkdays.push({ date: day.date, incomePaise: day.incomePaise })
        break
      case 'no_work':
        noWorkDayCount++
        break
      case 'incomplete':
        incompleteDayCount++
        break
      case 'missing':
        missingDayCount++
        break
    }
  }

  const eligibleDayCount = completeWorkdays.length
  const totalCompleteIncomePaise = completeWorkdays.reduce((sum, d) => sum + d.incomePaise, 0)
  const fullyLoggedDayCount = eligibleDayCount + noWorkDayCount

  // Average per recorded workday
  const averageIncomePerRecordedWorkday: AverageMetric | null =
    eligibleDayCount > 0
      ? {
          averagePaise: Math.round(totalCompleteIncomePaise / eligibleDayCount),
          totalIncomePaise: totalCompleteIncomePaise,
          dayCount: eligibleDayCount,
          label: 'Average per recorded workday',
        }
      : null

  const averageIncomePerRecordedWorkdayReason =
    eligibleDayCount === 0 ? 'No complete workdays recorded in the selected period' : null

  // Average per fully logged calendar day
  const averageIncomePerFullyLoggedCalendarDay: AverageMetric | null =
    fullyLoggedDayCount > 0
      ? {
          averagePaise: Math.round(totalCompleteIncomePaise / fullyLoggedDayCount),
          totalIncomePaise: totalCompleteIncomePaise,
          dayCount: fullyLoggedDayCount,
          label: 'Average per fully logged calendar day',
        }
      : null

  const averageIncomePerFullyLoggedCalendarDayReason =
    fullyLoggedDayCount === 0
      ? 'No fully logged calendar days (complete or no-work) recorded in the selected period'
      : null

  // Best and worst days compared across complete workdays only
  let bestRecordedDays: DayIncomeRecord[] | null = null
  let worstRecordedDays: DayIncomeRecord[] | null = null
  let bestEqualsWorst = false

  if (eligibleDayCount > 0) {
    const incomes = completeWorkdays.map((d) => d.incomePaise)
    const maxIncome = Math.max(...incomes)
    const minIncome = Math.min(...incomes)

    bestRecordedDays = completeWorkdays
      .filter((d) => d.incomePaise === maxIncome)
      .sort((a, b) => a.date.localeCompare(b.date))

    worstRecordedDays = completeWorkdays
      .filter((d) => d.incomePaise === minIncome)
      .sort((a, b) => a.date.localeCompare(b.date))

    bestEqualsWorst = eligibleDayCount === 1 || maxIncome === minIncome
  }

  const firstEligibleDate = eligibleDayCount > 0 ? completeWorkdays[0].date : null
  const lastEligibleDate = eligibleDayCount > 0 ? completeWorkdays[eligibleDayCount - 1].date : null

  return {
    averageIncomePerRecordedWorkday,
    averageIncomePerRecordedWorkdayReason,
    averageIncomePerFullyLoggedCalendarDay,
    averageIncomePerFullyLoggedCalendarDayReason,
    bestRecordedDays,
    worstRecordedDays,
    eligibleDayCount,
    noWorkDayCount,
    incompleteDayCount,
    missingDayCount,
    firstEligibleDate,
    lastEligibleDate,
    bestEqualsWorst,
    bestRecordedDayLabel: 'best recorded day',
    worstRecordedDayLabel: 'worst recorded day',
  }
}
