import { describe, expect, it } from 'vitest'
import { getAnalysisRange, getTodayIST, loadFinancialAnalysis } from './financialAnalysis'
import type { Profile } from '../types'
import type { StorageService, TransactionRecord } from './storage'

const transaction = (id: string, date: string, type: 'income' | 'expense', amountPaise: number, profileId = 'profile-demo-1'): TransactionRecord => ({
  id, date, type, amountPaise, profileId, paymentMode: 'cash', category: type === 'income' ? 'other' : 'food',
})
function service(records: TransactionRecord[], profile: Profile | null = null): Pick<StorageService, 'getProfile' | 'getTransactions'> {
  return { getProfile: async () => profile, getTransactions: async () => records }
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
    await expect(loadFinancialAnalysis('week', '2026-11-14', { getProfile: async () => null, getTransactions: async () => { throw new Error('Storage failed') } })).rejects.toThrow('Storage failed')
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
