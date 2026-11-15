import { describe, expect, it } from 'vitest'
import { loadFinancialAnalysis } from '../services/financialAnalysis'
import type { StorageService, TransactionRecord } from '../services/storage'
import type { DayLog, Profile } from '../types'
import { calculateTransactionSummary, filterTransactions } from './transactions'

// Reused helper from src/services/financialAnalysis.test.ts, with optional paymentMode & category support
const transaction = (
  id: string,
  date: string,
  type: 'income' | 'expense',
  amountPaise: number,
  profileId = 'profile-demo-1',
  paymentMode: 'cash' | 'digital' = 'cash',
  category: TransactionRecord['category'] = type === 'income' ? 'other income' : 'food',
): TransactionRecord => ({
  id,
  date,
  type,
  amountPaise,
  profileId,
  paymentMode,
  category,
})

// Reused helper from src/services/financialAnalysis.test.ts
function service(
  records: TransactionRecord[],
  profile: Profile | null = null,
  dayLogs: DayLog[] = [],
): Pick<StorageService, 'getProfile' | 'getTransactions' | 'getDayLogs'> {
  return {
    getProfile: async () => profile,
    getTransactions: async () => records,
    getDayLogs: async () => dayLogs,
  }
}

// Deduplicates records by ID (ignoring exact duplicate IDs)
function dedupeById(records: TransactionRecord[]): TransactionRecord[] {
  const seen = new Set<string>()
  return records.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })
}

// Filters records to the target profile and date range after deduplicating
function prepareRecordsForComparison(
  records: TransactionRecord[],
  profileId: string,
  startDate: string,
  endDate: string,
): TransactionRecord[] {
  const deduped = dedupeById(records)
  return filterTransactions(deduped, { startDate, endDate }).filter(
    (r) => r.profileId === profileId,
  )
}

