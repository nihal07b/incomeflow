import type {
  TransactionRecord,
  TransactionType,
  TransactionCategory,
  TransactionIncomeCategory,
  TransactionExpenseCategory,
  PaymentMode,
} from '../services/storage'
import {
  TRANSACTION_INCOME_CATEGORIES,
  TRANSACTION_EXPENSE_CATEGORIES,
  isValidLocalDate,
} from '../services/storage'
import type { MoneyPaise, LocalDate } from '../types'
import { rupeesToPaise, paiseToRupees, formatRupees } from './shifts'

export { rupeesToPaise, paiseToRupees, formatRupees }

export interface TransactionFormInput {
  type: TransactionType
  amountRupees: string | number
  date: LocalDate
  category: TransactionCategory
  paymentMode: PaymentMode
  description?: string
}

export interface TransactionFormErrors {
  amountRupees?: string
  date?: string
  category?: string
  paymentMode?: string
  general?: string
}

export interface TransactionFilterState {
  type?: 'all' | TransactionType
  category?: 'all' | TransactionCategory
  paymentMode?: 'all' | PaymentMode
  startDate?: string
  endDate?: string
}

export interface TransactionSummary {
  totalIncomePaise: MoneyPaise
  totalExpensePaise: MoneyPaise
  netCashFlowPaise: MoneyPaise
  transactionCount: number
  incomeCount: number
  expenseCount: number
  cashIncomePaise: MoneyPaise
  digitalIncomePaise: MoneyPaise
  cashExpensePaise: MoneyPaise
  digitalExpensePaise: MoneyPaise
}

/**
 * Category Display Labels & Metadata
 */
export function getCategoryLabel(category: TransactionCategory): string {
  switch (category) {
    case 'repayment':
      return 'Repayment'
    case 'delivery earnings':
      return '🛵 Delivery Earnings'
    case 'other income':
      return '💵 Other Income'
    case 'fuel':
      return '⛽ Fuel / Petrol'
    case 'food':
      return '🍛 Food & Meals'
    case 'maintenance':
      return '🔧 Bike Maintenance'
    case 'household':
      return '🏠 Household & Rent'
    case 'other':
      return '📦 Other Expenses'
  }
}

/**
 * Validates user input from the Transaction Entry Form
 */
export function validateTransactionInput(input: TransactionFormInput): TransactionFormErrors {
  const errors: TransactionFormErrors = {}

  // Validate Amount
  const numAmount = Number(input.amountRupees)
  if (input.amountRupees === '' || input.amountRupees === null || input.amountRupees === undefined) {
    errors.amountRupees = 'Amount is required'
  } else if (Number.isNaN(numAmount) || !Number.isFinite(numAmount)) {
    errors.amountRupees = 'Amount must be a valid number'
  } else if (numAmount <= 0) {
    errors.amountRupees = 'Amount must be greater than zero'
  }

  // Validate Date
  if (!input.date || typeof input.date !== 'string' || input.date.trim() === '') {
    errors.date = 'Date is required'
  } else if (!isValidLocalDate(input.date)) {
    errors.date = 'Please enter a valid calendar date (YYYY-MM-DD)'
  }

  // Validate Type
  if (input.type !== 'income' && input.type !== 'expense') {
    errors.general = 'Transaction type must be income or expense'
  }

  // Validate Category matches Type
  if (input.type === 'income') {
    if (!TRANSACTION_INCOME_CATEGORIES.includes(input.category as TransactionIncomeCategory)) {
      errors.category = `Select an income category (${TRANSACTION_INCOME_CATEGORIES.join(', ')})`
    }
  } else {
    if (!TRANSACTION_EXPENSE_CATEGORIES.includes(input.category as TransactionExpenseCategory)) {
      errors.category = `Select an expense category (${TRANSACTION_EXPENSE_CATEGORIES.join(', ')})`
    }
  }

  // Validate Payment Mode
  if (input.paymentMode !== 'cash' && input.paymentMode !== 'digital') {
    errors.paymentMode = 'Payment mode must be cash or digital'
  }

  return errors
}

/**
 * Calculates aggregate summary metrics across a list of transactions.
 * Returns income total, expense total, net cash flow, and payment breakdowns.
 */
export function calculateTransactionSummary(transactions: TransactionRecord[]): TransactionSummary {
  if (!transactions || transactions.length === 0) {
    return {
      totalIncomePaise: 0,
      totalExpensePaise: 0,
      netCashFlowPaise: 0,
      transactionCount: 0,
      incomeCount: 0,
      expenseCount: 0,
      cashIncomePaise: 0,
      digitalIncomePaise: 0,
      cashExpensePaise: 0,
      digitalExpensePaise: 0,
    }
  }

  let totalIncomePaise = 0
  let totalExpensePaise = 0
  let incomeCount = 0
  let expenseCount = 0
  let cashIncomePaise = 0
  let digitalIncomePaise = 0
  let cashExpensePaise = 0
  let digitalExpensePaise = 0

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncomePaise += t.amountPaise
      incomeCount += 1
      if (t.paymentMode === 'cash') {
        cashIncomePaise += t.amountPaise
      } else {
        digitalIncomePaise += t.amountPaise
      }
    } else {
      totalExpensePaise += t.amountPaise
      expenseCount += 1
      if (t.paymentMode === 'cash') {
        cashExpensePaise += t.amountPaise
      } else {
        digitalExpensePaise += t.amountPaise
      }
    }
  }

  return {
    totalIncomePaise,
    totalExpensePaise,
    netCashFlowPaise: totalIncomePaise - totalExpensePaise,
    transactionCount: transactions.length,
    incomeCount,
    expenseCount,
    cashIncomePaise,
    digitalIncomePaise,
    cashExpensePaise,
    digitalExpensePaise,
  }
}

/**
 * Filters a list of transactions according to filter criteria.
 * Always maintains newest-first sorting.
 */
export function filterTransactions(
  transactions: TransactionRecord[],
  filters: TransactionFilterState
): TransactionRecord[] {
  return transactions.filter((t) => {
    // Type Filter
    if (filters.type && filters.type !== 'all' && t.type !== filters.type) {
      return false
    }

    // Category Filter
    if (filters.category && filters.category !== 'all' && t.category !== filters.category) {
      return false
    }

    // Payment Mode Filter
    if (filters.paymentMode && filters.paymentMode !== 'all' && t.paymentMode !== filters.paymentMode) {
      return false
    }

    // Start Date Filter (inclusive)
    if (filters.startDate && filters.startDate.trim() !== '') {
      if (t.date < filters.startDate) {
        return false
      }
    }

    // End Date Filter (inclusive)
    if (filters.endDate && filters.endDate.trim() !== '') {
      if (t.date > filters.endDate) {
        return false
      }
    }

    return true
  })
}
