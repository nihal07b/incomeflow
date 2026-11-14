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
} from './storage'
import type { Profile, ShiftLog, PlannedExpense } from '../types'
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
})
