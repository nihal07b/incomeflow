import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import {
  calculateDailySeries,
  calculateExpenseCategoryTotals,
  calculateFinancialSummary,
  calculateNetRecordedCashFlow,
  calculatePeriodExpenses,
  calculatePeriodIncome,
  getCalendarDays,
} from './summary'

describe('pure financial-summary calculations', () => {
  it('computes exact hand-calculated example: income 100000 and 50000, expenses 20000 and 10000', () => {
    // Specific requested benchmark scenario:
    // Income 1: 100,000 paise (₹1,000)
    // Income 2: 50,000 paise (₹500)
    // Expense 1: 20,000 paise (₹200)
    // Expense 2: 10,000 paise (₹100)
    // Hand calculations:
    // Expected periodIncomePaise: 100,000 + 50,000 = 150,000 paise (₹1,500)
    // Expected periodExpensesPaise: 20,000 + 10,000 = 30,000 paise (₹300)
    // Expected netRecordedCashFlowPaise: 150,000 - 30,000 = 120,000 paise (₹1,200)
    const transactions: Transaction[] = [
      { id: 'tx-inc-1', date: '2026-11-01', amountPaise: 100000, type: 'income', category: 'shift' },
      { id: 'tx-inc-2', date: '2026-11-01', amountPaise: 50000, type: 'income', category: 'shift' },
      { id: 'tx-exp-1', date: '2026-11-02', amountPaise: 20000, type: 'expense', category: 'fuel' },
      { id: 'tx-exp-2', date: '2026-11-02', amountPaise: 10000, type: 'expense', category: 'food' },
    ]

    const summary = calculateFinancialSummary({
      startDate: '2026-11-01',
      endDate: '2026-11-02',
      transactions,
    })

    expect(summary.periodIncomePaise).toBe(150000)
    expect(summary.periodExpensesPaise).toBe(30000)
    expect(summary.netRecordedCashFlowPaise).toBe(120000)
    expect(summary.expenseCategoryTotals).toEqual({
      fuel: 20000,
      food: 10000,
    })

    // Returns ONLY the 5 required keys
    expect(Object.keys(summary).sort()).toEqual([
      'dailySeries',
      'expenseCategoryTotals',
      'netRecordedCashFlowPaise',
      'periodExpensesPaise',
      'periodIncomePaise',
    ])
  })

  it('rejects negative amountPaise for transactions with an explicit error', () => {
    const transactions: Transaction[] = [
      { id: 'tx-neg', date: '2026-11-01', amountPaise: -5000, type: 'expense', category: 'fuel' },
    ]

    expect(() => calculateFinancialSummary(transactions)).toThrow(
      'Transaction tx-neg amountPaise cannot be negative, received: -5000',
    )
  })

  it('validates every transaction before filtering by period, failing even if invalid transaction is outside period', () => {
    // Selected period: 2026-11-01 to 2026-11-05
    // Transaction 1: valid, inside period
    // Transaction 2: invalid amount (negative), outside period (2026-10-15)
    const transactionsWithNegativeOutside: Transaction[] = [
      { id: 'tx-valid', date: '2026-11-02', amountPaise: 40000, type: 'income', category: 'shift' },
      { id: 'tx-out-neg', date: '2026-10-15', amountPaise: -20000, type: 'expense', category: 'fuel' },
    ]

    expect(() =>
      calculateFinancialSummary({
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        transactions: transactionsWithNegativeOutside,
      }),
    ).toThrow('Transaction tx-out-neg amountPaise cannot be negative, received: -20000')

    // Transaction with malformed date format outside period
    const transactionsWithBadDate: Transaction[] = [
      { id: 'tx-bad-date', date: '15-10-2026', amountPaise: 20000, type: 'expense', category: 'fuel' },
    ]

    expect(() =>
      calculateFinancialSummary({
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        transactions: transactionsWithBadDate,
      }),
    ).toThrow('Transaction tx-bad-date date must be formatted as YYYY-MM-DD')
  })

  it('ignores exact duplicate transactions sharing the same ID and identical content', () => {
    const transactions: Transaction[] = [
      { id: 'tx-dup', date: '2026-11-01', amountPaise: 50000, type: 'income', category: 'shift' },
      { id: 'tx-dup', date: '2026-11-01', amountPaise: 50000, type: 'income', category: 'shift' }, // Exact duplicate
      { id: 'tx-exp', date: '2026-11-01', amountPaise: 15000, type: 'expense', category: 'fuel' },
      { id: 'tx-exp', date: '2026-11-01', amountPaise: 15000, type: 'expense', category: 'fuel' }, // Exact duplicate
    ]

    // Hand calculation:
    // Income: 50,000 paise (counted once)
    // Expenses: 15,000 paise (counted once)
    // Net: 35,000 paise
    const summary = calculateFinancialSummary(transactions)
    expect(summary.periodIncomePaise).toBe(50000)
    expect(summary.periodExpensesPaise).toBe(15000)
    expect(summary.netRecordedCashFlowPaise).toBe(35000)
  })

  it('throws an error when two transactions share an ID but have conflicting content', () => {
    const transactionsWithConflictingAmount: Transaction[] = [
      { id: 'tx-1', date: '2026-11-01', amountPaise: 50000, type: 'income', category: 'shift' },
      { id: 'tx-1', date: '2026-11-01', amountPaise: 60000, type: 'income', category: 'shift' }, // Different amount
    ]

    expect(() => calculateFinancialSummary(transactionsWithConflictingAmount)).toThrow(
      'Transaction tx-1 shares an ID with an existing transaction but has different content',
    )

    const transactionsWithConflictingType: Transaction[] = [
      { id: 'tx-2', date: '2026-11-01', amountPaise: 50000, type: 'income', category: 'shift' },
      { id: 'tx-2', date: '2026-11-01', amountPaise: 50000, type: 'expense', category: 'shift' }, // Different type
    ]

    expect(() => calculateFinancialSummary(transactionsWithConflictingType)).toThrow(
      'Transaction tx-2 shares an ID with an existing transaction but has different content',
    )
  })

  it('computes exact hand-calculated period totals, categories, and daily series for multi-day period', () => {
    // 3-day scenario: 2026-11-01 to 2026-11-03
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-11-01', amountPaise: 120000, type: 'income', category: 'shift' },
      { id: 'tx-2', date: '2026-11-01', amountPaise: 30000, type: 'expense', category: 'fuel' },
      { id: 'tx-3', date: '2026-11-02', amountPaise: 80000, type: 'income', category: 'shift' },
      { id: 'tx-4', date: '2026-11-02', amountPaise: 15000, type: 'expense', category: 'food' },
      { id: 'tx-5', date: '2026-11-02', amountPaise: 45000, type: 'expense', category: 'maintenance' },
      { id: 'tx-6', date: '2026-11-03', amountPaise: 60000, type: 'expense', category: 'loan_repayment' },
    ]

    // Hand calculations:
    // Period Income: 120,000 + 80,000 = 200,000 paise (₹2,000)
    // Period Expenses: 30,000 + 15,000 + 45,000 + 60,000 = 150,000 paise (₹1,500)
    // Net Cash Flow: 200,000 - 150,000 = 50,000 paise (₹500)
    // Categories: fuel = 30000, food = 15000, maintenance = 45000, loan_repayment = 60000
    // Day 1 Net: 120000 - 30000 = +90000
    // Day 2 Net: 80000 - (15000 + 45000) = +20000
    // Day 3 Net: 0 - 60000 = -60000

    const summary = calculateFinancialSummary({
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      transactions,
    })

    expect(summary.periodIncomePaise).toBe(200000)
    expect(summary.periodExpensesPaise).toBe(150000)
    expect(summary.netRecordedCashFlowPaise).toBe(50000)

    expect(summary.expenseCategoryTotals).toEqual({
      fuel: 30000,
      food: 15000,
      maintenance: 45000,
      loan_repayment: 60000,
    })

    expect(summary.dailySeries).toEqual([
      { date: '2026-11-01', incomePaise: 120000, expensesPaise: 30000, netPaise: 90000 },
      { date: '2026-11-02', incomePaise: 80000, expensesPaise: 60000, netPaise: 20000 },
      { date: '2026-11-03', incomePaise: 0, expensesPaise: 60000, netPaise: -60000 },
    ])
  })

  it('respects date boundaries and includes empty intervening days in daily series', () => {
    const transactions: Transaction[] = [
      { id: 'tx-out-before', date: '2026-10-31', amountPaise: 99999, type: 'income', category: 'old' },
      { id: 'tx-in-day1', date: '2026-11-01', amountPaise: 60000, type: 'income', category: 'shift' },
      // 2026-11-02 has NO transactions
      { id: 'tx-in-day3', date: '2026-11-03', amountPaise: 20000, type: 'expense', category: 'fuel' },
      { id: 'tx-out-after', date: '2026-11-04', amountPaise: 88888, type: 'income', category: 'future' },
    ]

    const summary = calculateFinancialSummary({
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      transactions,
    })

    // Out-of-bounds transactions are excluded from period totals
    expect(summary.periodIncomePaise).toBe(60000)
    expect(summary.periodExpensesPaise).toBe(20000)
    expect(summary.netRecordedCashFlowPaise).toBe(40000)

    // Exact 3 days in series, including empty 2026-11-02
    expect(summary.dailySeries).toEqual([
      { date: '2026-11-01', incomePaise: 60000, expensesPaise: 0, netPaise: 60000 },
      { date: '2026-11-02', incomePaise: 0, expensesPaise: 0, netPaise: 0 },
      { date: '2026-11-03', incomePaise: 0, expensesPaise: 20000, netPaise: -20000 },
    ])
  })

  it('preserves negative net recorded cash flow when expenses exceed income', () => {
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-11-05', amountPaise: 30000, type: 'income', category: 'shift' },
      { id: 'tx-2', date: '2026-11-05', amountPaise: 100000, type: 'expense', category: 'repair' },
    ]

    const summary = calculateFinancialSummary(transactions)
    expect(summary.periodIncomePaise).toBe(30000)
    expect(summary.periodExpensesPaise).toBe(100000)
    expect(summary.netRecordedCashFlowPaise).toBe(-70000)
  })

  it('rejects invalid inputs including fractional and non-integer amounts', () => {
    // Fractional amount
    expect(() =>
      calculateFinancialSummary([
        { id: 'tx-bad-frac', date: '2026-11-01', amountPaise: 100.5, type: 'income', category: 'test' },
      ]),
    ).toThrow('must be integer paise')

    // NaN amount
    expect(() =>
      calculateFinancialSummary([
        { id: 'tx-bad-nan', date: '2026-11-01', amountPaise: NaN, type: 'income', category: 'test' },
      ]),
    ).toThrow('must be integer paise')

    // Inverted date range
    expect(() =>
      calculateFinancialSummary({
        startDate: '2026-11-10',
        endDate: '2026-11-05',
        transactions: [],
      }),
    ).toThrow('startDate (2026-11-10) cannot be after endDate (2026-11-05)')
  })

  it('generates accurate calendar day arrays across month and leap-year boundaries', () => {
    expect(getCalendarDays('2026-11-29', '2026-12-02')).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ])

    expect(getCalendarDays('2024-02-28', '2024-03-01')).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ])
  })

  it('individual granular helper functions return matching values', () => {
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-11-01', amountPaise: 90000, type: 'income', category: 'shift' },
      { id: 'tx-2', date: '2026-11-01', amountPaise: 25000, type: 'expense', category: 'fuel' },
    ]

    expect(calculatePeriodIncome(transactions)).toBe(90000)
    expect(calculatePeriodExpenses(transactions)).toBe(25000)
    expect(calculateNetRecordedCashFlow(transactions)).toBe(65000)
    expect(calculateExpenseCategoryTotals(transactions)).toEqual({ fuel: 25000 })
    expect(calculateDailySeries(transactions)).toEqual([
      { date: '2026-11-01', incomePaise: 90000, expensesPaise: 25000, netPaise: 65000 },
    ])
  })

  it('handles completely empty inputs with and without date boundaries', () => {
    const emptySummary = calculateFinancialSummary([])
    expect(emptySummary.periodIncomePaise).toBe(0)
    expect(emptySummary.periodExpensesPaise).toBe(0)
    expect(emptySummary.netRecordedCashFlowPaise).toBe(0)
    expect(emptySummary.dailySeries).toEqual([])
    expect(emptySummary.expenseCategoryTotals).toEqual({})

    const emptyWithRange = calculateFinancialSummary({
      startDate: '2026-11-01',
      endDate: '2026-11-03',
      transactions: [],
    })
    expect(emptyWithRange.periodIncomePaise).toBe(0)
    expect(emptyWithRange.periodExpensesPaise).toBe(0)
    expect(emptyWithRange.netRecordedCashFlowPaise).toBe(0)
    expect(emptyWithRange.dailySeries).toEqual([
      { date: '2026-11-01', incomePaise: 0, expensesPaise: 0, netPaise: 0 },
      { date: '2026-11-02', incomePaise: 0, expensesPaise: 0, netPaise: 0 },
      { date: '2026-11-03', incomePaise: 0, expensesPaise: 0, netPaise: 0 },
    ])
  })

  it('handles single-day period where startDate equals endDate', () => {
    const transactions: Transaction[] = [
      { id: 'tx-day1', date: '2026-11-01', amountPaise: 40000, type: 'income', category: 'shift' },
      { id: 'tx-day2-inc', date: '2026-11-02', amountPaise: 95000, type: 'income', category: 'shift' },
      { id: 'tx-day2-exp', date: '2026-11-02', amountPaise: 25000, type: 'expense', category: 'fuel' },
      { id: 'tx-day3', date: '2026-11-03', amountPaise: 30000, type: 'expense', category: 'food' },
    ]

    const summary = calculateFinancialSummary({
      startDate: '2026-11-02',
      endDate: '2026-11-02',
      transactions,
    })

    expect(summary.periodIncomePaise).toBe(95000)
    expect(summary.periodExpensesPaise).toBe(25000)
    expect(summary.netRecordedCashFlowPaise).toBe(70000)
    expect(summary.dailySeries).toEqual([
      { date: '2026-11-02', incomePaise: 95000, expensesPaise: 25000, netPaise: 70000 },
    ])
    expect(summary.expenseCategoryTotals).toEqual({ fuel: 25000 })
  })

  it('handles open-ended date boundaries (only startDate or only endDate)', () => {
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-11-01', amountPaise: 30000, type: 'income', category: 'shift' },
      { id: 'tx-2', date: '2026-11-02', amountPaise: 50000, type: 'income', category: 'shift' },
      { id: 'tx-3', date: '2026-11-04', amountPaise: 20000, type: 'expense', category: 'fuel' },
    ]

    const startOnly = calculateFinancialSummary({
      startDate: '2026-11-02',
      transactions,
    })
    expect(startOnly.periodIncomePaise).toBe(50000)
    expect(startOnly.periodExpensesPaise).toBe(20000)
    expect(startOnly.netRecordedCashFlowPaise).toBe(30000)

    const endOnly = calculateFinancialSummary({
      endDate: '2026-11-02',
      transactions,
    })
    expect(endOnly.periodIncomePaise).toBe(80000)
    expect(endOnly.periodExpensesPaise).toBe(0)
    expect(endOnly.netRecordedCashFlowPaise).toBe(80000)
  })

  it('creates continuous daily series spanning from min date to max date when no range provided', () => {
    const transactions: Transaction[] = [
      { id: 'tx-1', date: '2026-11-01', amountPaise: 60000, type: 'income', category: 'shift' },
      { id: 'tx-2', date: '2026-11-03', amountPaise: 20000, type: 'expense', category: 'fuel' },
    ]

    const summary = calculateFinancialSummary(transactions)
    expect(summary.dailySeries).toEqual([
      { date: '2026-11-01', incomePaise: 60000, expensesPaise: 0, netPaise: 60000 },
      { date: '2026-11-02', incomePaise: 0, expensesPaise: 0, netPaise: 0 },
      { date: '2026-11-03', incomePaise: 0, expensesPaise: 20000, netPaise: -20000 },
    ])
    expect(summary.netRecordedCashFlowPaise).toBe(40000)
  })

  it('normalizes categories with whitespace and defaults empty categories to uncategorized', () => {
    const transactions: Transaction[] = [
      { id: 'tx-ws', date: '2026-11-01', amountPaise: 15000, type: 'expense', category: '  fuel  ' },
      { id: 'tx-empty', date: '2026-11-01', amountPaise: 25000, type: 'expense', category: '   ' },
    ]

    const summary = calculateFinancialSummary(transactions)
    expect(summary.periodExpensesPaise).toBe(40000)
    expect(summary.expenseCategoryTotals).toEqual({
      fuel: 15000,
      uncategorized: 25000,
    })
  })

  it('rejects unsupported transaction types with an explicit error', () => {
    const transactions = [
      {
        id: 'tx-invalid',
        date: '2026-11-01',
        amountPaise: 50000,
        type: 'investment' as unknown as 'income',
        category: 'mutual_fund',
      },
    ]

    expect(() => calculateFinancialSummary(transactions)).toThrow(
      'Unsupported transaction type: investment',
    )
  })
})