describe('summary agreement: loadFinancialAnalysis vs calculateTransactionSummary', () => {
  const period = 'week'
  const endDate = '2026-11-14' // Saturday
  const startDate = '2026-11-09' // Monday
  const defaultProfileId = 'profile-demo-1'

  it('agrees on normal mix of income and expenses across cash and digital', async () => {
    // Arithmetic & Hand Calculations:
    // Period: 2026-11-09 to 2026-11-14
    // Records:
    // - t1 (2026-11-10): income 120,000 paise (₹1,200), digital
    // - t2 (2026-11-10): expense 30,000 paise (₹300), cash
    // - t3 (2026-11-11): income 80,000 paise (₹800), cash
    // - t4 (2026-11-12): expense 25,000 paise (₹250), digital
    // - t1 duplicate: exact duplicate of t1 (should be counted once)
    //
    // Deduplicated Totals:
    // Total Income: 120,000 (digital) + 80,000 (cash) = 200,000 paise (₹2,000)
    // Total Expenses: 30,000 (cash) + 25,000 (digital) = 55,000 paise (₹550)
    // Net Cash Flow: 200,000 - 55,000 = 145,000 paise (+₹1,450)
    // Cash Income: 80,000 paise; Digital Income: 120,000 paise -> sum = 200,000 paise
    // Cash Expense: 30,000 paise; Digital Expense: 25,000 paise -> sum = 55,000 paise
    const records: TransactionRecord[] = [
      transaction('t1', '2026-11-10', 'income', 120000, defaultProfileId, 'digital', 'delivery earnings'),
      transaction('t2', '2026-11-10', 'expense', 30000, defaultProfileId, 'cash', 'fuel'),
      transaction('t3', '2026-11-11', 'income', 80000, defaultProfileId, 'cash', 'other income'),
      transaction('t4', '2026-11-12', 'expense', 25000, defaultProfileId, 'digital', 'food'),
      transaction('t1', '2026-11-10', 'income', 120000, defaultProfileId, 'digital', 'delivery earnings'), // Duplicate
    ]

    const analysis = await loadFinancialAnalysis(period, endDate, service(records))
    const filteredRecords = prepareRecordsForComparison(records, defaultProfileId, startDate, endDate)
    const txSummary = calculateTransactionSummary(filteredRecords)

    expect(analysis.summary.periodIncomePaise).toBe(200000)
    expect(analysis.summary.periodExpensesPaise).toBe(55000)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(145000)

    expect(analysis.summary.periodIncomePaise).toBe(txSummary.totalIncomePaise)
    expect(analysis.summary.periodExpensesPaise).toBe(txSummary.totalExpensePaise)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(txSummary.netCashFlowPaise)

    // Cash + digital splits add up to the same totals
    expect(txSummary.cashIncomePaise + txSummary.digitalIncomePaise).toBe(analysis.summary.periodIncomePaise)
    expect(txSummary.cashExpensePaise + txSummary.digitalExpensePaise).toBe(analysis.summary.periodExpensesPaise)
    expect(
      txSummary.cashIncomePaise + txSummary.digitalIncomePaise -
      (txSummary.cashExpensePaise + txSummary.digitalExpensePaise)
    ).toBe(analysis.summary.netRecordedCashFlowPaise)
  })

  it('agrees on empty records', async () => {
    // Arithmetic & Hand Calculations:
    // Empty transaction list -> all totals and splits are 0 paise
    const records: TransactionRecord[] = []

    const analysis = await loadFinancialAnalysis(period, endDate, service(records))
    const filteredRecords = prepareRecordsForComparison(records, defaultProfileId, startDate, endDate)
    const txSummary = calculateTransactionSummary(filteredRecords)

    expect(analysis.summary.periodIncomePaise).toBe(0)
    expect(analysis.summary.periodExpensesPaise).toBe(0)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(0)

    expect(analysis.summary.periodIncomePaise).toBe(txSummary.totalIncomePaise)
    expect(analysis.summary.periodExpensesPaise).toBe(txSummary.totalExpensePaise)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(txSummary.netCashFlowPaise)

    expect(txSummary.cashIncomePaise + txSummary.digitalIncomePaise).toBe(0)
    expect(txSummary.cashExpensePaise + txSummary.digitalExpensePaise).toBe(0)
  })

  it('agrees on only income records', async () => {
    // Arithmetic & Hand Calculations:
    // - inc-1 (2026-11-10): 150,000 paise (₹1,500), cash
    // - inc-2 (2026-11-12): 90,000 paise (₹900), digital
    // - inc-2 duplicate: exact duplicate
    //
    // Deduplicated Totals:
    // Total Income = 150,000 + 90,000 = 240,000 paise (₹2,400)
    // Total Expenses = 0 paise
    // Net Cash Flow = 240,000 - 0 = 240,000 paise
    // Cash Income = 150,000; Digital Income = 90,000 -> sum = 240,000 paise
    // Cash Expense = 0; Digital Expense = 0 -> sum = 0 paise
    const records: TransactionRecord[] = [
      transaction('inc-1', '2026-11-10', 'income', 150000, defaultProfileId, 'cash', 'delivery earnings'),
      transaction('inc-2', '2026-11-12', 'income', 90000, defaultProfileId, 'digital', 'other income'),
      transaction('inc-2', '2026-11-12', 'income', 90000, defaultProfileId, 'digital', 'other income'), // Duplicate
    ]

    const analysis = await loadFinancialAnalysis(period, endDate, service(records))
    const filteredRecords = prepareRecordsForComparison(records, defaultProfileId, startDate, endDate)
    const txSummary = calculateTransactionSummary(filteredRecords)

    expect(analysis.summary.periodIncomePaise).toBe(240000)
    expect(analysis.summary.periodExpensesPaise).toBe(0)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(240000)

    expect(analysis.summary.periodIncomePaise).toBe(txSummary.totalIncomePaise)
    expect(analysis.summary.periodExpensesPaise).toBe(txSummary.totalExpensePaise)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(txSummary.netCashFlowPaise)

    expect(txSummary.cashIncomePaise + txSummary.digitalIncomePaise).toBe(analysis.summary.periodIncomePaise)
    expect(txSummary.cashExpensePaise + txSummary.digitalExpensePaise).toBe(analysis.summary.periodExpensesPaise)
  })

  it('agrees on only expense records', async () => {
    // Arithmetic & Hand Calculations:
    // - exp-1 (2026-11-10): 40,000 paise (₹400), cash
    // - exp-2 (2026-11-11): 60,000 paise (₹600), digital
    // - exp-1 duplicate: exact duplicate
    //
    // Deduplicated Totals:
    // Total Income = 0 paise
    // Total Expenses = 40,000 + 60,000 = 100,000 paise (₹1,000)
    // Net Cash Flow = 0 - 100,000 = -100,000 paise (-₹1,000)
    // Cash Expense = 40,000; Digital Expense = 60,000 -> sum = 100,000 paise
    const records: TransactionRecord[] = [
      transaction('exp-1', '2026-11-10', 'expense', 40000, defaultProfileId, 'cash', 'fuel'),
      transaction('exp-2', '2026-11-11', 'expense', 60000, defaultProfileId, 'digital', 'maintenance'),
      transaction('exp-1', '2026-11-10', 'expense', 40000, defaultProfileId, 'cash', 'fuel'), // Duplicate
    ]

    const analysis = await loadFinancialAnalysis(period, endDate, service(records))
    const filteredRecords = prepareRecordsForComparison(records, defaultProfileId, startDate, endDate)
    const txSummary = calculateTransactionSummary(filteredRecords)

    expect(analysis.summary.periodIncomePaise).toBe(0)
    expect(analysis.summary.periodExpensesPaise).toBe(100000)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(-100000)

    expect(analysis.summary.periodIncomePaise).toBe(txSummary.totalIncomePaise)
    expect(analysis.summary.periodExpensesPaise).toBe(txSummary.totalExpensePaise)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(txSummary.netCashFlowPaise)

    expect(txSummary.cashExpensePaise + txSummary.digitalExpensePaise).toBe(analysis.summary.periodExpensesPaise)
    expect(txSummary.cashIncomePaise + txSummary.digitalIncomePaise).toBe(0)
  })

  it('agrees when expenses are larger than income (deficit scenario)', async () => {
    // Arithmetic & Hand Calculations:
    // - tx-inc (2026-11-10): 45,000 paise (₹450), cash
    // - tx-exp-1 (2026-11-10): 70,000 paise (₹700), cash
    // - tx-exp-2 (2026-11-11): 50,000 paise (₹500), digital
    //
    // Deduplicated Totals:
    // Total Income = 45,000 paise (Cash: 45,000, Digital: 0)
    // Total Expenses = 70,000 + 50,000 = 120,000 paise (Cash: 70,000, Digital: 50,000)
    // Net Cash Flow = 45,000 - 120,000 = -75,000 paise (-₹750)
    // Cash Income + Digital Income = 45,000 + 0 = 45,000 paise
    // Cash Expense + Digital Expense = 70,000 + 50,000 = 120,000 paise
    const records: TransactionRecord[] = [
      transaction('tx-inc', '2026-11-10', 'income', 45000, defaultProfileId, 'cash', 'delivery earnings'),
      transaction('tx-exp-1', '2026-11-10', 'expense', 70000, defaultProfileId, 'cash', 'fuel'),
      transaction('tx-exp-2', '2026-11-11', 'expense', 50000, defaultProfileId, 'digital', 'maintenance'),
    ]

    const analysis = await loadFinancialAnalysis(period, endDate, service(records))
    const filteredRecords = prepareRecordsForComparison(records, defaultProfileId, startDate, endDate)
    const txSummary = calculateTransactionSummary(filteredRecords)

    expect(analysis.summary.periodIncomePaise).toBe(45000)
    expect(analysis.summary.periodExpensesPaise).toBe(120000)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(-75000)

    expect(analysis.summary.periodIncomePaise).toBe(txSummary.totalIncomePaise)
    expect(analysis.summary.periodExpensesPaise).toBe(txSummary.totalExpensePaise)
    expect(analysis.summary.netRecordedCashFlowPaise).toBe(txSummary.netCashFlowPaise)

    expect(txSummary.cashIncomePaise + txSummary.digitalIncomePaise).toBe(45000)
    expect(txSummary.cashExpensePaise + txSummary.digitalExpensePaise).toBe(120000)
    expect(
      txSummary.cashIncomePaise + txSummary.digitalIncomePaise -
      (txSummary.cashExpensePaise + txSummary.digitalExpensePaise)
    ).toBe(-75000)
  })
})

