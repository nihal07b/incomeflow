import { describe, expect, it } from 'vitest'
import type { DayLog, Transaction } from '../types'
import { calculateDailyAverages } from './dailyAverages'

describe('daily averages, baseline calculations and best/worst days', () => {
  it('Mon 80000 complete, Tue 120000 complete, Wed missing: average per recorded workday is 100000 (not 66667), eligible days 2, missing days 1', () => {
    // Arithmetic:
    // Mon (2026-11-02): complete, income 80,000 paise (₹800)
    // Tue (2026-11-03): complete, income 120,000 paise (₹1,200)
    // Wed (2026-11-04): missing (no DayLog entry)
    // Today: 2026-11-05
    //
    // Complete workdays: 2 (Mon, Tue)
    // Total income on complete days = 80,000 + 120,000 = 200,000 paise
    // Average per recorded workday = 200,000 ÷ 2 = 100,000 paise (₹1,000)
    // Missing day Wed is NOT counted as zero, so it is NOT 200,000 ÷ 3 = 66,667 paise
    // eligibleDayCount = 2, missingDayCount = 1, noWorkDayCount = 0, incompleteDayCount = 0
    const transactions: Transaction[] = [
      { id: 'tx-mon', date: '2026-11-02', amountPaise: 80000, type: 'income', category: 'shift' },
      { id: 'tx-tue', date: '2026-11-03', amountPaise: 120000, type: 'income', category: 'shift' },
    ]

    const dayLogs: DayLog[] = [
      { date: '2026-11-02', status: 'complete' },
      { date: '2026-11-03', status: 'complete' },
      // 2026-11-04 is missing
    ]

    const result = calculateDailyAverages({
      transactions,
      dayLogs,
      startDate: '2026-11-02',
      endDate: '2026-11-04',
      today: '2026-11-05',
    })

    expect(result.eligibleDayCount).toBe(2)
    expect(result.missingDayCount).toBe(1)
    expect(result.noWorkDayCount).toBe(0)
    expect(result.incompleteDayCount).toBe(0)

    expect(result.averageIncomePerRecordedWorkday).toEqual({
      averagePaise: 100000,
      totalIncomePaise: 200000,
      dayCount: 2,
      label: 'Average per recorded workday',
    })

    expect(result.firstEligibleDate).toBe('2026-11-02')
    expect(result.lastEligibleDate).toBe('2026-11-03')
  })

  it('Add Thu as no_work: average per recorded workday stays 100000; average per fully logged calendar day is 200000 ÷ 3 = 66667 (rounded half up)', () => {
    // Arithmetic:
    // Mon (2026-11-02): complete, income 80,000 paise
    // Tue (2026-11-03): complete, income 120,000 paise
    // Wed (2026-11-04): missing
    // Thu (2026-11-05): no_work, income 0 paise (confirmed rest day)
    // Today: 2026-11-06
    //
    // Complete workdays: 2 (Mon, Tue)
    // Sum of income on complete workdays = 80,000 + 120,000 = 200,000 paise
    // Average per recorded workday = 200,000 ÷ 2 = 100,000 paise
    //
    // Fully logged calendar days: 2 complete + 1 no_work = 3 days
    // Sum of income on fully logged calendar days = 200,000 + 0 = 200,000 paise
    // Average per fully logged calendar day = 200,000 ÷ 3 = 66,666.666... ≈ 66,667 paise (round half up)
    const transactions: Transaction[] = [
      { id: 'tx-mon', date: '2026-11-02', amountPaise: 80000, type: 'income', category: 'shift' },
      { id: 'tx-tue', date: '2026-11-03', amountPaise: 120000, type: 'income', category: 'shift' },
    ]

    const dayLogs: DayLog[] = [
      { date: '2026-11-02', status: 'complete' },
      { date: '2026-11-03', status: 'complete' },
      { date: '2026-11-05', status: 'no_work' },
    ]

    const result = calculateDailyAverages({
      transactions,
      dayLogs,
      startDate: '2026-11-02',
      endDate: '2026-11-05',
      today: '2026-11-06',
    })

    expect(result.eligibleDayCount).toBe(2)
    expect(result.noWorkDayCount).toBe(1)
    expect(result.missingDayCount).toBe(1)

    // Average per recorded workday stays 100000
    expect(result.averageIncomePerRecordedWorkday).toEqual({
      averagePaise: 100000,
      totalIncomePaise: 200000,
      dayCount: 2,
      label: 'Average per recorded workday',
    })

    // Average per fully logged calendar day is 200000 ÷ 3 = 66667
    expect(result.averageIncomePerFullyLoggedCalendarDay).toEqual({
      averagePaise: 66667,
      totalIncomePaise: 200000,
      dayCount: 3,
      label: 'Average per fully logged calendar day',
    })
  })

  it('Today (incomplete) with some income logged is excluded from both averages and from best/worst', () => {
    // Arithmetic:
    // Mon (2026-11-02): complete, income 100,000 paise
    // Tue (2026-11-03 = today): incomplete, income 50,000 paise logged
    // Today is ongoing/incomplete, so its 50,000 income must NOT dilute the baseline
    // Eligible complete days: 1 (Mon)
    // Average per recorded workday = 100,000 ÷ 1 = 100,000 paise
    // Average per fully logged calendar day = 100,000 ÷ 1 = 100,000 paise
    // Best day: Mon (100,000 paise)
    // Worst day: Mon (100,000 paise)
    // Today is excluded from best/worst and incompleteDayCount = 1
    const transactions: Transaction[] = [
      { id: 'tx-mon', date: '2026-11-02', amountPaise: 100000, type: 'income', category: 'shift' },
      { id: 'tx-tue-ongoing', date: '2026-11-03', amountPaise: 50000, type: 'income', category: 'shift' },
    ]

    const dayLogs: DayLog[] = [
      { date: '2026-11-02', status: 'complete' },
      { date: '2026-11-03', status: 'incomplete' },
    ]

    const result = calculateDailyAverages({
      transactions,
      dayLogs,
      startDate: '2026-11-02',
      endDate: '2026-11-03',
      today: '2026-11-03',
    })

    expect(result.eligibleDayCount).toBe(1)
    expect(result.incompleteDayCount).toBe(1)
    expect(result.averageIncomePerRecordedWorkday?.averagePaise).toBe(100000)
    expect(result.averageIncomePerFullyLoggedCalendarDay?.averagePaise).toBe(100000)

    expect(result.bestRecordedDays).toEqual([{ date: '2026-11-02', incomePaise: 100000 }])
    expect(result.worstRecordedDays).toEqual([{ date: '2026-11-02', incomePaise: 100000 }])
    expect(result.bestEqualsWorst).toBe(true)
  })

  it('Ties: two days with equal best income are both returned', () => {
    // Arithmetic:
    // Mon (2026-11-02): complete, 120,000 paise
    // Tue (2026-11-03): complete, 120,000 paise
    // Wed (2026-11-04): complete, 90,000 paise
    // Max income = 120,000 paise (tied on Mon and Tue)
    // Min income = 90,000 paise (Wed)
    // bestRecordedDays returns both Mon and Tue, sorted chronologically
    // worstRecordedDays returns Wed
    const transactions: Transaction[] = [
      { id: 'tx-mon', date: '2026-11-02', amountPaise: 120000, type: 'income', category: 'shift' },
      { id: 'tx-tue', date: '2026-11-03', amountPaise: 120000, type: 'income', category: 'shift' },
      { id: 'tx-wed', date: '2026-11-04', amountPaise: 90000, type: 'income', category: 'shift' },
    ]

    const dayLogs: DayLog[] = [
      { date: '2026-11-02', status: 'complete' },
      { date: '2026-11-03', status: 'complete' },
      { date: '2026-11-04', status: 'complete' },
    ]

    const result = calculateDailyAverages({
      transactions,
      dayLogs,
      startDate: '2026-11-02',
      endDate: '2026-11-04',
      today: '2026-11-05',
    })

    expect(result.bestRecordedDays).toEqual([
      { date: '2026-11-02', incomePaise: 120000 },
      { date: '2026-11-03', incomePaise: 120000 },
    ])
    expect(result.worstRecordedDays).toEqual([{ date: '2026-11-04', incomePaise: 90000 }])
    expect(result.bestEqualsWorst).toBe(false)
  })

  it('Only one eligible day: best and worst are the same day and bestEqualsWorst is true', () => {
    // Arithmetic:
    // Mon (2026-11-02): complete, 95,000 paise
    // Only 1 eligible day, so max = min = 95,000
    // bestRecordedDays and worstRecordedDays both contain Mon
    // bestEqualsWorst is true
    const transactions: Transaction[] = [
      { id: 'tx-mon', date: '2026-11-02', amountPaise: 95000, type: 'income', category: 'shift' },
    ]

    const dayLogs: DayLog[] = [{ date: '2026-11-02', status: 'complete' }]

    const result = calculateDailyAverages({
      transactions,
      dayLogs,
      startDate: '2026-11-02',
      endDate: '2026-11-02',
      today: '2026-11-03',
    })

    expect(result.bestRecordedDays).toEqual([{ date: '2026-11-02', incomePaise: 95000 }])
    expect(result.worstRecordedDays).toEqual([{ date: '2026-11-02', incomePaise: 95000 }])
    expect(result.bestEqualsWorst).toBe(true)
  })

  it('No eligible days: averages and best/worst are null with eligibleDayCount 0', () => {
    // Wed (2026-11-04): missing
    // Thu (2026-11-05): incomplete
    // eligibleDayCount = 0
    // averages and best/worst are null
    const dayLogs: DayLog[] = [{ date: '2026-11-05', status: 'incomplete' }]

    const result = calculateDailyAverages({
      transactions: [],
      dayLogs,
      startDate: '2026-11-04',
      endDate: '2026-11-05',
      today: '2026-11-05',
    })

    expect(result.eligibleDayCount).toBe(0)
    expect(result.averageIncomePerRecordedWorkday).toBeNull()
    expect(result.averageIncomePerRecordedWorkdayReason).toBe(
      'No complete workdays recorded in the selected period',
    )
    expect(result.averageIncomePerFullyLoggedCalendarDay).toBeNull()
    expect(result.bestRecordedDays).toBeNull()
    expect(result.worstRecordedDays).toBeNull()
    expect(result.firstEligibleDate).toBeNull()
    expect(result.lastEligibleDate).toBeNull()
    expect(result.bestEqualsWorst).toBe(false)
  })

  it('A transaction on a missing day: throws an error per decided integrity policy', () => {
    // Decision test:
    // A transaction exists on Wed (2026-11-04), but Wed has no entry in dayLogs.
    // Our decided behavior is to throw an error so unlogged transactions are not processed unclassified.
    const transactions: Transaction[] = [
      { id: 'tx-stray', date: '2026-11-04', amountPaise: 50000, type: 'income', category: 'shift' },
    ]

    expect(() =>
      calculateDailyAverages({
        transactions,
        dayLogs: [],
        startDate: '2026-11-02',
        endDate: '2026-11-04',
        today: '2026-11-05',
      }),
    ).toThrow('Transaction found on missing day 2026-11-04')
  })

  it('Negative or non-integer amounts and malformed dates throw', () => {
    // Negative transaction amount
    expect(() =>
      calculateDailyAverages({
        transactions: [
          { id: 'tx-neg', date: '2026-11-02', amountPaise: -5000, type: 'income', category: 'shift' },
        ],
        dayLogs: [{ date: '2026-11-02', status: 'complete' }],
        startDate: '2026-11-02',
        endDate: '2026-11-02',
        today: '2026-11-03',
      }),
    ).toThrow('cannot be negative')

    // Fractional amount
    expect(() =>
      calculateDailyAverages({
        transactions: [
          { id: 'tx-frac', date: '2026-11-02', amountPaise: 5000.5, type: 'income', category: 'shift' },
        ],
        dayLogs: [{ date: '2026-11-02', status: 'complete' }],
        startDate: '2026-11-02',
        endDate: '2026-11-02',
        today: '2026-11-03',
      }),
    ).toThrow('must be integer paise')

    // Infinity amount
    expect(() =>
      calculateDailyAverages({
        transactions: [
          { id: 'tx-inf', date: '2026-11-02', amountPaise: Infinity, type: 'income', category: 'shift' },
        ],
        dayLogs: [{ date: '2026-11-02', status: 'complete' }],
        startDate: '2026-11-02',
        endDate: '2026-11-02',
        today: '2026-11-03',
      }),
    ).toThrow('must be integer paise')

    // Malformed today date
    expect(() =>
      calculateDailyAverages({
        transactions: [],
        dayLogs: [],
        startDate: '2026-11-02',
        endDate: '2026-11-02',
        today: '03-11-2026',
      }),
    ).toThrow('today must be formatted as YYYY-MM-DD')

    // Inverted date range
    expect(() =>
      calculateDailyAverages({
        transactions: [],
        dayLogs: [],
        startDate: '2026-11-05',
        endDate: '2026-11-02',
        today: '2026-11-06',
      }),
    ).toThrow('startDate (2026-11-05) cannot be after endDate (2026-11-02)')
  })

  it('A complete day with zero income is a valid workday that earned nothing and counts in the averages', () => {
    // Arithmetic:
    // Mon (2026-11-02): complete, 100,000 paise (₹1,000)
    // Tue (2026-11-03): complete, 0 paise (worked, but earned ₹0)
    // Today: 2026-11-05
    //
    // Both days are valid complete workdays: eligibleDayCount = 2
    // Sum of income = 100,000 + 0 = 100,000 paise
    // Average per recorded workday = 100,000 ÷ 2 = 50,000 paise (₹500)
    // Best day: Mon (100,000 paise)
    // Worst day: Tue (0 paise) - NOT missing day, but actual recorded 0-income workday
    const transactions: Transaction[] = [
      { id: 'tx-mon', date: '2026-11-02', amountPaise: 100000, type: 'income', category: 'shift' },
    ]

    const dayLogs: DayLog[] = [
      { date: '2026-11-02', status: 'complete' },
      { date: '2026-11-03', status: 'complete' }, // Zero income workday
    ]

    const result = calculateDailyAverages({
      transactions,
      dayLogs,
      startDate: '2026-11-02',
      endDate: '2026-11-03',
      today: '2026-11-05',
    })

    expect(result.eligibleDayCount).toBe(2)
    expect(result.averageIncomePerRecordedWorkday).toEqual({
      averagePaise: 50000,
      totalIncomePaise: 100000,
      dayCount: 2,
      label: 'Average per recorded workday',
    })

    expect(result.bestRecordedDays).toEqual([{ date: '2026-11-02', incomePaise: 100000 }])
    expect(result.worstRecordedDays).toEqual([{ date: '2026-11-03', incomePaise: 0 }])
    expect(result.bestEqualsWorst).toBe(false)
  })

  it('Validate that a no_work day has no income transactions and throws clear error otherwise', () => {
    const transactions: Transaction[] = [
      { id: 'tx-invalid-nowork', date: '2026-11-03', amountPaise: 30000, type: 'income', category: 'shift' },
    ]

    const dayLogs: DayLog[] = [
      { date: '2026-11-03', status: 'no_work' }, // Logged as no_work, but income exists!
    ]

    expect(() =>
      calculateDailyAverages({
        transactions,
        dayLogs,
        startDate: '2026-11-02',
        endDate: '2026-11-04',
        today: '2026-11-05',
      }),
    ).toThrow('Day 2026-11-03 is marked as no_work but has income transactions totaling 30000 paise')
  })

  it('All eligible days having the same income sets bestEqualsWorst to true', () => {
    // Arithmetic:
    // Mon: complete, 80,000 paise
    // Tue: complete, 80,000 paise
    // Both days have equal income, so bestEqualsWorst is true
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-11-02', amountPaise: 80000, type: 'income', category: 'shift' },
      { id: 'tx-2', date: '2026-11-03', amountPaise: 80000, type: 'income', category: 'shift' },
    ]

    const dayLogs: DayLog[] = [
      { date: '2026-11-02', status: 'complete' },
      { date: '2026-11-03', status: 'complete' },
    ]

    const result = calculateDailyAverages({
      transactions,
      dayLogs,
      startDate: '2026-11-02',
      endDate: '2026-11-03',
      today: '2026-11-05',
    })

    expect(result.bestRecordedDays).toEqual([
      { date: '2026-11-02', incomePaise: 80000 },
      { date: '2026-11-03', incomePaise: 80000 },
    ])
    expect(result.worstRecordedDays).toEqual([
      { date: '2026-11-02', incomePaise: 80000 },
      { date: '2026-11-03', incomePaise: 80000 },
    ])
    expect(result.bestEqualsWorst).toBe(true)
  })
})
