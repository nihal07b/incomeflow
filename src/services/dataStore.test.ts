import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DataStore } from './dataStore'
import {
  LocalStorageService,
  createMemoryStorageBackend,
  type TransactionRecord,
} from './storage'
import type { Profile, ShiftLog } from '../types'

describe('DataStore Shared Reactive Foundation', () => {
  let backend: ReturnType<typeof createMemoryStorageBackend>
  let storage: LocalStorageService
  let store: DataStore

  const sampleProfile: Profile = {
    id: 'rider-001',
    displayName: 'Aman Rider',
    language: 'en',
    currentCashPaise: 150000,
    cashAsOfDate: '2026-11-14',
    essentialDailySpendPaise: 20000,
    minimumCushionPaise: 50000,
  }

  const sampleShift: ShiftLog = {
    id: 's-1',
    profileId: 'rider-001',
    date: '2026-11-14',
    slot: 'evening',
    hours: 5,
    grossEarningsPaise: 100000, // ₹1,000
    workCostsPaise: 20000, // ₹200 -> Net ₹800
  }

  const sampleTx: TransactionRecord = {
    id: 'tx-1',
    profileId: 'rider-001',
    type: 'income',
    amountPaise: 80000, // ₹800
    date: '2026-11-14',
    category: 'delivery earnings',
    paymentMode: 'digital',
    description: 'Direct bank payout',
  }

  beforeEach(() => {
    backend = createMemoryStorageBackend()
    storage = new LocalStorageService(backend)
    store = new DataStore(storage)
  })

  describe('Initialization & Loading', () => {
    it('initializes with default empty state', () => {
      const snapshot = store.getSnapshot()
      expect(snapshot.shifts).toEqual([])
      expect(snapshot.transactions).toEqual([])
      expect(snapshot.profile).toBeNull()
      expect(snapshot.shiftSummary.totalHours).toBe(0)
      expect(snapshot.transactionSummary.totalIncomePaise).toBe(0)
    })

    it('loads stored records on refresh', async () => {
      await storage.saveProfile(sampleProfile)
      await storage.addShift(sampleShift)
      await storage.addTransaction(sampleTx)

      await store.refresh()
      const snapshot = store.getSnapshot()

      expect(snapshot.profile).toEqual(sampleProfile)
      expect(snapshot.shifts).toHaveLength(1)
      expect(snapshot.transactions).toHaveLength(1)
      expect(snapshot.shiftSummary.totalHours).toBe(5)
      expect(snapshot.shiftSummary.totalNetPaise).toBe(80000)
      expect(snapshot.transactionSummary.totalIncomePaise).toBe(80000)
      expect(snapshot.loading).toBe(false)
    })
  })

  describe('Reactive Subscriptions', () => {
    it('notifies subscribers when data changes', async () => {
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)

      await store.addShift(sampleShift)
      expect(listener).toHaveBeenCalled()

      const currentShifts = store.getSnapshot().shifts
      expect(currentShifts).toHaveLength(1)
      expect(currentShifts[0].id).toBe('s-1')

      unsubscribe()
      const callCountBefore = listener.mock.calls.length
      await store.addShift({ ...sampleShift, id: 's-2' })
      expect(listener.mock.calls.length).toBe(callCountBefore) // No more calls after unsubscribe
    })

    it('synchronizes multiple listeners simultaneously', async () => {
      const listenerA = vi.fn()
      const listenerB = vi.fn()

      store.subscribe(listenerA)
      store.subscribe(listenerB)

      await store.addTransaction(sampleTx)

      expect(listenerA).toHaveBeenCalled()
      expect(listenerB).toHaveBeenCalled()
      expect(store.getSnapshot().transactions).toHaveLength(1)
      expect(store.getSnapshot().transactionSummary.totalIncomePaise).toBe(80000)
    })
  })

  describe('Shift Mutations & Auto-Summaries', () => {
    it('updates shift summary reactively upon add, update and delete', async () => {
      // 1. Add shift
      await store.addShift(sampleShift)
      let snap = store.getSnapshot()
      expect(snap.shifts).toHaveLength(1)
      expect(snap.shiftSummary.totalHours).toBe(5)
      expect(snap.shiftSummary.totalNetPaise).toBe(80000)

      // 2. Update shift
      await store.updateShift('s-1', {
        hours: 6,
        grossEarningsPaise: 120000, // ₹1,200 - ₹200 = ₹1,000 net (100,000 paise)
      })
      snap = store.getSnapshot()
      expect(snap.shiftSummary.totalHours).toBe(6)
      expect(snap.shiftSummary.totalNetPaise).toBe(100000)

      // 3. Delete shift
      await store.deleteShift('s-1')
      snap = store.getSnapshot()
      expect(snap.shifts).toHaveLength(0)
      expect(snap.shiftSummary.totalHours).toBe(0)
      expect(snap.shiftSummary.totalNetPaise).toBe(0)
    })
  })

  describe('Transaction Mutations & Auto-Summaries', () => {
    it('updates transaction summary reactively upon add, update and delete', async () => {
      // 1. Add transaction
      await store.addTransaction(sampleTx)
      let snap = store.getSnapshot()
      expect(snap.transactions).toHaveLength(1)
      expect(snap.transactionSummary.totalIncomePaise).toBe(80000)
      expect(snap.transactionSummary.netCashFlowPaise).toBe(80000)

      // 2. Add expense
      const expenseTx: TransactionRecord = {
        id: 'tx-2',
        profileId: 'rider-001',
        type: 'expense',
        amountPaise: 25000, // ₹250
        date: '2026-11-14',
        category: 'fuel',
        paymentMode: 'cash',
      }
      await store.addTransaction(expenseTx)
      snap = store.getSnapshot()
      expect(snap.transactions).toHaveLength(2)
      expect(snap.transactionSummary.totalExpensePaise).toBe(25000)
      expect(snap.transactionSummary.netCashFlowPaise).toBe(55000) // ₹800 - ₹250 = ₹550

      // 3. Delete expense
      await store.deleteTransaction('tx-2')
      snap = store.getSnapshot()
      expect(snap.transactions).toHaveLength(1)
      expect(snap.transactionSummary.totalExpensePaise).toBe(0)
      expect(snap.transactionSummary.netCashFlowPaise).toBe(80000)
    })
  })

  describe('Profile Mutations', () => {
    it('saves and notifies subscribers of profile updates', async () => {
      const listener = vi.fn()
      store.subscribe(listener)

      await store.saveProfile(sampleProfile)
      expect(listener).toHaveBeenCalled()
      expect(store.getSnapshot().profile).toEqual(sampleProfile)
    })
  })
})