describe('period vs all-time comparison', () => {
  it('shows all-time calculateTransactionSummary differs from one-day period total as expected', async () => {
    // Arithmetic & Hand Calculations:
    // Three dates:
    // - Date 1 (2026-11-02, previous week): income 50,000 paise (₹500)
    // - Date 2 (2026-11-09, Monday of target week): income 80,000 paise (₹800)
    // - Date 3 (2026-11-10, Tuesday of target week): income 70,000 paise (₹700)
    //
    // All-time calculateTransactionSummary:
    // Sums all 3 dates: 50,000 + 80,000 + 70,000 = 200,000 paise (₹2,000)
    //
    // One-day period loadFinancialAnalysis('week', '2026-11-09'):
    // Week starting Monday ending Monday 2026-11-09 has startDate = '2026-11-09', endDate = '2026-11-09'.
    // Only includes Date 2 (2026-11-09): 80,000 paise (₹800)
    //
    // The difference (200,000 vs 80,000) is expected because calculateTransactionSummary is all-time,
    // whereas loadFinancialAnalysis enforces the period boundary.
    const records: TransactionRecord[] = [
      transaction('d1', '2026-11-02', 'income', 50000),
      transaction('d2', '2026-11-09', 'income', 80000),
      transaction('d3', '2026-11-10', 'income', 70000),
    ]

    // One-day period (Monday 2026-11-09 to Monday 2026-11-09)
    const singleDayAnalysis = await loadFinancialAnalysis('week', '2026-11-09', service(records), '2026-11-14')
    expect(singleDayAnalysis.startDate).toBe('2026-11-09')
    expect(singleDayAnalysis.endDate).toBe('2026-11-09')
    expect(singleDayAnalysis.summary.periodIncomePaise).toBe(80000)

    // All-time calculateTransactionSummary
    const allTimeSummary = calculateTransactionSummary(records)
    expect(allTimeSummary.totalIncomePaise).toBe(200000)

    // Explicitly verify the expected difference
    expect(allTimeSummary.totalIncomePaise).not.toBe(singleDayAnalysis.summary.periodIncomePaise)
    expect(allTimeSummary.totalIncomePaise - singleDayAnalysis.summary.periodIncomePaise).toBe(120000)
  })
})

