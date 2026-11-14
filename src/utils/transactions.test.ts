import { describe, it, expect, beforeEach } from 'vitest'
import {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  validateTransactionInput,
  calculateTransactionSummary,
  filterTransactions,
  getCategoryLabel,
} from './transactions'
import {
  LocalStorageService,
  createMemoryStorageBackend,
  STORAGE_KEYS,
  StorageCorruptionError,
  StorageValidationError,
  StorageNotFoundError,
  type TransactionRecord,
} from '../services/storage'

describe('Transaction Utilities & Storage Tests', () => {
  describe('Amount Conversion and Formatting', () => {
    it('converts decimal rupees to safe integer paise', () => {
      expect(rupeesToPaise(1500)).toBe(150000)
      expect(rupeesToPaise(50.25)).toBe(5025)
      expect(rupeesToPaise(1)).toBe(100)
    })

    it('converts paise to decimal rupees', () => {
      expect(paiseToRupees(150000)).toBe(1500)
      expect(paiseToRupees(5025)).toBe(50.25)
    })

    it('formats rupee currency with Indian numbering system', () => {
      expect(formatRupees(150000)).toContain('1,500')
      expect(formatRupees(0)).toContain('0')
      expect(formatRupees(-50000)).toMatch(/^-.*500/)
    })
  })

  describe('Form Input Validation', () => {
    it('validates a correct income transaction', () => {
      const valid = {
        type: 'income' as const,
        amountRupees: '1200',
        date: '2026-11-14',
        category: 'delivery earnings' as const,
        paymentMode: 'digital' as const,
      }
      const errors = validateTransactionInput(valid)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('validates a correct expense transaction', () => {
      const valid = {
        type: 'expense' as const,
        amountRupees: '250',
        date: '2026-11-14',
        category: 'fuel' as const,
        paymentMode: 'cash' as const,
        description: 'Petrol refill at HP pump',
      }
      const errors = validateTransactionInput(valid)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('rejects zero or negative amounts', () => {
      const zeroAmount = {
        type: 'expense' as const,
        amountRupees: '0',
        date: '2026-11-14',
        category: 'fuel' as const,
        paymentMode: 'cash' as const,
      }
      expect(validateTransactionInput(zeroAmount).amountRupees).toBeDefined()

      const negAmount = { ...zeroAmount, amountRupees: '-100' }
      expect(validateTransactionInput(negAmount).amountRupees).toBeDefined()

      const nonNumAmount = { ...zeroAmount, amountRupees: 'invalid' }
      expect(validateTransactionInput(nonNumAmount).amountRupees).toBeDefined()
    })

    it('rejects invalid calendar dates', () => {
      const badDate = {
        type: 'expense' as const,
        amountRupees: '100',
        date: '2026-02-31', // Non-existent date
        category: 'food' as const,
        paymentMode: 'cash' as const,
      }
      expect(validateTransactionInput(badDate).date).toBeDefined()
    })

    it('rejects category mismatched with transaction type', () => {
      const mismatchedIncome = {
        type: 'income' as const,
        amountRupees: '500',
        date: '2026-11-14',
        category: 'fuel' as any, // 'fuel' is not an income category
        paymentMode: 'cash' as const,
      }
      expect(validateTransactionInput(mismatchedIncome).category).toBeDefined()

      const mismatchedExpense = {
        type: 'expense' as const,
        amountRupees: '500',
        date: '2026-11-14',
        category: 'delivery earnings' as any, // not an expense category
        paymentMode: 'cash' as const,
      }
      expect(validateTransactionInput(mismatchedExpense).category).toBeDefined()
    })

    it('rejects invalid payment modes', () => {
      const badMode = {
        type: 'income' as const,
        amountRupees: '500',
        date: '2026-11-14',
        category: 'other income' as const,
        paymentMode: 'crypto' as any,
      }
      expect(validateTransactionInput(badMode).paymentMode).toBeDefined()
    })
  })

  describe('Summary Calculations', () => {
    const sampleTransactions: TransactionRecord[] = [
      {
        id: 't1',
        profileId: 'p1',
        type: 'income',
        amountPaise: 150000, // ₹1,500
        date: '2026-11-13',
        category: 'delivery earnings',
        paymentMode: 'digital',
      },
      {
        id: 't2',
        profileId: 'p1',
        type: 'income',
        amountPaise: 50000, // ₹500
        date: '2026-11-14',
        category: 'other income',
        paymentMode: 'cash',
      },
      {
        id: 't3',
        profileId: 'p1',
        type: 'expense',
        amountPaise: 30000, // ₹300
        date: '2026-11-14',
        category: 'fuel',
        paymentMode: 'cash',
      },
      {
        id: 't4',
        profileId: 'p1',
        type: 'expense',
        amountPaise: 20000, // ₹200
        date: '2026-11-14',
        category: 'food',
        paymentMode: 'digital',
      },
    ]

    it('returns zero metrics for empty transaction history', () => {
      const summary = calculateTransactionSummary([])
      expect(summary.totalIncomePaise).toBe(0)
      expect(summary.totalExpensePaise).toBe(0)
      expect(summary.netCashFlowPaise).toBe(0)
      expect(summary.transactionCount).toBe(0)
    })

    it('calculates total income, expenses, and net cash flow surplus', () => {
      const summary = calculateTransactionSummary(sampleTransactions)
      expect(summary.totalIncomePaise).toBe(200000) // ₹2,000
      expect(summary.totalExpensePaise).toBe(50000) // ₹500
      expect(summary.netCashFlowPaise).toBe(150000) // +₹1,500
      expect(summary.incomeCount).toBe(2)
      expect(summary.expenseCount).toBe(2)
      expect(summary.digitalIncomePaise).toBe(150000)
      expect(summary.cashIncomePaise).toBe(50000)
      expect(summary.cashExpensePaise).toBe(30000)
      expect(summary.digitalExpensePaise).toBe(20000)
    })

    it('calculates negative net cash flow when expenses exceed income', () => {
      const deficitTransactions: TransactionRecord[] = [
        {
          id: 't1',
          profileId: 'p1',
          type: 'income',
          amountPaise: 50000, // ₹500
          date: '2026-11-14',
          category: 'delivery earnings',
          paymentMode: 'cash',
        },
        {
          id: 't2',
          profileId: 'p1',
          type: 'expense',
          amountPaise: 120000, // ₹1,200
          date: '2026-11-14',
          category: 'maintenance',
          paymentMode: 'digital',
        },
      ]
      const summary = calculateTransactionSummary(deficitTransactions)
      expect(summary.netCashFlowPaise).toBe(-70000) // -₹700 deficit
    })
  })

  describe('Filtering Operations', () => {
    const list: TransactionRecord[] = [
      {
        id: '1',
        profileId: 'p1',
        type: 'income',
        amountPaise: 100000,
        date: '2026-11-10',
        category: 'delivery earnings',
        paymentMode: 'digital',
      },
      {
        id: '2',
        profileId: 'p1',
        type: 'expense',
        amountPaise: 25000,
        date: '2026-11-12',
        category: 'fuel',
        paymentMode: 'cash',
      },
      {
        id: '3',
        profileId: 'p1',
        type: 'expense',
        amountPaise: 40000,
        date: '2026-11-14',
        category: 'maintenance',
        paymentMode: 'digital',
      },
    ]

    it('filters by transaction type (income only)', () => {
      const filtered = filterTransactions(list, { type: 'income' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('filters by category', () => {
      const filtered = filterTransactions(list, { category: 'fuel' })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].category).toBe('fuel')
    })

    it('filters by payment mode', () => {
      const cashList = filterTransactions(list, { paymentMode: 'cash' })
      expect(cashList).toHaveLength(1)
      expect(cashList[0].id).toBe('2')
    })

    it('filters by date range', () => {
      const range = filterTransactions(list, {
        startDate: '2026-11-11',
        endDate: '2026-11-13',
      })
      expect(range).toHaveLength(1)
      expect(range[0].id).toBe('2')
    })
  })

  describe('CRUD Operations and Local Storage Persistence', () => {
    let backend: ReturnType<typeof createMemoryStorageBackend>
    let service: LocalStorageService

    const sampleTx: TransactionRecord = {
      id: 'tx-100',
      profileId: 'rider-default',
      type: 'expense',
      amountPaise: 35000,
      date: '2026-11-14',
      category: 'fuel',
      paymentMode: 'cash',
      description: 'Petrol refill',
    }

    beforeEach(() => {
      backend = createMemoryStorageBackend()
      service = new LocalStorageService(backend)
    })

    it('adds and loads a transaction', async () => {
      await service.addTransaction(sampleTx)
      const transactions = await service.getTransactions()
      expect(transactions).toHaveLength(1)
      expect(transactions[0]).toEqual(sampleTx)
    })

    it('updates an existing transaction by ID', async () => {
      await service.addTransaction(sampleTx)
      const updated = await service.updateTransaction('tx-100', {
        amountPaise: 40000,
        description: 'Petrol + oil pouch',
      })
      expect(updated.amountPaise).toBe(40000)
      expect(updated.description).toBe('Petrol + oil pouch')

      const loaded = await service.getTransactions()
      expect(loaded[0].amountPaise).toBe(40000)
    })

    it('throws StorageNotFoundError when updating non-existent transaction', async () => {
      await expect(
        service.updateTransaction('missing-id', { amountPaise: 5000 })
      ).rejects.toThrow(StorageNotFoundError)
    })

    it('deletes a transaction by ID and returns boolean status', async () => {
      await service.addTransaction(sampleTx)
      const deleted = await service.deleteTransaction('tx-100')
      expect(deleted).toBe(true)

      const remaining = await service.getTransactions()
      expect(remaining).toHaveLength(0)

      // Second deletion returns false
      expect(await service.deleteTransaction('tx-100')).toBe(false)
    })

    it('persists transactions across service reinitialization', async () => {
      const s1 = new LocalStorageService(backend)
      await s1.addTransaction(sampleTx)

      const s2 = new LocalStorageService(backend)
      const reloaded = await s2.getTransactions()
      expect(reloaded).toHaveLength(1)
      expect(reloaded[0]).toEqual(sampleTx)
    })

    it('rejects adding duplicate transaction IDs', async () => {
      await service.addTransaction(sampleTx)
      await expect(service.addTransaction(sampleTx)).rejects.toThrow(
        StorageValidationError
      )
    })

    it('throws StorageCorruptionError on corrupt JSON and preserves raw string', async () => {
      const corruptString = '{broken:json'
      backend.setItem(STORAGE_KEYS.TRANSACTIONS, corruptString)

      await expect(service.getTransactions()).rejects.toThrow(
        StorageCorruptionError
      )
      // Raw string not overwritten
      expect(backend.getItem(STORAGE_KEYS.TRANSACTIONS)).toBe(corruptString)
    })

    it('rejects non-positive transaction amounts in storage', async () => {
      const invalidTx = {
        ...sampleTx,
        amountPaise: 0,
      }
      await expect(
        service.addTransaction(invalidTx as TransactionRecord)
      ).rejects.toThrow(StorageValidationError)
    })
  })

  describe('Category Labels', () => {
    it('returns friendly labels with icons for all categories', () => {
      expect(getCategoryLabel('delivery earnings')).toContain('Delivery')
      expect(getCategoryLabel('fuel')).toContain('Fuel')
      expect(getCategoryLabel('maintenance')).toContain('Maintenance')
    })
  })
})
