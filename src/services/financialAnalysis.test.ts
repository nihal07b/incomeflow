import { describe, expect, it } from 'vitest'
import { getAnalysisRange, getTodayIST, loadFinancialAnalysis } from './financialAnalysis'
import type { DayLog, Profile } from '../types'
import type { StorageService, TransactionRecord } from './storage'

const transaction = (id: string, date: string, type: 'income' | 'expense', amountPaise: number, profileId = 'profile-demo-1'): TransactionRecord => ({
  id, date, type, amountPaise, profileId, paymentMode: 'cash', category: type === 'income' ? 'other' : 'food',
})
function service(records: TransactionRecord[], profile: Profile | null = null, dayLogs: DayLog[] = []): Pick<StorageService, 'getProfile' | 'getTransactions' | 'getDayLogs'> {
  return { getProfile: async () => profile, getTransactions: async () => records, getDayLogs: async () => dayLogs }
}

describe('financial analysis adapter', () => {
  it('uses Monday-to-date and month-to-date inclusive boundaries', () => {
    expect(getAnalysisRange('week', '2026-11-14')).toEqual({ startDate: '2026-11-09', endDate: '2026-11-14' })
    expect(getAnalysisRange('week', '2026-11-09').startDate).toBe('2026-11-09')
    expect(getAnalysisRange('week', '2026-01-01').startDate).toBe('2025-12-29')
    expect(getAnalysisRange('month', '2026-11-14').startDate).toBe('2026-11-01')
  })
  it('uses IST for today even when UTC is on the previous day', () => {
    expect(getTodayIST(new Date('2026-11-13T20:00:00Z'))).toBe('2026-11-14')
  })
  it('rejects impossible calendar dates rather than normalizing them', () => {
    expect(() => getAnalysisRange('month', '2026-02-30')).toThrow()
    expect(() => getAnalysisRange('month', '')).toThrow()
  })
  it('delegates totals and categories to Member 4 and keeps period boundaries inclusive', async () => {
    const result = await loadFinancialAnalysis('week', '2026-11-14', service([
      transaction('a', '2026-11-09', 'income', 100000),
      transaction('b', '2026-11-14', 'expense', 20000),
      transaction('c', '2026-11-08', 'income', 50000),
      transaction('d', '2026-11-15', 'income', 70000),
    ]))
    expect(result.summary.periodIncomePaise).toBe(100000)
    expect(result.summary.periodExpensesPaise).toBe(20000)
    expect(result.summary.netRecordedCashFlowPaise).toBe(80000)
    expect(result.summary.expenseCategoryTotals).toEqual({ food: 20000 })
    expect(result.summary.dailySeries).toHaveLength(6)
    expect(result.recordedDates).toEqual(['2026-11-09', '2026-11-14'])
  })
  it('distinguishes no records from a recorded zero', async () => {
    const empty = await loadFinancialAnalysis('week', '2026-11-14', service([]))
    expect(empty.hasRecords).toBe(false)
    const zero = await loadFinancialAnalysis('week', '2026-11-14', service([transaction('zero', '2026-11-10', 'income', 0)]))
    expect(zero.hasRecords).toBe(true)
    expect(zero.recordedDates).toEqual(['2026-11-10'])
    expect(zero.summary.periodIncomePaise).toBe(0)
  })
  it('filters to the stored profile and never combines all profile records', async () => {
    const profile: Profile = { id: 'user-2', displayName: 'Test', language: 'en', currentCashPaise: 0, cashAsOfDate: '2026-11-14', essentialDailySpendPaise: 0, minimumCushionPaise: 0 }
    const result = await loadFinancialAnalysis('week', '2026-11-14', service([
      transaction('a', '2026-11-14', 'income', 10000),
      transaction('b', '2026-11-14', 'income', 20000, 'user-2'),
    ], profile))
    expect(result.summary.periodIncomePaise).toBe(20000)
    expect(result.profileId).toBe('user-2')
  })
  it('does not add repayments a second time or count duplicate transactions twice', async () => {
    const repayment = { ...transaction('r', '2026-11-14', 'income', 30000), repaymentId: 'repayment-1' }
    const result = await loadFinancialAnalysis('week', '2026-11-14', service([repayment, repayment]))
    expect(result.summary.periodIncomePaise).toBe(30000)
  })
  it('propagates storage failures without mock fallback', async () => {
    await expect(loadFinancialAnalysis('week', '2026-11-14', { getDayLogs: async () => [], getProfile: async () => null, getTransactions: async () => { throw new Error('Storage failed') } })).rejects.toThrow('Storage failed')
  })
  it('rejects invalid transaction dates', async () => {
    await expect(loadFinancialAnalysis('week', '2026-11-14', service([transaction('bad', '2026-02-30', 'income', 100)]))).rejects.toThrow()
  })
  it('uses a different complete result for each selected period', async () => {
    const source = service([transaction('old', '2026-11-02', 'income', 50000), transaction('new', '2026-11-14', 'income', 10000)])
    const week = await loadFinancialAnalysis('week', '2026-11-14', source)
    const month = await loadFinancialAnalysis('month', '2026-11-14', source)
    expect(week.summary.periodIncomePaise).toBe(10000)
    expect(month.summary.periodIncomePaise).toBe(60000)
  })
})

