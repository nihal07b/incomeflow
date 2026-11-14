import { describe, it, expect, beforeEach } from 'vitest'
import {
  LocalStorageService,
  createMemoryStorageBackend,
  STORAGE_KEYS,
  StorageCorruptionError,
  StorageValidationError,
  StorageNotFoundError,
  StorageQuotaError,
  StorageUnavailableError,
  isValidLocalDate,
  isSafePaise,
  getTodayLocalDate,
  deriveUdhaarStatus,
  calculateCustomerOutstandingPaise,
  getUdhaarRemainingPaise,
  addDaysToLocalDate,
} from './storage'
import type { Profile, ShiftLog, PlannedExpense, UdhaarEntry } from '../types'
import { demoProjection } from '../demo/scenario'

describe('LocalStorageService & Storage Operations', () => {
  let backend: ReturnType<typeof createMemoryStorageBackend>
  let service: LocalStorageService

  const sampleProfile: Profile = {
    id: 'rider-001',
    displayName: 'Ramesh Kumar',
    language: 'en',
    currentCashPaise: 150000, // ₹1,500
    cashAsOfDate: '2026-11-14',
    essentialDailySpendPaise: 20000, // ₹200
    minimumCushionPaise: 50000, // ₹500
  }

  const sampleShift: ShiftLog = {
    id: 'shift-101',
    profileId: 'rider-001',
    date: '2026-11-14',
    slot: 'evening',
    hours: 5.5,
    grossEarningsPaise: 95000, // ₹950
    workCostsPaise: 25000, // ₹250
  }

  const sampleExpense: PlannedExpense = {
    id: 'exp-201',
    profileId: 'rider-001',
    date: '2026-11-14',
    label: 'Bike engine oil change',
    amountPaise: 35000, // ₹350
  }

  beforeEach(() => {
    backend = createMemoryStorageBackend()
    service = new LocalStorageService(backend)
  })

  describe('1. Empty Storage Handling', () => {
    it('returns null for profile when storage is empty', async () => {
      const profile = await service.getProfile()
      expect(profile).toBeNull()
    })

    it('returns an empty array for shifts when storage is empty', async () => {
      const shifts = await service.getShifts()
      expect(shifts).toEqual([])
    })

    it('returns an empty array for expenses when storage is empty', async () => {
      const expenses = await service.getExpenses()
      expect(expenses).toEqual([])
    })
  })

  describe('2. Save and Load Operations', () => {
    it('saves and loads profile accurately', async () => {
      const saved = await service.saveProfile(sampleProfile)
      expect(saved).toEqual(sampleProfile)

      const loaded = await service.getProfile()
      expect(loaded).toEqual(sampleProfile)
    })

    it('saves and loads multiple shifts', async () => {
      const shift2: ShiftLog = {
        ...sampleShift,
        id: 'shift-102',
        slot: 'night',
        hours: 4,
        grossEarningsPaise: 80000,
        workCostsPaise: 15000,
      }
      await service.saveShifts([sampleShift, shift2])

      const loaded = await service.getShifts()
      expect(loaded).toHaveLength(2)
      expect(loaded[0]).toEqual(sampleShift)
      expect(loaded[1]).toEqual(shift2)
    })

    it('saves and loads expenses with optional category', async () => {
      const expenseWithCat = {
        ...sampleExpense,
        category: 'maintenance' as const,
      }
      await service.saveExpenses([expenseWithCat])

      const loaded = await service.getExpenses()
      expect(loaded).toHaveLength(1)
      expect(loaded[0].label).toBe('Bike engine oil change')
      expect(loaded[0].category).toBe('maintenance')
    })
  })

  describe('3. Add, Update, and Delete Operations', () => {
    it('adds a shift and persists it', async () => {
      await service.addShift(sampleShift)
      const shifts = await service.getShifts()
      expect(shifts).toHaveLength(1)
      expect(shifts[0].id).toBe('shift-101')
    })

    it('updates an existing shift by stable ID', async () => {
      await service.addShift(sampleShift)
      const updated = await service.updateShift('shift-101', {
        hours: 6,
        grossEarningsPaise: 120000,
      })

      expect(updated.hours).toBe(6)
      expect(updated.grossEarningsPaise).toBe(120000)
      expect(updated.id).toBe('shift-101') // ID preserved

      const loaded = await service.getShifts()
      expect(loaded[0].hours).toBe(6)
      expect(loaded[0].grossEarningsPaise).toBe(120000)
    })

    it('throws StorageNotFoundError when updating non-existent shift', async () => {
      await expect(
        service.updateShift('non-existent', { hours: 4 })
      ).rejects.toThrow(StorageNotFoundError)
    })

    it('deletes an existing shift by stable ID', async () => {
      await service.addShift(sampleShift)
      const deleted = await service.deleteShift('shift-101')
      expect(deleted).toBe(true)

      const shifts = await service.getShifts()
      expect(shifts).toHaveLength(0)

      // Deleting again returns false
      const deletedAgain = await service.deleteShift('shift-101')
      expect(deletedAgain).toBe(false)
    })

    it('adds, updates and deletes an expense', async () => {
      await service.addExpense(sampleExpense)
      const expenses = await service.getExpenses()
      expect(expenses).toHaveLength(1)

      const updated = await service.updateExpense('exp-201', {
        amountPaise: 40000,
        label: 'Tyre puncture & oil',
      })
      expect(updated.amountPaise).toBe(40000)
      expect(updated.label).toBe('Tyre puncture & oil')

      const deleted = await service.deleteExpense('exp-201')
      expect(deleted).toBe(true)
      expect(await service.getExpenses()).toHaveLength(0)
    })

    it('throws StorageNotFoundError when updating non-existent expense', async () => {
      await expect(
        service.updateExpense('missing-id', { amountPaise: 1000 })
      ).rejects.toThrow(StorageNotFoundError)
    })
  })

  describe('4. Persistence Across Repository Reinitialization', () => {
    it('persists data across separate service instances using same backend', async () => {
      const service1 = new LocalStorageService(backend)
      await service1.saveProfile(sampleProfile)
      await service1.addShift(sampleShift)
      await service1.addExpense(sampleExpense)

      // Reinitialize a fresh service instance simulating app restart / reload
      const service2 = new LocalStorageService(backend)
      const loadedProfile = await service2.getProfile()
      const loadedShifts = await service2.getShifts()
      const loadedExpenses = await service2.getExpenses()

      expect(loadedProfile).toEqual(sampleProfile)
      expect(loadedShifts).toEqual([sampleShift])
      expect(loadedExpenses).toEqual([sampleExpense])
    })
  })

  describe('5. Corrupt JSON and Value Preservation', () => {
    it('throws StorageCorruptionError on corrupt JSON without destroying stored data', async () => {
      const corruptRaw = '{invalid:json,"unclosed'
      backend.setItem(STORAGE_KEYS.SHIFTS, corruptRaw)

      await expect(service.getShifts()).rejects.toThrow(StorageCorruptionError)

      // CRITICAL: Raw data must be preserved and not overwritten!
      expect(backend.getItem(STORAGE_KEYS.SHIFTS)).toBe(corruptRaw)
    })

    it('throws StorageCorruptionError for corrupt profile JSON and preserves raw string', async () => {
      const corruptProfileRaw = '{"displayName": unquoted}'
      backend.setItem(STORAGE_KEYS.PROFILE, corruptProfileRaw)

      await expect(service.getProfile()).rejects.toThrow(StorageCorruptionError)
      expect(backend.getItem(STORAGE_KEYS.PROFILE)).toBe(corruptProfileRaw)
    })
  })

  describe('6. Money Validation (Safe Integers in Paise)', () => {
    it('rejects floating-point paise in profile', async () => {
      const invalidProfile = {
        ...sampleProfile,
        currentCashPaise: 1500.5, // Not integer paise
      }
      await expect(service.saveProfile(invalidProfile as Profile)).rejects.toThrow(
        StorageValidationError
      )
    })

    it('rejects negative essentialDailySpendPaise', async () => {
      const invalidProfile = {
        ...sampleProfile,
        essentialDailySpendPaise: -100,
      }
      await expect(service.saveProfile(invalidProfile as Profile)).rejects.toThrow(
        StorageValidationError
      )
    })

    it('rejects negative work costs or non-safe-integer in shift', async () => {
      const invalidShift = {
        ...sampleShift,
        workCostsPaise: -500,
      }
      await expect(service.addShift(invalidShift as ShiftLog)).rejects.toThrow(
        StorageValidationError
      )

      const floatShift = {
        ...sampleShift,
        grossEarningsPaise: NaN,
      }
      await expect(service.addShift(floatShift as ShiftLog)).rejects.toThrow(
        StorageValidationError
      )
    })

    it('rejects negative expense amount', async () => {
      const invalidExpense = {
        ...sampleExpense,
        amountPaise: -2000,
      }
      await expect(service.addExpense(invalidExpense as PlannedExpense)).rejects.toThrow(
        StorageValidationError
      )
    })
  })

  describe('7. Duplicate IDs and ID Validation', () => {
    it('rejects duplicate shift IDs during batch save', async () => {
      const duplicateShifts = [
        sampleShift,
        { ...sampleShift, date: '2026-11-15' }, // Same id: shift-101
      ]
      await expect(service.saveShifts(duplicateShifts)).rejects.toThrow(
        StorageValidationError
      )
    })

    it('rejects adding a shift when ID already exists in storage', async () => {
      await service.addShift(sampleShift)
      await expect(service.addShift(sampleShift)).rejects.toThrow(
        StorageValidationError
      )
    })

    it('rejects duplicate expense IDs during batch save and addition', async () => {
      await service.addExpense(sampleExpense)
      await expect(service.addExpense(sampleExpense)).rejects.toThrow(
        StorageValidationError
      )
    })

    it('rejects records with missing or whitespace-only IDs', async () => {
      const invalidIdShift = {
        ...sampleShift,
        id: '   ',
      }
      await expect(service.addShift(invalidIdShift)).rejects.toThrow(
        StorageValidationError
      )
    })
  })

  describe('8. Storage Failures & Quota Errors', () => {
    it('throws StorageQuotaError when backend throws QuotaExceededError', async () => {
      const quotaBackend: typeof backend = {
        ...backend,
        setItem: () => {
          const quotaErr = new Error('Quota exceeded')
          quotaErr.name = 'QuotaExceededError'
          throw quotaErr
        },
      }
      const quotaService = new LocalStorageService(quotaBackend)

      await expect(quotaService.saveProfile(sampleProfile)).rejects.toThrow(
        StorageQuotaError
      )
    })

    it('throws StorageUnavailableError when storage read fails', async () => {
      const failingBackend: typeof backend = {
        ...backend,
        getItem: () => {
          throw new Error('Access denied to localStorage')
        },
      }
      const failingService = new LocalStorageService(failingBackend)

      await expect(failingService.getProfile()).rejects.toThrow(
        StorageUnavailableError
      )
    })
  })

  describe('9. Calendar Date Validation', () => {
    it('validates proper YYYY-MM-DD dates and rejects invalid calendar days', () => {
      expect(isValidLocalDate('2026-11-14')).toBe(true)
      expect(isValidLocalDate('2026-02-28')).toBe(true)

      // Invalid dates
      expect(isValidLocalDate('2026-02-31')).toBe(false) // Non-existent date
      expect(isValidLocalDate('14-11-2026')).toBe(false) // Wrong format
      expect(isValidLocalDate('2026/11/14')).toBe(false)
      expect(isValidLocalDate('invalid-date')).toBe(false)
    })

    it('provides valid today local date in YYYY-MM-DD format', () => {
      const today = getTodayLocalDate()
      expect(isValidLocalDate(today)).toBe(true)
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('rejects shifts with invalid calendar dates', async () => {
      const invalidDateShift: ShiftLog = {
        ...sampleShift,
        date: '2026-02-30', // Feb 30 does not exist
      }
      await expect(service.addShift(invalidDateShift)).rejects.toThrow(
        StorageValidationError
      )
    })
  })

  describe('10. Demo Scenario Isolation', () => {
    it('ensures demoProjection remains completely isolated from stored user data', async () => {
      // Modify stored data
      await service.saveProfile(sampleProfile)
      await service.addShift(sampleShift)

      // Assert demoProjection is unaltered
      expect(demoProjection.currentCashPaise).toBe(150000)
      expect(demoProjection.billAmountPaise).toBe(400000)
      expect(demoProjection.expectedNetEarningsPaise).toBe(400000)

      // Clearing stored data does not affect demoProjection
      await service.clearAll()
      expect(await service.getProfile()).toBeNull()
      expect(demoProjection.currentCashPaise).toBe(150000)
    })
  })

  describe('11. Safe Paise Helper', () => {
    it('strictly checks safe integers and non-negative constraints', () => {
      expect(isSafePaise(0)).toBe(true)
      expect(isSafePaise(100000)).toBe(true)
      expect(isSafePaise(-50, false)).toBe(false)
      expect(isSafePaise(-50, true)).toBe(true) // Negative allowed
      expect(isSafePaise(1.5)).toBe(false)
      expect(isSafePaise(NaN)).toBe(false)
      expect(isSafePaise(Infinity)).toBe(false)
      expect(isSafePaise('1000')).toBe(false)
    })
  })

  describe('12. Customer Storage Operations (Member 2 Module)', () => {
    it('returns empty array when no customers are stored', async () => {
      const customers = await service.getCustomers()
      expect(customers).toEqual([])
    })

    it('adds customer and saves all fields', async () => {
      const customer = await service.addCustomer({
        id: 'cust-101',
        name: 'Ramesh Sharma',
        contact: '+91 9876543210',
        note: 'Tea stall vendor',
        createdAt: '2026-11-14',
      })

      expect(customer.id).toBe('cust-101')
      expect(customer.name).toBe('Ramesh Sharma')
      expect(customer.contact).toBe('+91 9876543210')
      expect(customer.note).toBe('Tea stall vendor')

      const stored = await service.getCustomers()
      expect(stored.length).toBe(1)
      expect(stored[0].id).toBe('cust-101')
    })

    it('distinguishes customers with identical names using unique IDs', async () => {
      await service.addCustomer({
        id: 'cust-201',
        name: 'Ramesh Sharma',
        contact: '+91 9800000001',
        note: 'Mechanic at Sector 18',
        createdAt: '2026-11-14',
      })
      await service.addCustomer({
        id: 'cust-202',
        name: 'Ramesh Sharma', // Identical name
        contact: '+91 9800000002',
        note: 'Tea vendor at depot',
        createdAt: '2026-11-14',
      })

      const list = await service.getCustomers()
      const matching = list.filter((c) => c.name === 'Ramesh Sharma')
      expect(matching.length).toBe(2)
      expect(matching[0].id).toBe('cust-201')
      expect(matching[1].id).toBe('cust-202')
      expect(matching[0].contact).not.toBe(matching[1].contact)
    })

    it('prevents duplicate customer IDs', async () => {
      await service.addCustomer({
        id: 'cust-duplicate',
        name: 'First Person',
        contact: '1234567890',
        createdAt: '2026-11-14',
      })

      await expect(
        service.addCustomer({
          id: 'cust-duplicate',
          name: 'Second Person',
          contact: '9876543210',
          createdAt: '2026-11-14',
        })
      ).rejects.toThrow(StorageValidationError)
    })

    it('updates customer name, contact and note', async () => {
      await service.addCustomer({
        id: 'cust-edit-1',
        name: 'Original Name',
        contact: '1111111111',
        note: 'Original Note',
        createdAt: '2026-11-14',
      })

      const updated = await service.updateCustomer('cust-edit-1', {
        name: 'Updated Name',
        contact: '2222222222',
        note: 'Updated Note',
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.contact).toBe('2222222222')
      expect(updated.note).toBe('Updated Note')

      const stored = (await service.getCustomers()).find((c) => c.id === 'cust-edit-1')
      expect(stored?.name).toBe('Updated Name')
    })

    it('throws StorageNotFoundError when updating non-existent customer', async () => {
      await expect(
        service.updateCustomer('non-existent-id', { name: 'Nobody' })
      ).rejects.toThrow(StorageNotFoundError)
    })

    it('deletes customer by ID', async () => {
      await service.addCustomer({
        id: 'cust-del-1',
        name: 'To Delete',
        contact: '0000000000',
        createdAt: '2026-11-14',
      })

      const deleted = await service.deleteCustomer('cust-del-1')
      expect(deleted).toBe(true)

      const remaining = await service.getCustomers()
      expect(remaining.some((c) => c.id === 'cust-del-1')).toBe(false)
    })

    it('clears customers when clearAll() is called', async () => {
      await service.addCustomer({
        id: 'cust-clear',
        name: 'Will Clear',
        contact: '123',
        createdAt: '2026-11-14',
      })
      await service.clearAll()
      expect(await service.getCustomers()).toEqual([])
    })
  })

  describe('13. Udhaar Operations (Member 2 Module)', () => {
    const today = getTodayLocalDate()

    const validEntry: UdhaarEntry = {
      id: 'udh-test-1',
      profileId: 'rider-001',
      customerId: 'cust-101',
      originalAmountPaise: 50000, // ₹500
      description: 'Chai & snacks credit',
      entryDate: today,
      dueDate: addDaysToLocalDate(today, 5),
    }

    it('adds udhaar entry with positive amount, dates, and user ownership', async () => {
      const added = await service.addUdhaarEntry(validEntry)
      expect(added.id).toBe('udh-test-1')
      expect(added.originalAmountPaise).toBe(50000)
      expect(added.profileId).toBe('rider-001')
      expect(added.customerId).toBe('cust-101')
      expect(added.isSettled).toBe(false)

      const stored = await service.getUdhaarEntries()
      expect(stored.length).toBe(1)
      expect(stored[0].id).toBe('udh-test-1')
    })

    it('rejects non-positive, zero or fractional amounts', async () => {
      await expect(
        service.addUdhaarEntry({ ...validEntry, id: 'bad-1', originalAmountPaise: 0 })
      ).rejects.toThrow(StorageValidationError)

      await expect(
        service.addUdhaarEntry({ ...validEntry, id: 'bad-2', originalAmountPaise: -500 })
      ).rejects.toThrow(StorageValidationError)

      await expect(
        service.addUdhaarEntry({ ...validEntry, id: 'bad-3', originalAmountPaise: 100.5 })
      ).rejects.toThrow(StorageValidationError)
    })

    it('rejects entries with missing user ownership (profileId) or customerId', async () => {
      await expect(
        service.addUdhaarEntry({ ...validEntry, id: 'bad-4', profileId: '' })
      ).rejects.toThrow(StorageValidationError)

      await expect(
        service.addUdhaarEntry({ ...validEntry, id: 'bad-5', customerId: '' })
      ).rejects.toThrow(StorageValidationError)
    })

    it('rejects entries with invalid calendar dates', async () => {
      await expect(
        service.addUdhaarEntry({ ...validEntry, id: 'bad-6', entryDate: '2026-02-30' })
      ).rejects.toThrow(StorageValidationError)

      await expect(
        service.addUdhaarEntry({ ...validEntry, id: 'bad-7', dueDate: 'invalid-date' })
      ).rejects.toThrow(StorageValidationError)
    })

    it('derives states correctly: pending, due-today, overdue, settled', () => {
      // Pending: due in the future
      expect(
        deriveUdhaarStatus({ dueDate: addDaysToLocalDate(today, 3), isSettled: false }, today)
      ).toBe('pending')

      // Due Today: dueDate === today
      expect(
        deriveUdhaarStatus({ dueDate: today, isSettled: false }, today)
      ).toBe('due-today')

      // Overdue: dueDate < today
      expect(
        deriveUdhaarStatus({ dueDate: addDaysToLocalDate(today, -1), isSettled: false }, today)
      ).toBe('overdue')

      // Settled: isSettled is true, regardless of date
      expect(
        deriveUdhaarStatus({ dueDate: addDaysToLocalDate(today, -5), isSettled: true }, today)
      ).toBe('settled')
      expect(
        deriveUdhaarStatus({ dueDate: addDaysToLocalDate(today, 5), isSettled: true }, today)
      ).toBe('settled')
    })

    it('calculates customer outstanding paise, ignoring settled entries', () => {
      const entries: UdhaarEntry[] = [
        {
          id: 'u1',
          profileId: 'rider-001',
          customerId: 'cust-A',
          originalAmountPaise: 30000, // ₹300
          description: 'Item 1',
          entryDate: today,
          dueDate: today,
          isSettled: false,
        },
        {
          id: 'u2',
          profileId: 'rider-001',
          customerId: 'cust-A',
          originalAmountPaise: 70000, // ₹700
          description: 'Item 2',
          entryDate: today,
          dueDate: addDaysToLocalDate(today, 2),
          isSettled: false,
        },
        {
          id: 'u3',
          profileId: 'rider-001',
          customerId: 'cust-A',
          originalAmountPaise: 50000, // ₹500 - settled!
          description: 'Item 3',
          entryDate: today,
          dueDate: today,
          isSettled: true,
        },
        {
          id: 'u4',
          profileId: 'rider-001',
          customerId: 'cust-B',
          originalAmountPaise: 40000,
          description: 'Item 4',
          entryDate: today,
          dueDate: today,
          isSettled: false,
        },
      ]

      // For cust-A: 30000 + 70000 = 100000 (settled u3 is excluded)
      expect(calculateCustomerOutstandingPaise(entries, 'cust-A')).toBe(100000)

      // Total across all customers: 30000 + 70000 + 40000 = 140000
      expect(calculateCustomerOutstandingPaise(entries)).toBe(140000)
    })

    it('settles an udhaar entry and records settledAt date', async () => {
      await service.addUdhaarEntry(validEntry)
      const settled = await service.settleUdhaarEntry('udh-test-1', today)

      expect(settled.isSettled).toBe(true)
      expect(settled.settledAt).toBe(today)

      const stored = await service.getUdhaarEntries('cust-101')
      expect(stored[0].isSettled).toBe(true)
      expect(calculateCustomerOutstandingPaise(stored, 'cust-101')).toBe(0)
    })

    it('creating udhaar must NOT create cash income or alter declared cash balance', async () => {
      await service.saveProfile(sampleProfile)
      const initialProfile = await service.getProfile()
      const initialCash = initialProfile!.currentCashPaise
      const initialTransactions = await service.getTransactions()

      // Add udhaar entry
      await service.addUdhaarEntry(validEntry)

      // Assert declared cash balance did NOT change
      const afterProfile = await service.getProfile()
      expect(afterProfile!.currentCashPaise).toBe(initialCash)

      // Assert transactions ledger contains no new cash income transaction
      const afterTransactions = await service.getTransactions()
      expect(afterTransactions.length).toBe(initialTransactions.length)
    })

    it('does NOT delete financial history when archiving or deleting a customer', async () => {
      // Create customer
      const cust = await service.addCustomer({
        id: 'cust-financial-archive',
        name: 'Persistent Customer',
        contact: '9999999999',
        createdAt: today,
      })

      // Create two udhaar entries
      await service.addUdhaarEntry({
        ...validEntry,
        id: 'fin-udh-1',
        customerId: cust.id,
      })
      await service.addUdhaarEntry({
        ...validEntry,
        id: 'fin-udh-2',
        customerId: cust.id,
        originalAmountPaise: 25000,
      })

      // 1. Archive customer
      const archived = await service.archiveCustomer(cust.id)
      expect(archived.isArchived).toBe(true)
      expect(archived.archivedAt).toBe(today)

      // Udhaar entries must still exist
      let customerUdhaars = await service.getUdhaarEntries(cust.id)
      expect(customerUdhaars.length).toBe(2)

      // 2. Delete customer from active customer list
      await service.deleteCustomer(cust.id)
      const customersAfterDelete = await service.getCustomers()
      expect(customersAfterDelete.some((c) => c.id === cust.id)).toBe(false)

      // Financial history (Udhaar entries) must STILL be preserved in storage!
      customerUdhaars = await service.getUdhaarEntries(cust.id)
      expect(customerUdhaars.length).toBe(2)
      expect(customerUdhaars[0].id).toBe('fin-udh-1')
      expect(customerUdhaars[1].id).toBe('fin-udh-2')
    })
  })

  describe('14. Repayment Operations (Member 2 Module)', () => {
    const today = getTodayLocalDate()

    beforeEach(async () => {
      await service.addCustomer({
        id: 'cust-rep-1',
        name: 'Suresh Kumar',
        contact: '9876543210',
        createdAt: today,
      })
      await service.addUdhaarEntry({
        id: 'udh-rep-1',
        profileId: 'rider-001',
        customerId: 'cust-rep-1',
        originalAmountPaise: 100000, // ₹1,000
        description: 'Rear tyre change credit',
        entryDate: today,
        dueDate: addDaysToLocalDate(today, 7),
      })
    })

    it('records partial repayment, reduces outstanding amount, and creates linked cash transaction', async () => {
      const result = await service.recordRepayment({
        profileId: 'rider-001',
        udhaarId: 'udh-rep-1',
        amountPaise: 40000, // ₹400 partial repayment
        date: today,
        paymentMode: 'cash',
        note: 'First installment paid in cash',
      })

      // 1. Repayment record check
      expect(result.repayment.amountPaise).toBe(40000)
      expect(result.repayment.profileId).toBe('rider-001')
      expect(result.repayment.udhaarId).toBe('udh-rep-1')
      expect(result.repayment.customerId).toBe('cust-rep-1')
      expect(result.repayment.paymentMode).toBe('cash')
      expect(result.repayment.note).toBe('First installment paid in cash')

      // 2. Updated Udhaar entry check
      expect(result.updatedEntry.repaidAmountPaise).toBe(40000)
      expect(result.updatedEntry.isSettled).toBe(false)
      expect(getUdhaarRemainingPaise(result.updatedEntry)).toBe(60000) // ₹600 remaining

      // 3. Linked cash-received transaction check (shared transaction ledger)
      expect(result.transaction.amountPaise).toBe(40000)
      expect(result.transaction.type).toBe('income')
      expect(result.transaction.category).toBe('other income')
      expect(result.transaction.paymentMode).toBe('cash')
      expect(result.transaction.repaymentId).toBe(result.repayment.id)
      expect(result.transaction.udhaarId).toBe('udh-rep-1')
      expect(result.repayment.transactionId).toBe(result.transaction.id)

      // 4. Persistence verification
      const repaymentsInStore = await service.getRepayments('udh-rep-1')
      expect(repaymentsInStore.length).toBe(1)
      expect(repaymentsInStore[0].id).toBe(result.repayment.id)

      const transactionsInStore = await service.getTransactions()
      expect(transactionsInStore.length).toBe(1)
      expect(transactionsInStore[0].id).toBe(result.transaction.id)

      const storedEntries = await service.getUdhaarEntries('cust-rep-1')
      expect(getUdhaarRemainingPaise(storedEntries[0])).toBe(60000)
    })

    it('records full repayment, clears remaining balance and sets isSettled to true', async () => {
      // First partial payment
      await service.recordRepayment({
        profileId: 'rider-001',
        udhaarId: 'udh-rep-1',
        amountPaise: 40000,
      })

      // Final settlement repayment
      const result = await service.recordRepayment({
        profileId: 'rider-001',
        udhaarId: 'udh-rep-1',
        amountPaise: 60000, // Remaining ₹600
        date: today,
        paymentMode: 'cash',
      })

      expect(result.updatedEntry.repaidAmountPaise).toBe(100000)
      expect(result.updatedEntry.isSettled).toBe(true)
      expect(result.updatedEntry.settledAt).toBe(today)
      expect(getUdhaarRemainingPaise(result.updatedEntry)).toBe(0)

      const storedEntries = await service.getUdhaarEntries('cust-rep-1')
      expect(storedEntries[0].isSettled).toBe(true)
      expect(calculateCustomerOutstandingPaise(storedEntries, 'cust-rep-1')).toBe(0)

      // Total 2 repayments and 2 cash transactions recorded
      const allRepayments = await service.getRepayments('udh-rep-1')
      expect(allRepayments.length).toBe(2)
      const allTransactions = await service.getTransactions()
      expect(allTransactions.length).toBe(2)
    })

    it('rejects zero, negative and fractional repayments', async () => {
      await expect(
        service.recordRepayment({
          profileId: 'rider-001',
          udhaarId: 'udh-rep-1',
          amountPaise: 0,
        })
      ).rejects.toThrow(StorageValidationError)

      await expect(
        service.recordRepayment({
          profileId: 'rider-001',
          udhaarId: 'udh-rep-1',
          amountPaise: -5000,
        })
      ).rejects.toThrow(StorageValidationError)

      await expect(
        service.recordRepayment({
          profileId: 'rider-001',
          udhaarId: 'udh-rep-1',
          amountPaise: 100.5,
        })
      ).rejects.toThrow(StorageValidationError)
    })

    it('rejects overpayment exceeding the remaining outstanding amount', async () => {
      // Entry is ₹1,000. Attempt repayment of ₹1,001 (100100 paise)
      await expect(
        service.recordRepayment({
          profileId: 'rider-001',
          udhaarId: 'udh-rep-1',
          amountPaise: 100100,
        })
      ).rejects.toThrow(StorageValidationError)

      // Partially repay ₹400
      await service.recordRepayment({
        profileId: 'rider-001',
        udhaarId: 'udh-rep-1',
        amountPaise: 40000,
      })

      // Remaining is ₹600. Attempt repayment of ₹650 (65000 paise)
      await expect(
        service.recordRepayment({
          profileId: 'rider-001',
          udhaarId: 'udh-rep-1',
          amountPaise: 65000,
        })
      ).rejects.toThrow(StorageValidationError)
    })

    it('enforces backend user ownership', async () => {
      // udh-rep-1 belongs to 'rider-001'. An attempt with 'rider-999' must fail
      await expect(
        service.recordRepayment({
          profileId: 'rider-999',
          udhaarId: 'udh-rep-1',
          amountPaise: 10000,
        })
      ).rejects.toThrow(StorageValidationError)
    })

    it('protects against duplicate submissions with the same requestId', async () => {
      const requestId = 'req-dedup-token-12345'

      // First submission succeeds
      const firstResult = await service.recordRepayment({
        requestId,
        profileId: 'rider-001',
        udhaarId: 'udh-rep-1',
        amountPaise: 20000,
      })
      expect(firstResult.repayment.amountPaise).toBe(20000)

      // Duplicate submission with same requestId is rejected
      await expect(
        service.recordRepayment({
          requestId,
          profileId: 'rider-001',
          udhaarId: 'udh-rep-1',
          amountPaise: 20000,
        })
      ).rejects.toThrow(StorageValidationError)

      // Verify exactly 1 repayment and 1 transaction exists in storage
      const repayments = await service.getRepayments('udh-rep-1')
      expect(repayments.length).toBe(1)
      const transactions = await service.getTransactions()
      expect(transactions.length).toBe(1)
    })

    it('handles saving failure atomically without corrupted partial writes or false success', async () => {
      // Create backend that throws when saving transactions
      let failWrites = false
      const faultyBackend = {
        ...backend,
        setItem: (key: string, value: string) => {
          if (failWrites && key === STORAGE_KEYS.TRANSACTIONS) {
            throw new StorageUnavailableError('Simulated transaction storage write crash')
          }
          backend.setItem(key, value)
        },
      }
      const faultyService = new LocalStorageService(faultyBackend)

      // Turn on write failure
      failWrites = true

      // Attempt recording repayment
      await expect(
        faultyService.recordRepayment({
          profileId: 'rider-001',
          udhaarId: 'udh-rep-1',
          amountPaise: 50000,
        })
      ).rejects.toThrow('Simulated transaction storage write crash')

      // Turn off write failure to inspect storage state
      failWrites = false

      // Assert rollback: udhaar entry remaining balance is NOT modified
      const entriesAfter = await faultyService.getUdhaarEntries('cust-rep-1')
      expect(entriesAfter[0].repaidAmountPaise).toBe(0)
      expect(entriesAfter[0].isSettled).toBe(false)

      // Assert rollback: no repayment record was saved
      const repaymentsAfter = await faultyService.getRepayments('udh-rep-1')
      expect(repaymentsAfter.length).toBe(0)

      // Assert rollback: no transaction was saved
      const transactionsAfter = await faultyService.getTransactions()
      expect(transactionsAfter.length).toBe(0)
    })
  })
})
