import type { MoneyPaise, LocalDate, ShiftLog } from '../types'
import type { TransactionRecord, PaymentMode } from '../services/storage'
import type { ShiftSummary } from '../utils/shifts'
import type { TransactionSummary } from '../utils/transactions'

/**
 * ============================================================================
 * INCOMEFLOW MULTI-MODULE INTEGRATION SPECIFICATION
 * ============================================================================
 * This specification defines the authoritative integration contracts between:
 * - Member 1: Shared Foundation, Navigation, Storage, Shifts & Transactions
 * - Member 2: Udhaar (Peer-to-Peer Informal Borrowing & Lending)
 * - Member 3: Bills & Locked Savings Vaults
 * - Member 4: Predictive Analytics, Shift Planning & Cashflow Engine
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
 * 1. MEMBER 2 INTEGRATION CONTRACT (Udhaar & Debt Repayments)
 * ----------------------------------------------------------------------------
 * Problem Space:
 * Delivery riders frequently take small informal credit from petrol pumps,
 * mechanics, and tea stalls, or lend money to co-riders.
 *
 * Rules:
 * a. Borrowed Udhaar principal is a LIABILITY, NEVER earned income.
 * b. Repaying an Udhaar MUST be logged as a cash outflow (expense transaction).
 * c. Receiving repayment for money previously lent is a cash recovery, NOT platform income.
 */

export type UdhaarType = 'borrowed' | 'lent'
export type UdhaarStatus = 'pending' | 'partially-paid' | 'settled'

export interface UdhaarRecord {
  id: string
  profileId: string
  counterpartyName: string // e.g., "Rajesh Petrol Pump", "Mukesh Mechanic"
  type: UdhaarType
  principalAmountPaise: MoneyPaise
  remainingAmountPaise: MoneyPaise
  dueDate: LocalDate
  status: UdhaarStatus
  notes?: string
  createdAt: LocalDate
  linkedTransactionIds: string[] // IDs of TransactionRecord entries generated upon repayment
}

/**
 * Contract function for Member 2 to execute an Udhaar repayment.
 * Repayment updates the Udhaar record AND creates a linked financial transaction.
 */
export interface RepayUdhaarParams {
  udhaarId: string
  repaymentAmountPaise: MoneyPaise
  paymentMode: PaymentMode
  date: LocalDate
  note?: string
}

/* ----------------------------------------------------------------------------
 * 2. MEMBER 3 INTEGRATION CONTRACT (Bills & Savings Vaults)
 * ----------------------------------------------------------------------------
 * Problem Space:
 * Riders need to pay an upcoming non-negotiable bill (e.g. Bike EMI, rent)
 * and protect money from daily impulsive spending.
 *
 * Rules:
 * a. Savings Vault money is an ASSET, NOT an ordinary spent expense.
 *    Allocating ₹500 to a vault locks it away from daily discretionary cash,
 *    but does NOT reduce net worth.
 * b. Paying a bill records an actual expense transaction and releases/settles
 *    the corresponding vault cushion.
 */

export type BillCategory = 'bike-emi' | 'room-rent' | 'phone-recharge' | 'insurance' | 'other'
export type BillStatus = 'upcoming' | 'paid' | 'overdue'

export interface BillRecord {
  id: string
  profileId: string
  label: string // e.g., "TVS Apache Loan EMI"
  category: BillCategory
  amountPaise: MoneyPaise
  dueDate: LocalDate
  status: BillStatus
  linkedTransactionId?: string // Populated when paid
}

export interface SavingsVaultRecord {
  id: string
  profileId: string
  label: string // e.g., "Protected Cushion", "EMI Reserve"
  targetAmountPaise: MoneyPaise
  allocatedAmountPaise: MoneyPaise // Virtual reservation from declared cash
  isLocked: boolean
  lockedUntilDate?: LocalDate
}

/* ----------------------------------------------------------------------------
 * 3. MEMBER 4 INTEGRATION CONTRACT (Analytics & Shift Planning Engine)
 * ----------------------------------------------------------------------------
 * Problem Space:
 * Computes daily cashflow trajectories up to the bill due date and advises
 * riders how many additional shifts to work if a shortfall exists.
 *
 * Inputs Required by Member 4:
 * a. Current liquid cash (from Profile + Transactions net - Vault allocations)
 * b. Daily essential spend baseline (from Profile & historical food/household transactions)
 * c. Upcoming bill amount and due date (from Member 3)
 * d. Udhaar repayments due before the bill date (from Member 2)
 * e. Historical shift productivity by slot (from Member 1's calculateSlotStatistics)
 */

export interface DailyCashProjection {
  date: LocalDate
  openingCashPaise: MoneyPaise
  expectedShiftEarningsPaise: MoneyPaise
  essentialSpendPaise: MoneyPaise
  billPaymentPaise: MoneyPaise
  udhaarPaymentPaise: MoneyPaise
  closingCashPaise: MoneyPaise
  isCushionBreached: boolean
}

export interface PlanningEngineInput {
  asOfDate: LocalDate
  currentLiquidCashPaise: MoneyPaise
  dailyEssentialSpendPaise: MoneyPaise
  minimumSafetyCushionPaise: MoneyPaise
  upcomingBills: BillRecord[]
  pendingUdhaarDue: UdhaarRecord[]
  shifts: ShiftLog[]
  transactions: TransactionRecord[]
}

/* ----------------------------------------------------------------------------
 * 4. RECONCILIATION & ANTI-DOUBLE-COUNTING ARCHITECTURE
 * ----------------------------------------------------------------------------
 * CRITICAL FINANCIAL SPECIFICATION:
 * Delivery riders log completed shifts in `src/pages/ShiftsPage.tsx`.
 * Delivery riders ALSO record transactions in `src/pages/IncomeExpensesPage.tsx`.
 *
 * Why Double-Counting Occurs without Rules:
 * If a rider earns ₹800 in a Friday night shift, logging the shift records ₹800.
 * On Tuesday, when Swiggy/Zomato deposits ₹800 into the rider's bank account,
 * the rider might log an income transaction of ₹800.
 * Adding both would report ₹1,600 total earnings!
 *
 * THE 3-PILLAR RECONCILIATION STANDARD:
 * 1. Shifts = Operational & Productivity Ledger:
 *    - Captures road hours, gross platform payout, and vehicle costs per session.
 *    - Used by Member 4 to calculate historical earning velocity (₹/hr per slot).
 *    - DOES NOT directly increment the declared wallet cash balance.
 *
 * 2. Transactions = Cashbook & Actual Rupee Flow:
 *    - Records actual rupee movements into and out of the rider's pocket/bank.
 *    - Payout settlements from platforms are logged here when funds are received.
 *
 * 3. Daily Cashflow Formula (Engine Standard):
 *    Total Spendable Cash on Hand =
 *      Profile.currentCashPaise (as of cashAsOfDate)
 *      + Sum of Net Cash Transactions since cashAsOfDate
 *      - Sum of Locked Savings Vault Allocations
 *
 * Under this rule, historical shift logs inform velocity; they NEVER inflate
 * actual liquid cash.
 */

export interface SharedDataSnapshot {
  shifts: ShiftLog[]
  transactions: TransactionRecord[]
  shiftSummary: ShiftSummary
  transactionSummary: TransactionSummary
  liquidCashPaise: MoneyPaise
}