// Integration contracts: daily status must not replace transaction evidence.
describe('financial analysis with DayLogs', () => {
  const today = '2026-11-15'
  const load = (records: TransactionRecord[], logs: DayLog[], period: 'week' | 'month' = 'week') =>
    loadFinancialAnalysis(period, '2026-11-14', service(records, null, logs), today)

  it('ranks complete zero-income days and excludes no-work, incomplete and missing days', async () => {
    const result = await load([
      transaction('income', '2026-11-09', 'income', 100000),
      transaction('partial', '2026-11-12', 'income', 200000),
    ], [
      { date: '2026-11-09', status: 'complete' },
      { date: '2026-11-10', status: 'complete' },
      { date: '2026-11-11', status: 'no_work' },
      { date: '2026-11-12', status: 'incomplete' },
    ])
    expect(result.summary.periodIncomePaise).toBe(300000)
    expect(result.dayAnalysis.status).toBe('ready')
    if (result.dayAnalysis.status !== 'ready') throw new Error('Expected daily analysis')
    expect(result.dayAnalysis.result.bestRecordedDays).toEqual([{ date: '2026-11-09', incomePaise: 100000 }])
    expect(result.dayAnalysis.result.worstRecordedDays).toEqual([{ date: '2026-11-10', incomePaise: 0 }])
    expect(result.dayAnalysis.result).toMatchObject({ eligibleDayCount: 2, noWorkDayCount: 1, incompleteDayCount: 1, missingDayCount: 2 })
    expect(result.dayAnalysis.result.averageIncomePerRecordedWorkday?.averagePaise).toBe(50000)
  })

  it('shows a valid zero-ranked complete day even without transactions', async () => {
    const result = await load([], [{ date: '2026-11-09', status: 'complete' }])
    expect(result.hasRecords).toBe(false)
    expect(result.dayAnalysis.status).toBe('ready')
    if (result.dayAnalysis.status !== 'ready') throw new Error('Expected daily analysis')
    expect(result.dayAnalysis.result.bestRecordedDays).toEqual([{ date: '2026-11-09', incomePaise: 0 }])
    expect(result.dayAnalysis.result.bestEqualsWorst).toBe(true)
  })

  it('preserves missing-only days as unavailable rather than zero-ranked days', async () => {
    const result = await load([], [])
    if (result.dayAnalysis.status !== 'ready') throw new Error('Expected daily analysis')
    expect(result.dayAnalysis.result.bestRecordedDays).toBeNull()
    expect(result.dayAnalysis.result.averageIncomePerRecordedWorkday).toBeNull()
    expect(result.dayAnalysis.result.missingDayCount).toBe(6)
  })

  it('returns all tied dates and uses the selected range for rankings and totals', async () => {
    const records = [transaction('old', '2026-11-02', 'income', 90000), transaction('a', '2026-11-09', 'income', 10000), transaction('b', '2026-11-10', 'income', 10000)]
    const logs: DayLog[] = records.map(tx => ({ date: tx.date, status: 'complete' }))
    const week = await load(records, logs)
    const month = await load(records, logs, 'month')
    if (week.dayAnalysis.status !== 'ready' || month.dayAnalysis.status !== 'ready') throw new Error('Expected daily analysis')
    expect(week.summary.periodIncomePaise).toBe(20000)
    expect(week.dayAnalysis.result.bestRecordedDays?.map(d => d.date)).toEqual(['2026-11-09', '2026-11-10'])
    expect(week.dayAnalysis.result.bestEqualsWorst).toBe(true)
    expect(month.summary.periodIncomePaise).toBe(110000)
    expect(month.dayAnalysis.result.bestRecordedDays?.[0].date).toBe('2026-11-02')
    expect(week.dayStatuses['2026-11-02']).toBeUndefined()
  })

  it('keeps transaction totals available when a past transaction lacks a daily status', async () => {
    const result = await load([transaction('a', '2026-11-09', 'income', 10000)], [])
    expect(result.summary.periodIncomePaise).toBe(10000)
    expect(result.dayAnalysis.status).toBe('error')
    if (result.dayAnalysis.status === 'error') expect(result.dayAnalysis.message).toContain('missing day')
  })

  it('keeps totals available when DayLog storage fails', async () => {
    const source = { ...service([transaction('a', '2026-11-09', 'income', 10000)]), getDayLogs: async (): Promise<DayLog[]> => { throw new Error('DayLog read failed') } }
    const result = await loadFinancialAnalysis('week', '2026-11-14', source, today)
    expect(result.summary.periodIncomePaise).toBe(10000)
    expect(result.dayAnalysis).toEqual({ status: 'error', message: 'DayLog read failed' })
  })

  it('surfaces contradictory no-work income without hiding ledger totals', async () => {
    const result = await load([transaction('a', '2026-11-09', 'income', 10000)], [{ date: '2026-11-09', status: 'no_work' }])
    expect(result.summary.periodIncomePaise).toBe(10000)
    expect(result.dayAnalysis.status).toBe('error')
  })

  it('keeps the engine rule for today and rejects future ranges', async () => {
    const source = service([], null, [{ date: today, status: 'no_work' }])
    const result = await loadFinancialAnalysis('week', today, source, today)
    if (result.dayAnalysis.status !== 'ready') throw new Error('Expected daily analysis')
    expect(result.dayAnalysis.result.incompleteDayCount).toBe(1)
    expect(result.dayAnalysis.result.noWorkDayCount).toBe(0)
    await expect(loadFinancialAnalysis('week', '2026-11-16', source, today)).rejects.toThrow('future')
  })

  it('reads persisted shared-store transactions and updated statuses across reloads', async () => {
    const { LocalStorageService, createMemoryStorageBackend } = await import('./storage')
    const { DataStore } = await import('./dataStore')
    const backend = createMemoryStorageBackend()
    const storage = new LocalStorageService(backend)
    const store = new DataStore(storage)
    await store.init()
    await store.addTransaction({ ...transaction('saved', '2026-11-09', 'income', 100000), category: 'delivery earnings' })
    await store.upsertDayLog({ date: '2026-11-09', status: 'complete' })
    const reloaded = new LocalStorageService(backend)
    const complete = await loadFinancialAnalysis('week', '2026-11-14', reloaded, today)
    if (complete.dayAnalysis.status !== 'ready') throw new Error('Expected daily analysis')
    expect(complete.dayAnalysis.result.bestRecordedDays).toEqual([{ date: '2026-11-09', incomePaise: 100000 }])
    await store.upsertDayLog({ date: '2026-11-09', status: 'incomplete' })
    const incomplete = await loadFinancialAnalysis('week', '2026-11-14', reloaded, today)
    expect(incomplete.summary.periodIncomePaise).toBe(100000)
    if (incomplete.dayAnalysis.status !== 'ready') throw new Error('Expected daily analysis')
    expect(incomplete.dayAnalysis.result.bestRecordedDays).toBeNull()
  })
})