describe('loadFinancialAnalysis bad data rejection', () => {
  it('rejects negative transaction amounts', async () => {
    const badRecord = transaction('bad-neg', '2026-11-10', 'expense', -5000)
    await expect(
      loadFinancialAnalysis('week', '2026-11-14', service([badRecord])),
    ).rejects.toThrow('cannot be negative')
  })

  it('rejects fractional transaction amounts', async () => {
    const badRecord = transaction('bad-frac', '2026-11-10', 'income', 100.5)
    await expect(
      loadFinancialAnalysis('week', '2026-11-14', service([badRecord])),
    ).rejects.toThrow('must be integer paise')
  })

  it('rejects unknown transaction types', async () => {
    const badRecord = {
      ...transaction('bad-type', '2026-11-10', 'income', 5000),
      type: 'transfer' as unknown as 'income',
    }
    await expect(
      loadFinancialAnalysis('week', '2026-11-14', service([badRecord])),
    ).rejects.toThrow('Unsupported transaction type')
  })

  it('rejects conflicting duplicate IDs with different amounts', async () => {
    const records = [
      transaction('tx-conflict', '2026-11-10', 'income', 50000),
      transaction('tx-conflict', '2026-11-10', 'income', 60000),
    ]
    await expect(
      loadFinancialAnalysis('week', '2026-11-14', service(records)),
    ).rejects.toThrow('shares an ID with an existing transaction but has different content')
  })
})

describe('calculateTransactionSummary current behaviour on bad data', () => {
  it('records current behaviour: calculateTransactionSummary does not validate or reject bad data (negative, fractional, unknown type, conflicting IDs)', () => {
    // Current behavior documentation:
    // Unlike loadFinancialAnalysis (which validates integer paise, non-negativity, known types,
    // and ID consistency), calculateTransactionSummary is a simple reducer that:
    // 1. Accepts negative amounts and adds them directly into totals
    // 2. Accepts fractional numbers without rounding or throwing
    // 3. Treats any type !== 'income' (including 'transfer' or unknown types) as an expense
    // 4. Sums all items blindly without checking for duplicate or conflicting IDs

    // 1. Negative amount:
    const negRecord = transaction('bad-neg', '2026-11-10', 'expense', -5000)
    const negSummary = calculateTransactionSummary([negRecord])
    expect(negSummary.totalExpensePaise).toBe(-5000) // Does not throw, adds negative expense
    expect(negSummary.netCashFlowPaise).toBe(5000) // 0 - (-5000) = +5000

    // 2. Fractional amount:
    const fracRecord = transaction('bad-frac', '2026-11-10', 'income', 100.5)
    const fracSummary = calculateTransactionSummary([fracRecord])
    expect(fracSummary.totalIncomePaise).toBe(100.5) // Does not throw, retains float

    // 3. Unknown transaction type ('transfer'):
    const unknownTypeRecord = {
      ...transaction('bad-type', '2026-11-10', 'income', 5000),
      type: 'transfer' as unknown as 'income',
    }
    const unknownSummary = calculateTransactionSummary([unknownTypeRecord])
    expect(unknownSummary.totalExpensePaise).toBe(5000) // Default else branch treats it as expense
    expect(unknownSummary.expenseCount).toBe(1)

    // 4. Conflicting duplicate IDs:
    const conflictingRecords = [
      transaction('tx-conflict', '2026-11-10', 'income', 50000),
      transaction('tx-conflict', '2026-11-10', 'income', 60000),
    ]
    const conflictSummary = calculateTransactionSummary(conflictingRecords)
    expect(conflictSummary.totalIncomePaise).toBe(110000) // Sums 50,000 + 60,000 without error or deduplication
    expect(conflictSummary.transactionCount).toBe(2)
  })
})
