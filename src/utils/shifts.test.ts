import { describe, it, expect, beforeEach } from 'vitest'
import {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  calculateNetPaise,
  calculateNetHourlyPaise,
  validateShiftInput,
  calculateShiftSummary,
  calculateSlotStatistics,
} from './shifts'
import {
  LocalStorageService,
  createMemoryStorageBackend,
} from '../services/storage'
import type { ShiftLog } from '../types'

describe('Shift Utility Calculations & Validations', () => {
  describe('Rupees and Paise Conversions', () => {
    it('converts decimal rupees to integer paise accurately', () => {
      expect(rupeesToPaise(850)).toBe(85000)
      expect(rupeesToPaise(0)).toBe(0)
      expect(rupeesToPaise(45.5)).toBe(4550)
      expect(rupeesToPaise(100.25)).toBe(10025)
    })

    it('converts integer paise back to rupees', () => {
      expect(paiseToRupees(85000)).toBe(850)
      expect(paiseToRupees(0)).toBe(0)
      expect(paiseToRupees(4550)).toBe(45.5)
    })

    it('rejects non-finite rupees conversion', () => {
      expect(() => rupeesToPaise(NaN)).toThrow()
      expect(() => rupeesToPaise(Infinity)).toThrow()
    })
  })

  describe('Currency Formatting', () => {
    it('formats positive paise values with Indian Rupee symbol', () => {
      const formatted = formatRupees(150000) // ₹1,500
      expect(formatted).toContain('1,500')
    })

    it('formats zero paise correctly', () => {
      const formatted = formatRupees(0)
      expect(formatted).toContain('0')
    })

    it('formats negative paise with leading minus symbol', () => {
      const formatted = formatRupees(-35000) // -₹350
      expect(formatted).toMatch(/^-.*350/)
    })
  })

  describe('Net Earnings & Hourly Rate Calculations', () => {
    it('calculates positive net earnings', () => {
      // Gross ₹850, Costs ₹200 -> Net ₹650
      expect(calculateNetPaise(85000, 20000)).toBe(65000)
    })

    it('calculates and preserves negative net earnings when fuel/repair exceeds gross', () => {
      // Gross ₹200, Costs ₹550 (e.g. puncture + petrol) -> Net -₹350
      expect(calculateNetPaise(20000, 55000)).toBe(-35000)
    })

    it('calculates net hourly rate in paise', () => {
      // Net ₹600 for 4 hours -> ₹150/hr (15000 paise)
      expect(calculateNetHourlyPaise(60000, 4)).toBe(15000)
    })

    it('handles negative hourly rate and zero hours gracefully', () => {
      // Net -₹300 for 3 hours -> -₹100/hr
      expect(calculateNetHourlyPaise(-30000, 3)).toBe(-10000)
      expect(calculateNetHourlyPaise(50000, 0)).toBe(0)
      expect(calculateNetHourlyPaise(50000, -2)).toBe(0)
    })
  })

  describe('Form Input Validations', () => {
    it('accepts valid shift form input', () => {
      const valid = {
        date: '2026-11-14',
        slot: 'evening' as const,
        hours: '4.5',
        grossRupees: '850',
        workCostsRupees: '150',
      }
      const errors = validateShiftInput(valid)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('rejects invalid or missing date', () => {
      const invalidDate = {
        date: 'invalid-date',
        slot: 'evening' as const,
        hours: '4',
        grossRupees: '800',
        workCostsRupees: '100',
      }
      expect(validateShiftInput(invalidDate).date).toBeDefined()

      const nonExistentDay = {
        ...invalidDate,
        date: '2026-02-31',
      }
      expect(validateShiftInput(nonExistentDay).date).toBeDefined()
    })

    it('rejects invalid hours (<= 0, > 24, non-numeric)', () => {
      const zeroHours = {
        date: '2026-11-14',
        slot: 'evening' as const,
        hours: '0',
        grossRupees: '800',
        workCostsRupees: '100',
      }
      expect(validateShiftInput(zeroHours).hours).toBeDefined()

      const excessiveHours = { ...zeroHours, hours: '25' }
      expect(validateShiftInput(excessiveHours).hours).toBeDefined()

      const nonNumHours = { ...zeroHours, hours: 'abc' }
      expect(validateShiftInput(nonNumHours).hours).toBeDefined()
    })

    it('rejects negative gross earnings or negative work costs', () => {
      const negativeGross = {
        date: '2026-11-14',
        slot: 'evening' as const,
        hours: '4',
        grossRupees: '-500',
        workCostsRupees: '100',
      }
      expect(validateShiftInput(negativeGross).grossRupees).toBeDefined()

      const negativeCost = {
        date: '2026-11-14',
        slot: 'evening' as const,
        hours: '4',
        grossRupees: '500',
        workCostsRupees: '-100',
      }
      expect(validateShiftInput(negativeCost).workCostsRupees).toBeDefined()
    })
  })

  describe('Shift Summary Aggregations (Member 4 Integration Contract)', () => {
    it('returns zeroes for empty shift history', () => {
      const summary = calculateShiftSummary([])
      expect(summary.totalHours).toBe(0)
      expect(summary.totalGrossPaise).toBe(0)
      expect(summary.totalWorkCostsPaise).toBe(0)
      expect(summary.totalNetPaise).toBe(0)
      expect(summary.averageNetHourlyPaise).toBe(0)
      expect(summary.shiftCount).toBe(0)
    })

    it('aggregates multiple shifts and computes average net hourly rate', () => {
      const shifts: ShiftLog[] = [
        {
          id: 's1',
          profileId: 'p1',
          date: '2026-11-13',
          slot: 'morning',
          hours: 4,
          grossEarningsPaise: 80000, // ₹800
          workCostsPaise: 20000, // ₹200 -> Net ₹600 (₹150/hr)
        },
        {
          id: 's2',
          profileId: 'p1',
          date: '2026-11-14',
          slot: 'evening',
          hours: 6,
          grossEarningsPaise: 150000, // ₹1,500
          workCostsPaise: 30000, // ₹300 -> Net ₹1,200 (₹200/hr)
        },
      ]

      const summary = calculateShiftSummary(shifts)
      expect(summary.shiftCount).toBe(2)
      expect(summary.totalHours).toBe(10)
      expect(summary.totalGrossPaise).toBe(230000) // ₹2,300
      expect(summary.totalWorkCostsPaise).toBe(50000) // ₹500
      expect(summary.totalNetPaise).toBe(180000) // ₹1,800
      expect(summary.averageNetHourlyPaise).toBe(18000) // ₹180/hr
    })

    it('correctly incorporates negative net shifts in total net earnings', () => {
      const shifts: ShiftLog[] = [
        {
          id: 's1',
          profileId: 'p1',
          date: '2026-11-13',
          slot: 'morning',
          hours: 4,
          grossEarningsPaise: 50000, // ₹500
          workCostsPaise: 10000, // ₹100 -> Net +₹400
        },
        {
          id: 's2',
          profileId: 'p1',
          date: '2026-11-14',
          slot: 'night',
          hours: 3,
          grossEarningsPaise: 20000, // ₹200
          workCostsPaise: 50000, // ₹500 -> Net -₹300 (breakdown/puncture)
        },
      ]

      const summary = calculateShiftSummary(shifts)
      expect(summary.totalHours).toBe(7)
      expect(summary.totalGrossPaise).toBe(70000)
      expect(summary.totalWorkCostsPaise).toBe(60000)
      expect(summary.totalNetPaise).toBe(10000) // ₹400 - ₹300 = ₹100
      expect(summary.averageNetHourlyPaise).toBe(Math.round(10000 / 7))
    })
  })

  describe('Slot-by-Slot Statistics (Member 4 Baseline Contract)', () => {
    it('breaks down earnings and hourly rates by shift time slot', () => {
      const shifts: ShiftLog[] = [
        {
          id: 's1',
          profileId: 'p1',
          date: '2026-11-13',
          slot: 'evening',
          hours: 4,
          grossEarningsPaise: 100000,
          workCostsPaise: 20000, // Net 80,000 paise (20,000/hr)
        },
        {
          id: 's2',
          profileId: 'p1',
          date: '2026-11-14',
          slot: 'evening',
          hours: 4,
          grossEarningsPaise: 120000,
          workCostsPaise: 20000, // Net 100,000 paise (25,000/hr)
        },
        {
          id: 's3',
          profileId: 'p1',
          date: '2026-11-14',
          slot: 'morning',
          hours: 3,
          grossEarningsPaise: 45000,
          workCostsPaise: 15000, // Net 30,000 paise (10,000/hr)
        },
      ]

      const stats = calculateSlotStatistics(shifts)
      expect(stats.evening.shiftCount).toBe(2)
      expect(stats.evening.totalHours).toBe(8)
      expect(stats.evening.totalNetPaise).toBe(180000)
      expect(stats.evening.averageNetHourlyPaise).toBe(22500) // ₹225/hr

      expect(stats.morning.shiftCount).toBe(1)
      expect(stats.morning.totalHours).toBe(3)
      expect(stats.morning.averageNetHourlyPaise).toBe(10000) // ₹100/hr

      expect(stats.afternoon.shiftCount).toBe(0)
      expect(stats.night.shiftCount).toBe(0)
    })
  })

  describe('Work-Session Storage Integration', () => {
    let service: LocalStorageService

    beforeEach(() => {
      const backend = createMemoryStorageBackend()
      service = new LocalStorageService(backend)
    })

    it('persists a new shift converted from form rupees', async () => {
      const formInput = {
        date: '2026-11-14',
        slot: 'evening' as const,
        hours: 4.5,
        grossRupees: 900,
        workCostsRupees: 200,
      }

      const newShift: ShiftLog = {
        id: 'shift-generated-1',
        profileId: 'rider-default',
        date: formInput.date,
        slot: formInput.slot,
        hours: formInput.hours,
        grossEarningsPaise: rupeesToPaise(formInput.grossRupees),
        workCostsPaise: rupeesToPaise(formInput.workCostsRupees),
      }

      await service.addShift(newShift)
      const stored = await service.getShifts()

      expect(stored).toHaveLength(1)
      expect(stored[0].grossEarningsPaise).toBe(90000)
      expect(stored[0].workCostsPaise).toBe(20000)

      const netPaise = calculateNetPaise(
        stored[0].grossEarningsPaise,
        stored[0].workCostsPaise
      )
      expect(netPaise).toBe(70000) // ₹700 net
    })
  })
})
