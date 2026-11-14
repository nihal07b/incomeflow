import type { ShiftLog, TimeSlot, MoneyPaise, LocalDate } from '../types'
import { isValidLocalDate } from '../services/storage'

export interface ShiftFormInput {
  date: LocalDate
  slot: TimeSlot
  hours: string | number
  grossRupees: string | number
  workCostsRupees: string | number
}

export interface ShiftFormErrors {
  date?: string
  slot?: string
  hours?: string
  grossRupees?: string
  workCostsRupees?: string
  general?: string
}

export interface ShiftSummary {
  totalHours: number
  totalGrossPaise: MoneyPaise
  totalWorkCostsPaise: MoneyPaise
  totalNetPaise: MoneyPaise
  averageNetHourlyPaise: MoneyPaise
  shiftCount: number
}

export interface SlotStatistics {
  slot: TimeSlot
  shiftCount: number
  totalHours: number
  totalNetPaise: MoneyPaise
  averageNetHourlyPaise: MoneyPaise
}

/**
 * Currency conversion: Decimal Rupees to Safe Integer Paise
 * ₹1 = 100 paise
 */
export function rupeesToPaise(rupees: number): MoneyPaise {
  if (!Number.isFinite(rupees)) {
    throw new Error('Rupees amount must be a finite number')
  }
  return Math.round(rupees * 100)
}

/**
 * Currency conversion: Safe Integer Paise to Decimal Rupees
 */
export function paiseToRupees(paise: MoneyPaise): number {
  if (!Number.isSafeInteger(paise)) {
    throw new Error('Paise amount must be a safe integer')
  }
  return paise / 100
}

/**
 * Format integer paise into Indian Rupee currency format (₹).
 * Supports negative amounts with leading minus (e.g. -₹300).
 */
export function formatRupees(paise: MoneyPaise): string {
  const isNegative = paise < 0
  const absPaise = Math.abs(paise)
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(absPaise / 100)

  return isNegative ? `-${formatted}` : formatted
}

/**
 * Format Slot name with standard delivery shift time window
 */
export function formatSlotLabel(slot: TimeSlot): string {
  switch (slot) {
    case 'morning':
      return 'Morning (6am – 12pm)'
    case 'afternoon':
      return 'Afternoon (12pm – 5pm)'
    case 'evening':
      return 'Evening (5pm – 9pm)'
    case 'night':
      return 'Night (9pm – 2am)'
  }
}

/**
 * Net earnings in paise: gross minus work costs.
 * Allows and preserves negative net earnings.
 */
export function calculateNetPaise(grossPaise: MoneyPaise, workCostsPaise: MoneyPaise): MoneyPaise {
  return grossPaise - workCostsPaise
}

/**
 * Net hourly rate in paise: net paise / hours worked.
 */
export function calculateNetHourlyPaise(netPaise: MoneyPaise, hours: number): MoneyPaise {
  if (hours <= 0 || !Number.isFinite(hours)) return 0
  return Math.round(netPaise / hours)
}

/**
 * Validates user input from the Shift Form.
 * Returns an errors object; empty if valid.
 */
export function validateShiftInput(input: ShiftFormInput): ShiftFormErrors {
  const errors: ShiftFormErrors = {}

  // Date validation
  if (!input.date || typeof input.date !== 'string' || input.date.trim() === '') {
    errors.date = 'Date is required'
  } else if (!isValidLocalDate(input.date)) {
    errors.date = 'Please enter a valid calendar date (YYYY-MM-DD)'
  }

  // Slot validation
  const validSlots: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night']
  if (!input.slot || !validSlots.includes(input.slot)) {
    errors.slot = 'Please select a valid shift time slot'
  }

  // Hours validation
  const numHours = Number(input.hours)
  if (input.hours === '' || input.hours === null || input.hours === undefined) {
    errors.hours = 'Hours worked is required'
  } else if (Number.isNaN(numHours) || !Number.isFinite(numHours)) {
    errors.hours = 'Hours must be a valid number'
  } else if (numHours <= 0) {
    errors.hours = 'Hours worked must be greater than 0'
  } else if (numHours > 24) {
    errors.hours = 'Hours cannot exceed 24 hours in a single shift'
  }

  // Gross earnings validation
  const numGross = Number(input.grossRupees)
  if (input.grossRupees === '' || input.grossRupees === null || input.grossRupees === undefined) {
    errors.grossRupees = 'Gross platform earnings are required'
  } else if (Number.isNaN(numGross) || !Number.isFinite(numGross)) {
    errors.grossRupees = 'Gross earnings must be a valid number'
  } else if (numGross < 0) {
    errors.grossRupees = 'Gross platform earnings cannot be negative'
  }

  // Work costs validation
  const numCosts = Number(input.workCostsRupees)
  if (input.workCostsRupees === '' || input.workCostsRupees === null || input.workCostsRupees === undefined) {
    errors.workCostsRupees = 'Work costs (fuel/bike) are required (enter 0 if none)'
  } else if (Number.isNaN(numCosts) || !Number.isFinite(numCosts)) {
    errors.workCostsRupees = 'Work costs must be a valid number'
  } else if (numCosts < 0) {
    errors.workCostsRupees = 'Work costs cannot be negative'
  }

  return errors
}

/**
 * Calculates aggregate summary metrics across a list of logged shifts.
 * Integration contract helper for dashboard and Member 4's planning module.
 */
export function calculateShiftSummary(shifts: ShiftLog[]): ShiftSummary {
  if (!shifts || shifts.length === 0) {
    return {
      totalHours: 0,
      totalGrossPaise: 0,
      totalWorkCostsPaise: 0,
      totalNetPaise: 0,
      averageNetHourlyPaise: 0,
      shiftCount: 0,
    }
  }

  let totalHours = 0
  let totalGrossPaise = 0
  let totalWorkCostsPaise = 0

  for (const shift of shifts) {
    totalHours += shift.hours
    totalGrossPaise += shift.grossEarningsPaise
    totalWorkCostsPaise += shift.workCostsPaise
  }

  const totalNetPaise = totalGrossPaise - totalWorkCostsPaise
  const averageNetHourlyPaise =
    totalHours > 0 ? Math.round(totalNetPaise / totalHours) : 0

  return {
    totalHours: Number(totalHours.toFixed(1)),
    totalGrossPaise,
    totalWorkCostsPaise,
    totalNetPaise,
    averageNetHourlyPaise,
    shiftCount: shifts.length,
  }
}

/**
 * Calculates slot-by-slot averages.
 * Integration contract helper for Member 4's baseline prediction engine.
 */
export function calculateSlotStatistics(shifts: ShiftLog[]): Record<TimeSlot, SlotStatistics> {
  const slots: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night']
  const result = {} as Record<TimeSlot, SlotStatistics>

  for (const slot of slots) {
    result[slot] = {
      slot,
      shiftCount: 0,
      totalHours: 0,
      totalNetPaise: 0,
      averageNetHourlyPaise: 0,
    }
  }

  for (const shift of shifts) {
    const stat = result[shift.slot]
    if (stat) {
      stat.shiftCount += 1
      stat.totalHours += shift.hours
      stat.totalNetPaise += shift.grossEarningsPaise - shift.workCostsPaise
    }
  }

  for (const slot of slots) {
    const stat = result[slot]
    if (stat.totalHours > 0) {
      stat.averageNetHourlyPaise = Math.round(stat.totalNetPaise / stat.totalHours)
      stat.totalHours = Number(stat.totalHours.toFixed(1))
    }
  }

  return result
}
