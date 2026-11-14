import type {
  Customer,
  LocalDate,
  MoneyPaise,
  PaymentMode,
  PlannedExpense,
  Profile,
  RepaymentRecord,
  ShiftLog,
  TimeSlot,
  UdhaarEntry,
  UdhaarStatus
} from '../types'

/**
 * Storage Keys — Namespaced and versioned (incomeflow:v1:*)
 */
export const STORAGE_KEYS = {
  PROFILE: 'incomeflow:v1:profile',
  SHIFTS: 'incomeflow:v1:shifts',
  EXPENSES: 'incomeflow:v1:expenses',
  TRANSACTIONS: 'incomeflow:v1:transactions',
  CUSTOMERS: 'incomeflow:v1:customers',
  UDHAAR: 'incomeflow:v1:udhaar',
  REPAYMENTS: 'incomeflow:v1:repayments',
  PROCESSED_REQUESTS: 'incomeflow:v1:processed_requests',
  BILLS: 'incomeflow:v1:bills',
  REMINDER_PREFERENCES: 'incomeflow:v1:reminder_preferences',
  DISMISSED_REMINDERS: 'incomeflow:v1:dismissed_reminders',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

/**
 * Proposed minimal compatible extension for future expense classification.
 * 100% backward-compatible with PlannedExpense.
 */
export type ExpenseCategory =
  | 'fuel'
  | 'maintenance'
  | 'food'
  | 'emergency'
  | 'bill'
  | 'other'

export interface ExpenseRecord extends PlannedExpense {
  category?: ExpenseCategory
}

/**
 * Abstract storage backend interface (compatible with window.localStorage)
 */
export interface StorageBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  clear?(): void
}

/**
 * In-memory fallback backend for SSR, testing, or restricted browser environments
 */
export function createMemoryStorageBackend(): StorageBackend {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

/**
 * Custom Error Hierarchy for Storage Operations
 */
export class StorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageError'
  }
}

export class StorageUnavailableError extends StorageError {
  constructor(message = 'Storage backend is unavailable in this environment') {
    super(message)
    this.name = 'StorageUnavailableError'
  }
}

export class StorageQuotaError extends StorageError {
  constructor(message = 'Storage quota exceeded. Unable to save data.') {
    super(message)
    this.name = 'StorageQuotaError'
  }
}

export class StorageCorruptionError extends StorageError {
  readonly key: string
  readonly rawValue: string

  constructor(key: string, rawValue: string, details?: string) {
    super(
      `Corrupted data found in storage for key "${key}". Raw value was preserved and not overwritten.${details ? ` Details: ${details}` : ''
      }`
    )
    this.name = 'StorageCorruptionError'
    this.key = key
    this.rawValue = rawValue
  }
}

export class StorageValidationError extends StorageError {
  readonly field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.name = 'StorageValidationError'
    this.field = field
  }
}

export class StorageNotFoundError extends StorageError {
  readonly entity: string
  readonly id: string

  constructor(entity: string, id: string) {
    super(`${entity} with ID "${id}" was not found`)
    this.name = 'StorageNotFoundError'
    this.entity = entity
    this.id = id
  }
}

/**
 * Helper: Check if string is a valid local calendar date (YYYY-MM-DD)
 */
export function isValidLocalDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(dateStr)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/**
 * Helper: Get current local calendar date formatted as YYYY-MM-DD
 */
export function getTodayLocalDate(): LocalDate {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Helper: Check if value is a safe integer in paise
 */
export function isSafePaise(val: unknown, allowNegative = false): val is MoneyPaise {
  if (typeof val !== 'number') return false
  if (!Number.isSafeInteger(val)) return false
  if (!allowNegative && val < 0) return false
  return true
}

/**
 * Validation helpers
 */
export function validateProfile(profile: unknown): Profile {
  if (typeof profile !== 'object' || profile === null) {
    throw new StorageValidationError('Profile must be a valid object')
  }
  const p = profile as Record<string, unknown>

  if (typeof p.id !== 'string' || p.id.trim() === '') {
    throw new StorageValidationError('Profile id must be a non-empty string', 'id')
  }
  if (typeof p.displayName !== 'string' || p.displayName.trim() === '') {
    throw new StorageValidationError('Profile displayName must be a non-empty string', 'displayName')
  }
  if (p.language !== 'en' && p.language !== 'hi') {
    throw new StorageValidationError('Profile language must be "en" or "hi"', 'language')
  }
  if (!isSafePaise(p.currentCashPaise, true)) {
    throw new StorageValidationError('Profile currentCashPaise must be a safe integer in paise', 'currentCashPaise')
  }
  if (typeof p.cashAsOfDate !== 'string' || !isValidLocalDate(p.cashAsOfDate)) {
    throw new StorageValidationError('Profile cashAsOfDate must be a valid calendar date in YYYY-MM-DD format', 'cashAsOfDate')
  }
  if (!isSafePaise(p.essentialDailySpendPaise, false)) {
    throw new StorageValidationError('Profile essentialDailySpendPaise must be a non-negative safe integer in paise', 'essentialDailySpendPaise')
  }
  if (!isSafePaise(p.minimumCushionPaise, false)) {
    throw new StorageValidationError('Profile minimumCushionPaise must be a non-negative safe integer in paise', 'minimumCushionPaise')
  }

  return {
    id: p.id,
    displayName: p.displayName,
    language: p.language,
    currentCashPaise: p.currentCashPaise,
    cashAsOfDate: p.cashAsOfDate,
    essentialDailySpendPaise: p.essentialDailySpendPaise,
    minimumCushionPaise: p.minimumCushionPaise,
  }
}

export function validateShiftLog(shift: unknown): ShiftLog {
  if (typeof shift !== 'object' || shift === null) {
    throw new StorageValidationError('ShiftLog must be an object')
  }
  const s = shift as Record<string, unknown>

  if (typeof s.id !== 'string' || s.id.trim() === '') {
    throw new StorageValidationError('Shift id must be a non-empty string', 'id')
  }
  if (typeof s.profileId !== 'string' || s.profileId.trim() === '') {
    throw new StorageValidationError('Shift profileId must be a non-empty string', 'profileId')
  }
  if (typeof s.date !== 'string' || !isValidLocalDate(s.date)) {
    throw new StorageValidationError('Shift date must be a valid calendar date in YYYY-MM-DD format', 'date')
  }
  const validSlots: TimeSlot[] = ['morning', 'afternoon', 'evening', 'night']
  if (typeof s.slot !== 'string' || !validSlots.includes(s.slot as TimeSlot)) {
    throw new StorageValidationError('Shift slot must be "morning", "afternoon", "evening", or "night"', 'slot')
  }
  if (typeof s.hours !== 'number' || !Number.isFinite(s.hours) || s.hours <= 0 || s.hours > 24) {
    throw new StorageValidationError('Shift hours must be a positive number between 0 and 24', 'hours')
  }
  if (!isSafePaise(s.grossEarningsPaise, false)) {
    throw new StorageValidationError('Shift grossEarningsPaise must be a non-negative safe integer in paise', 'grossEarningsPaise')
  }
  if (!isSafePaise(s.workCostsPaise, false)) {
    throw new StorageValidationError('Shift workCostsPaise must be a non-negative safe integer in paise', 'workCostsPaise')
  }

  return {
    id: s.id,
    profileId: s.profileId,
    date: s.date,
    slot: s.slot as TimeSlot,
    hours: s.hours,
    grossEarningsPaise: s.grossEarningsPaise,
    workCostsPaise: s.workCostsPaise,
  }
}

export function validatePlannedExpense(expense: unknown): ExpenseRecord {
  if (typeof expense !== 'object' || expense === null) {
    throw new StorageValidationError('PlannedExpense must be an object')
  }
  const e = expense as Record<string, unknown>

  if (typeof e.id !== 'string' || e.id.trim() === '') {
    throw new StorageValidationError('Expense id must be a non-empty string', 'id')
  }
  if (typeof e.profileId !== 'string' || e.profileId.trim() === '') {
    throw new StorageValidationError('Expense profileId must be a non-empty string', 'profileId')
  }
  if (typeof e.date !== 'string' || !isValidLocalDate(e.date)) {
    throw new StorageValidationError('Expense date must be a valid calendar date in YYYY-MM-DD format', 'date')
  }
  if (typeof e.label !== 'string' || e.label.trim() === '') {
    throw new StorageValidationError('Expense label must be a non-empty string', 'label')
  }
  if (!isSafePaise(e.amountPaise, false)) {
    throw new StorageValidationError('Expense amountPaise must be a non-negative safe integer in paise', 'amountPaise')
  }

  const result: ExpenseRecord = {
    id: e.id,
    profileId: e.profileId,
    date: e.date,
    label: e.label,
    amountPaise: e.amountPaise,
  }

  if (typeof e.category === 'string') {
    const validCategories: ExpenseCategory[] = ['fuel', 'maintenance', 'food', 'emergency', 'bill', 'other']
    if (validCategories.includes(e.category as ExpenseCategory)) {
      result.category = e.category as ExpenseCategory
    }
  }

  return result
}

export const TRANSACTION_INCOME_CATEGORIES = [
  'delivery earnings',
  'other income',
  'repayment',
] as const
export type TransactionIncomeCategory = typeof TRANSACTION_INCOME_CATEGORIES[number]

export const TRANSACTION_EXPENSE_CATEGORIES = [
  'fuel',
  'food',
  'maintenance',
  'household',
  'other',
] as const
export type TransactionExpenseCategory = typeof TRANSACTION_EXPENSE_CATEGORIES[number]

export type TransactionCategory = TransactionIncomeCategory | TransactionExpenseCategory
export type TransactionType = 'income' | 'expense'

export interface TransactionRecord {
  id: string
  profileId: string
  type: TransactionType
  amountPaise: MoneyPaise
  date: LocalDate
  category: TransactionCategory
  paymentMode: PaymentMode
  description?: string
  repaymentId?: string
  udhaarId?: string
}

export function validateTransaction(transaction: unknown): TransactionRecord {
  if (typeof transaction !== 'object' || transaction === null) {
    throw new StorageValidationError('Transaction must be an object')
  }
  const t = transaction as Record<string, unknown>

  if (typeof t.id !== 'string' || t.id.trim() === '') {
    throw new StorageValidationError('Transaction id must be a non-empty string', 'id')
  }
  if (typeof t.profileId !== 'string' || t.profileId.trim() === '') {
    throw new StorageValidationError('Transaction profileId must be a non-empty string', 'profileId')
  }
  if (t.type !== 'income' && t.type !== 'expense') {
    throw new StorageValidationError('Transaction type must be "income" or "expense"', 'type')
  }
  if (!isSafePaise(t.amountPaise, false) || t.amountPaise <= 0) {
    throw new StorageValidationError('Transaction amountPaise must be a positive safe integer in paise', 'amountPaise')
  }
  if (typeof t.date !== 'string' || !isValidLocalDate(t.date)) {
    throw new StorageValidationError('Transaction date must be a valid calendar date in YYYY-MM-DD format', 'date')
  }
  if (t.paymentMode !== 'cash' && t.paymentMode !== 'digital') {
    throw new StorageValidationError('Transaction paymentMode must be "cash" or "digital"', 'paymentMode')
  }

  const category = t.category as string
  if (t.type === 'income') {
    if (!TRANSACTION_INCOME_CATEGORIES.includes(category as TransactionIncomeCategory)) {
      throw new StorageValidationError(
        `Income category must be one of: ${TRANSACTION_INCOME_CATEGORIES.join(', ')}`,
        'category'
      )
    }
  } else {
    if (!TRANSACTION_EXPENSE_CATEGORIES.includes(category as TransactionExpenseCategory)) {
      throw new StorageValidationError(
        `Expense category must be one of: ${TRANSACTION_EXPENSE_CATEGORIES.join(', ')}`,
        'category'
      )
    }
  }

  const result: TransactionRecord = {
    id: t.id,
    profileId: t.profileId,
    type: t.type,
    amountPaise: t.amountPaise,
    date: t.date,
    category: t.category as TransactionCategory,
    paymentMode: t.paymentMode,
  }

  if (typeof t.description === 'string' && t.description.trim() !== '') {
    result.description = t.description.trim()
  }

  if (typeof t.repaymentId === 'string' && t.repaymentId.trim() !== '') {
    result.repaymentId = t.repaymentId.trim()
  }

  if (typeof t.udhaarId === 'string' && t.udhaarId.trim() !== '') {
    result.udhaarId = t.udhaarId.trim()
  }

  return result
}

/**
 * Labelled Mocks for Customer Records (used when backend is unavailable or for testing/demo)
 */
export const LABELLED_MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'mock-cust-001',
    name: 'Ramesh Sharma [Sample]',
    contact: '+91 98765 43210',
    note: 'Tea stall vendor near delivery hub - daily chai credit',
    createdAt: '2026-11-10',
  },
  {
    id: 'mock-cust-002',
    name: 'Ramesh Sharma [Sample]', // Identical name, unique ID
    contact: '+91 98111 22334',
    note: 'Mechanic at Sector 18 garage - bike service credit',
    createdAt: '2026-11-11',
  },
  {
    id: 'mock-cust-003',
    name: 'Pooja Verma [Sample]',
    contact: '+91 98222 33445',
    note: 'Regular parcel delivery customer',
    createdAt: '2026-11-12',
  },
]

export function validateCustomer(customer: unknown): Customer {
  if (typeof customer !== 'object' || customer === null) {
    throw new StorageValidationError('Customer must be an object')
  }
  const c = customer as Record<string, unknown>

  if (typeof c.id !== 'string' || c.id.trim() === '') {
    throw new StorageValidationError('Customer id must be a non-empty string', 'id')
  }
  if (typeof c.name !== 'string' || c.name.trim() === '') {
    throw new StorageValidationError('Customer name must be a non-empty string', 'name')
  }
  if (typeof c.contact !== 'string' || c.contact.trim() === '') {
    throw new StorageValidationError('Customer contact must be a non-empty string', 'contact')
  }
  if (c.note !== undefined && typeof c.note !== 'string') {
    throw new StorageValidationError('Customer note must be a string if provided', 'note')
  }
  if (c.profileId !== undefined && (typeof c.profileId !== 'string' || c.profileId.trim() === '')) {
    throw new StorageValidationError('Customer profileId must be a non-empty string if provided', 'profileId')
  }
  if (c.isArchived !== undefined && typeof c.isArchived !== 'boolean') {
    throw new StorageValidationError('Customer isArchived must be a boolean if provided', 'isArchived')
  }
  if (c.archivedAt !== undefined && (typeof c.archivedAt !== 'string' || !isValidLocalDate(c.archivedAt))) {
    throw new StorageValidationError('Customer archivedAt must be a valid calendar date in YYYY-MM-DD format', 'archivedAt')
  }
  const createdAt =
    typeof c.createdAt === 'string' && isValidLocalDate(c.createdAt)
      ? c.createdAt
      : getTodayLocalDate()

  return {
    id: c.id.trim(),
    name: c.name.trim(),
    contact: c.contact.trim(),
    note: typeof c.note === 'string' && c.note.trim() !== '' ? c.note.trim() : undefined,
    profileId: typeof c.profileId === 'string' && c.profileId.trim() !== '' ? c.profileId.trim() : undefined,
    isArchived: Boolean(c.isArchived),
    archivedAt: typeof c.archivedAt === 'string' ? c.archivedAt : undefined,
    createdAt,
  }
}

/**
 * Helper: Derive the dynamic status of an Udhaar record based on due date and settlement.
 * States:
 * - 'settled': explicitly settled / repaid
 * - 'due-today': due date is today
 * - 'overdue': due date is before today and not settled
 * - 'pending': due date is in the future
 */
export function deriveUdhaarStatus(
  entry: Pick<UdhaarEntry, 'dueDate' | 'isSettled'>,
  today: LocalDate = getTodayLocalDate()
): UdhaarStatus {
  if (entry.isSettled) {
    return 'settled'
  }
  if (entry.dueDate === today) {
    return 'due-today'
  }
  if (entry.dueDate < today) {
    return 'overdue'
  }
  return 'pending'
}

/**
 * Helper: Calculate remaining outstanding amount in paise for an entry.
 */
export function getUdhaarRemainingPaise(entry: UdhaarEntry): MoneyPaise {
  if (entry.isSettled) return 0
  const repaid = entry.repaidAmountPaise ?? 0
  return Math.max(0, entry.originalAmountPaise - repaid)
}

/**
 * Helper: Calculate outstanding total in paise for non-settled Udhaar entries.
 */
export function calculateCustomerOutstandingPaise(
  entries: UdhaarEntry[],
  customerId?: string
): MoneyPaise {
  return entries
    .filter((e) => (customerId ? e.customerId === customerId : true) && !e.isSettled)
    .reduce((sum, e) => sum + getUdhaarRemainingPaise(e), 0)
}

/**
 * Runtime validator for UdhaarEntry
 */
export function validateUdhaarEntry(entry: unknown): UdhaarEntry {
  if (typeof entry !== 'object' || entry === null) {
    throw new StorageValidationError('UdhaarEntry must be an object')
  }
  const u = entry as Record<string, unknown>

  if (typeof u.id !== 'string' || u.id.trim() === '') {
    throw new StorageValidationError('UdhaarEntry id must be a non-empty string', 'id')
  }
  if (typeof u.profileId !== 'string' || u.profileId.trim() === '') {
    throw new StorageValidationError('UdhaarEntry profileId (user ownership) is required', 'profileId')
  }
  if (typeof u.customerId !== 'string' || u.customerId.trim() === '') {
    throw new StorageValidationError('UdhaarEntry customerId is required', 'customerId')
  }
  if (!isSafePaise(u.originalAmountPaise, false) || (u.originalAmountPaise as number) <= 0) {
    throw new StorageValidationError('UdhaarEntry originalAmountPaise must be a positive safe integer in paise', 'originalAmountPaise')
  }
  if (u.repaidAmountPaise !== undefined && (!isSafePaise(u.repaidAmountPaise, false) || (u.repaidAmountPaise as number) < 0)) {
    throw new StorageValidationError('UdhaarEntry repaidAmountPaise must be a non-negative safe integer in paise', 'repaidAmountPaise')
  }
  if (typeof u.description !== 'string' || u.description.trim() === '') {
    throw new StorageValidationError('UdhaarEntry product/service description is required', 'description')
  }
  if (typeof u.entryDate !== 'string' || !isValidLocalDate(u.entryDate)) {
    throw new StorageValidationError('UdhaarEntry entryDate must be a valid calendar date in YYYY-MM-DD format', 'entryDate')
  }
  if (typeof u.dueDate !== 'string' || !isValidLocalDate(u.dueDate)) {
    throw new StorageValidationError('UdhaarEntry dueDate must be a valid calendar date in YYYY-MM-DD format', 'dueDate')
  }
  if (u.isSettled !== undefined && typeof u.isSettled !== 'boolean') {
    throw new StorageValidationError('UdhaarEntry isSettled must be a boolean', 'isSettled')
  }
  if (u.settledAt !== undefined && (typeof u.settledAt !== 'string' || !isValidLocalDate(u.settledAt))) {
    throw new StorageValidationError('UdhaarEntry settledAt must be a valid calendar date in YYYY-MM-DD format', 'settledAt')
  }

  const repaidAmountPaise = typeof u.repaidAmountPaise === 'number' ? (u.repaidAmountPaise as MoneyPaise) : 0

  return {
    id: u.id.trim(),
    profileId: u.profileId.trim(),
    customerId: u.customerId.trim(),
    originalAmountPaise: u.originalAmountPaise as MoneyPaise,
    repaidAmountPaise,
    description: u.description.trim(),
    entryDate: u.entryDate,
    dueDate: u.dueDate,
    isSettled: Boolean(u.isSettled),
    settledAt: typeof u.settledAt === 'string' ? u.settledAt : undefined,
    createdAt: typeof u.createdAt === 'string' ? u.createdAt : getTodayLocalDate(),
  }
}

/**
 * Runtime validator for RepaymentRecord
 */
export function validateRepaymentRecord(repayment: unknown): RepaymentRecord {
  if (typeof repayment !== 'object' || repayment === null) {
    throw new StorageValidationError('RepaymentRecord must be an object')
  }
  const r = repayment as Record<string, unknown>

  if (typeof r.id !== 'string' || r.id.trim() === '') {
    throw new StorageValidationError('Repayment id must be a non-empty string', 'id')
  }
  if (typeof r.profileId !== 'string' || r.profileId.trim() === '') {
    throw new StorageValidationError('Repayment profileId is required (user ownership)', 'profileId')
  }
  if (typeof r.udhaarId !== 'string' || r.udhaarId.trim() === '') {
    throw new StorageValidationError('Repayment udhaarId is required', 'udhaarId')
  }
  if (typeof r.customerId !== 'string' || r.customerId.trim() === '') {
    throw new StorageValidationError('Repayment customerId is required', 'customerId')
  }
  if (!isSafePaise(r.amountPaise, false) || (r.amountPaise as number) <= 0) {
    throw new StorageValidationError('Repayment amountPaise must be a positive safe integer in paise', 'amountPaise')
  }
  if (typeof r.date !== 'string' || !isValidLocalDate(r.date)) {
    throw new StorageValidationError('Repayment date must be a valid calendar date in YYYY-MM-DD format', 'date')
  }
  if (r.paymentMode !== 'cash' && r.paymentMode !== 'digital') {
    throw new StorageValidationError('Repayment paymentMode must be "cash" or "digital"', 'paymentMode')
  }
  if (typeof r.transactionId !== 'string' || r.transactionId.trim() === '') {
    throw new StorageValidationError('Repayment transactionId is required', 'transactionId')
  }
  if (r.note !== undefined && typeof r.note !== 'string') {
    throw new StorageValidationError('Repayment note must be a string if provided', 'note')
  }

  return {
    id: r.id.trim(),
    profileId: r.profileId.trim(),
    udhaarId: r.udhaarId.trim(),
    customerId: r.customerId.trim(),
    amountPaise: r.amountPaise as MoneyPaise,
    date: r.date,
    paymentMode: r.paymentMode,
    transactionId: r.transactionId.trim(),
    note: typeof r.note === 'string' && r.note.trim() !== '' ? r.note.trim() : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : getTodayLocalDate(),
  }
}

export interface RecordRepaymentParams {
  id?: string
  requestId?: string
  profileId: string
  udhaarId: string
  amountPaise: MoneyPaise
  date?: LocalDate
  paymentMode?: PaymentMode
  note?: string
}

export interface RecordRepaymentResult {
  repayment: RepaymentRecord
  updatedEntry: UdhaarEntry
  transaction: TransactionRecord
}

/**
 * Helper to compute date offset for sample mocks
 */
export function addDaysToLocalDate(dateStr: LocalDate, days: number): LocalDate {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Labelled Mocks for Udhaar Entries (demonstrating all 4 states)
 */
export function getLabelledMockUdhaarEntries(today: LocalDate = getTodayLocalDate()): UdhaarEntry[] {
  return [
    {
      id: 'mock-udh-001',
      profileId: 'profile-demo-1',
      customerId: 'mock-cust-001', // Ramesh Sharma (Tea stall)
      originalAmountPaise: 35000, // ₹350
      repaidAmountPaise: 0,
      description: 'Morning chai & bun maska khata (weekly tab)',
      entryDate: addDaysToLocalDate(today, -3),
      dueDate: addDaysToLocalDate(today, 4), // Future -> 'pending'
      isSettled: false,
    },
    {
      id: 'mock-udh-002',
      profileId: 'profile-demo-1',
      customerId: 'mock-cust-002', // Ramesh Sharma (Mechanic)
      originalAmountPaise: 120000, // ₹1,200
      repaidAmountPaise: 0,
      description: 'Rear brake shoe & chain lube on credit',
      entryDate: addDaysToLocalDate(today, -7),
      dueDate: today, // Today -> 'due-today'
      isSettled: false,
    },
    {
      id: 'mock-udh-003',
      profileId: 'profile-demo-1',
      customerId: 'mock-cust-002', // Ramesh Sharma (Mechanic)
      originalAmountPaise: 50000, // ₹500
      repaidAmountPaise: 20000, // ₹200 partially repaid, ₹300 remaining
      description: 'Engine oil top-up emergency borrow',
      entryDate: addDaysToLocalDate(today, -14),
      dueDate: addDaysToLocalDate(today, -2), // Past -> 'overdue'
      isSettled: false,
    },
    {
      id: 'mock-udh-004',
      profileId: 'profile-demo-1',
      customerId: 'mock-cust-003', // Pooja Verma
      originalAmountPaise: 20000, // ₹200
      repaidAmountPaise: 20000, // Fully repaid
      description: 'Urgent document parcel delivery fee credit',
      entryDate: addDaysToLocalDate(today, -10),
      dueDate: addDaysToLocalDate(today, -5),
      isSettled: true,
      settledAt: addDaysToLocalDate(today, -4), // Settled -> 'settled'
    },
  ]
}

/**
 * Storage Service Contract
 * Designed so a future Supabase implementation can implement this exact interface.
 */
export interface StorageService {
  // Profile
  getProfile(): Promise<Profile | null>
  saveProfile(profile: Profile): Promise<Profile>

  // Shifts
  getShifts(): Promise<ShiftLog[]>
  saveShifts(shifts: ShiftLog[]): Promise<ShiftLog[]>
  addShift(shift: ShiftLog): Promise<ShiftLog>
  updateShift(id: string, updates: Partial<Omit<ShiftLog, 'id'>>): Promise<ShiftLog>
  deleteShift(id: string): Promise<boolean>

  // Expenses
  getExpenses(): Promise<ExpenseRecord[]>
  saveExpenses(expenses: PlannedExpense[]): Promise<ExpenseRecord[]>
  addExpense(expense: PlannedExpense): Promise<ExpenseRecord>
  updateExpense(id: string, updates: Partial<Omit<PlannedExpense, 'id'>>): Promise<ExpenseRecord>
  deleteExpense(id: string): Promise<boolean>

  // Transactions
  getTransactions(): Promise<TransactionRecord[]>
  saveTransactions(transactions: TransactionRecord[]): Promise<TransactionRecord[]>
  addTransaction(transaction: TransactionRecord): Promise<TransactionRecord>
  updateTransaction(id: string, updates: Partial<Omit<TransactionRecord, 'id'>>): Promise<TransactionRecord>
  deleteTransaction(id: string): Promise<boolean>

  // Customers (Member 2 Module)
  getCustomers(): Promise<Customer[]>
  saveCustomers(customers: Customer[]): Promise<Customer[]>
  addCustomer(customer: Customer): Promise<Customer>
  updateCustomer(id: string, updates: Partial<Omit<Customer, 'id'>>): Promise<Customer>
  archiveCustomer(id: string): Promise<Customer>
  unarchiveCustomer(id: string): Promise<Customer>
  deleteCustomer(id: string): Promise<boolean>

  // Udhaar Entries (Member 2 Module)
  getUdhaarEntries(customerId?: string): Promise<UdhaarEntry[]>
  saveUdhaarEntries(entries: UdhaarEntry[]): Promise<UdhaarEntry[]>
  addUdhaarEntry(entry: UdhaarEntry): Promise<UdhaarEntry>
  updateUdhaarEntry(id: string, updates: Partial<Omit<UdhaarEntry, 'id' | 'profileId'>>): Promise<UdhaarEntry>
  settleUdhaarEntry(id: string, settledAt?: LocalDate): Promise<UdhaarEntry>
  deleteUdhaarEntry(id: string): Promise<boolean>

  // Repayments (Member 2 Module)
  getRepayments(udhaarId?: string): Promise<RepaymentRecord[]>
  saveRepayments(repayments: RepaymentRecord[]): Promise<RepaymentRecord[]>
  recordRepayment(params: RecordRepaymentParams): Promise<RecordRepaymentResult>

  // Reset / Clear
  clearAll(): Promise<void>
}

/**
 * LocalStorage implementation of StorageService
 */
export class LocalStorageService implements StorageService {
  private backend: StorageBackend

  constructor(backend?: StorageBackend) {
    if (backend) {
      this.backend = backend
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this.backend = window.localStorage
    } else {
      this.backend = createMemoryStorageBackend()
    }
  }

  private readRaw(key: string): string | null {
    try {
      return this.backend.getItem(key)
    } catch (err) {
      if (err instanceof StorageError) throw err
      throw new StorageUnavailableError(
        `Failed to access storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  private writeRaw(key: string, value: string): void {
    try {
      this.backend.setItem(key, value)
    } catch (err: unknown) {
      if (err instanceof StorageError) throw err

      const isQuota =
        (typeof DOMException !== 'undefined' &&
          err instanceof DOMException &&
          (err.name === 'QuotaExceededError' ||
            err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            err.code === 22 ||
            err.code === 1014)) ||
        (typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          (err as { name: string }).name === 'QuotaExceededError')

      if (isQuota) {
        throw new StorageQuotaError(`Storage quota exceeded while writing to "${key}"`)
      }

      throw new StorageError(
        `Failed to write to storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  private removeRaw(key: string): void {
    try {
      this.backend.removeItem(key)
    } catch (err) {
      if (err instanceof StorageError) throw err
      throw new StorageError(
        `Failed to remove storage key "${key}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  // --- Profile Operations ---

  async getProfile(): Promise<Profile | null> {
    const raw = this.readRaw(STORAGE_KEYS.PROFILE)
    if (raw === null || raw.trim() === '') {
      return null
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Do not overwrite raw data
      throw new StorageCorruptionError(STORAGE_KEYS.PROFILE, raw, 'Invalid JSON syntax')
    }

    return validateProfile(parsed)
  }

  async saveProfile(profile: Profile): Promise<Profile> {
    const validated = validateProfile(profile)
    const json = JSON.stringify(validated)
    this.writeRaw(STORAGE_KEYS.PROFILE, json)
    return validated
  }

  // --- Shift Operations ---

  async getShifts(): Promise<ShiftLog[]> {
    const raw = this.readRaw(STORAGE_KEYS.SHIFTS)
    if (raw === null || raw.trim() === '') {
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new StorageCorruptionError(STORAGE_KEYS.SHIFTS, raw, 'Invalid JSON syntax')
    }

    if (!Array.isArray(parsed)) {
      throw new StorageValidationError(`Stored shifts must be an array, received ${typeof parsed}`)
    }

    const seenIds = new Set<string>()
    const validatedList: ShiftLog[] = []

    for (const item of parsed) {
      const validated = validateShiftLog(item)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate shift record ID detected: "${validated.id}"`)
      }
      seenIds.add(validated.id)
      validatedList.push(validated)
    }

    return validatedList
  }

  async saveShifts(shifts: ShiftLog[]): Promise<ShiftLog[]> {
    if (!Array.isArray(shifts)) {
      throw new StorageValidationError('shifts must be an array')
    }

    const seenIds = new Set<string>()
    const validatedList: ShiftLog[] = []

    for (const item of shifts) {
      const validated = validateShiftLog(item)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate shift record ID detected: "${validated.id}"`)
      }
      seenIds.add(validated.id)
      validatedList.push(validated)
    }

    const json = JSON.stringify(validatedList)
    this.writeRaw(STORAGE_KEYS.SHIFTS, json)
    return validatedList
  }

  async addShift(shift: ShiftLog): Promise<ShiftLog> {
    const validated = validateShiftLog(shift)
    const existing = await this.getShifts()

    if (existing.some((s) => s.id === validated.id)) {
      throw new StorageValidationError(`Shift with ID "${validated.id}" already exists`)
    }

    const updated = [...existing, validated]
    await this.saveShifts(updated)
    return validated
  }

  async updateShift(id: string, updates: Partial<Omit<ShiftLog, 'id'>>): Promise<ShiftLog> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid shift ID is required for update')
    }

    const existing = await this.getShifts()
    const index = existing.findIndex((s) => s.id === id)
    if (index === -1) {
      throw new StorageNotFoundError('ShiftLog', id)
    }

    const target = existing[index]
    const merged = {
      ...target,
      ...updates,
      id, // Protect ID from being changed
    }

    const validated = validateShiftLog(merged)
    existing[index] = validated
    await this.saveShifts(existing)
    return validated
  }

  async deleteShift(id: string): Promise<boolean> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid shift ID is required for deletion')
    }

    const existing = await this.getShifts()
    const filtered = existing.filter((s) => s.id !== id)
    if (filtered.length === existing.length) {
      return false
    }

    await this.saveShifts(filtered)
    return true
  }

  // --- Expense Operations ---

  async getExpenses(): Promise<ExpenseRecord[]> {
    const raw = this.readRaw(STORAGE_KEYS.EXPENSES)
    if (raw === null || raw.trim() === '') {
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new StorageCorruptionError(STORAGE_KEYS.EXPENSES, raw, 'Invalid JSON syntax')
    }

    if (!Array.isArray(parsed)) {
      throw new StorageValidationError(`Stored expenses must be an array, received ${typeof parsed}`)
    }

    const seenIds = new Set<string>()
    const validatedList: ExpenseRecord[] = []

    for (const item of parsed) {
      const validated = validatePlannedExpense(item)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate expense record ID detected: "${validated.id}"`)
      }
      seenIds.add(validated.id)
      validatedList.push(validated)
    }

    return validatedList
  }

  async saveExpenses(expenses: PlannedExpense[]): Promise<ExpenseRecord[]> {
    if (!Array.isArray(expenses)) {
      throw new StorageValidationError('expenses must be an array')
    }

    const seenIds = new Set<string>()
    const validatedList: ExpenseRecord[] = []

    for (const item of expenses) {
      const validated = validatePlannedExpense(item)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate expense record ID detected: "${validated.id}"`)
      }
      seenIds.add(validated.id)
      validatedList.push(validated)
    }

    const json = JSON.stringify(validatedList)
    this.writeRaw(STORAGE_KEYS.EXPENSES, json)
    return validatedList
  }

  async addExpense(expense: PlannedExpense): Promise<ExpenseRecord> {
    const validated = validatePlannedExpense(expense)
    const existing = await this.getExpenses()

    if (existing.some((e) => e.id === validated.id)) {
      throw new StorageValidationError(`Expense with ID "${validated.id}" already exists`)
    }

    const updated = [...existing, validated]
    await this.saveExpenses(updated)
    return validated
  }

  async updateExpense(id: string, updates: Partial<Omit<PlannedExpense, 'id'>>): Promise<ExpenseRecord> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid expense ID is required for update')
    }

    const existing = await this.getExpenses()
    const index = existing.findIndex((e) => e.id === id)
    if (index === -1) {
      throw new StorageNotFoundError('PlannedExpense', id)
    }

    const target = existing[index]
    const merged = {
      ...target,
      ...updates,
      id,
    }

    const validated = validatePlannedExpense(merged)
    existing[index] = validated
    await this.saveExpenses(existing)
    return validated
  }

  async deleteExpense(id: string): Promise<boolean> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid expense ID is required for deletion')
    }

    const existing = await this.getExpenses()
    const filtered = existing.filter((e) => e.id !== id)
    if (filtered.length === existing.length) {
      return false
    }

    await this.saveExpenses(filtered)
    return true
  }

  // --- Transaction Operations ---

  async getTransactions(): Promise<TransactionRecord[]> {
    const raw = this.readRaw(STORAGE_KEYS.TRANSACTIONS)
    if (raw === null || raw.trim() === '') {
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new StorageCorruptionError(STORAGE_KEYS.TRANSACTIONS, raw, 'Invalid JSON syntax')
    }

    if (!Array.isArray(parsed)) {
      throw new StorageValidationError(`Stored transactions must be an array, received ${typeof parsed}`)
    }

    const seenIds = new Set<string>()
    const validatedList: TransactionRecord[] = []

    for (const item of parsed) {
      const validated = validateTransaction(item)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate transaction record ID detected: "${validated.id}"`)
      }
      seenIds.add(validated.id)
      validatedList.push(validated)
    }

    return validatedList
  }

  async saveTransactions(transactions: TransactionRecord[]): Promise<TransactionRecord[]> {
    if (!Array.isArray(transactions)) {
      throw new StorageValidationError('transactions must be an array')
    }

    const seenIds = new Set<string>()
    const validatedList: TransactionRecord[] = []

    for (const item of transactions) {
      const validated = validateTransaction(item)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate transaction record ID detected: "${validated.id}"`)
      }
      seenIds.add(validated.id)
      validatedList.push(validated)
    }

    const json = JSON.stringify(validatedList)
    this.writeRaw(STORAGE_KEYS.TRANSACTIONS, json)
    return validatedList
  }

  async addTransaction(transaction: TransactionRecord): Promise<TransactionRecord> {
    const validated = validateTransaction(transaction)
    const existing = await this.getTransactions()

    if (existing.some((t) => t.id === validated.id)) {
      throw new StorageValidationError(`Transaction with ID "${validated.id}" already exists`)
    }

    const updated = [...existing, validated]
    await this.saveTransactions(updated)
    return validated
  }

  async updateTransaction(id: string, updates: Partial<Omit<TransactionRecord, 'id'>>): Promise<TransactionRecord> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid transaction ID is required for update')
    }

    const existing = await this.getTransactions()
    const index = existing.findIndex((t) => t.id === id)
    if (index === -1) {
      throw new StorageNotFoundError('TransactionRecord', id)
    }

    const target = existing[index]
    const merged = {
      ...target,
      ...updates,
      id,
    }

    const validated = validateTransaction(merged)
    existing[index] = validated
    await this.saveTransactions(existing)
    return validated
  }

  async deleteTransaction(id: string): Promise<boolean> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid transaction ID is required for deletion')
    }

    const existing = await this.getTransactions()
    const filtered = existing.filter((t) => t.id !== id)
    if (filtered.length === existing.length) {
      return false
    }

    await this.saveTransactions(filtered)
    return true
  }

  // --- Customers (Member 2 Module) ---

  async getCustomers(): Promise<Customer[]> {
    const raw = this.readRaw(STORAGE_KEYS.CUSTOMERS)
    if (raw === null) return []
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        throw new StorageCorruptionError(STORAGE_KEYS.CUSTOMERS, raw, 'Expected array of customers')
      }
      return parsed.map((item) => validateCustomer(item))
    } catch (err) {
      if (err instanceof StorageError) throw err
      throw new StorageCorruptionError(STORAGE_KEYS.CUSTOMERS, raw, (err as Error).message)
    }
  }

  async saveCustomers(customers: Customer[]): Promise<Customer[]> {
    if (!Array.isArray(customers)) {
      throw new StorageValidationError('Customers must be an array')
    }
    const seenIds = new Set<string>()
    const validatedList = customers.map((c) => {
      const validated = validateCustomer(c)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate customer id "${validated.id}" detected`)
      }
      seenIds.add(validated.id)
      return validated
    })
    const json = JSON.stringify(validatedList)
    this.writeRaw(STORAGE_KEYS.CUSTOMERS, json)
    return validatedList
  }

  async addCustomer(customer: Customer): Promise<Customer> {
    const validated = validateCustomer(customer)
    const existing = await this.getCustomers()

    if (existing.some((c) => c.id === validated.id)) {
      throw new StorageValidationError(`Customer with ID "${validated.id}" already exists`)
    }

    const updated = [...existing, validated]
    await this.saveCustomers(updated)
    return validated
  }

  async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id'>>): Promise<Customer> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid customer ID is required for update')
    }

    const existing = await this.getCustomers()
    const index = existing.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new StorageNotFoundError('Customer', id)
    }

    const target = existing[index]
    const merged = {
      ...target,
      ...updates,
      id,
    }

    const validated = validateCustomer(merged)
    existing[index] = validated
    await this.saveCustomers(existing)
    return validated
  }

  async archiveCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, {
      isArchived: true,
      archivedAt: getTodayLocalDate(),
    })
  }

  async unarchiveCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, {
      isArchived: false,
      archivedAt: undefined,
    })
  }

  async deleteCustomer(id: string): Promise<boolean> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid customer ID is required for deletion')
    }

    const existing = await this.getCustomers()
    const filtered = existing.filter((c) => c.id !== id)
    if (filtered.length === existing.length) {
      return false
    }

    // Crucial requirement: Financial history (Udhaar records) is NEVER deleted when removing/archiving a customer
    await this.saveCustomers(filtered)
    return true
  }

  // --- Udhaar Entries (Member 2 Module) ---

  async getUdhaarEntries(customerId?: string): Promise<UdhaarEntry[]> {
    const raw = this.readRaw(STORAGE_KEYS.UDHAAR)
    if (raw === null) return []
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        throw new StorageCorruptionError(STORAGE_KEYS.UDHAAR, raw, 'Expected array of udhaar entries')
      }
      const validated = parsed.map((item) => validateUdhaarEntry(item))
      if (customerId) {
        return validated.filter((u) => u.customerId === customerId)
      }
      return validated
    } catch (err) {
      if (err instanceof StorageError) throw err
      throw new StorageCorruptionError(STORAGE_KEYS.UDHAAR, raw, (err as Error).message)
    }
  }

  async saveUdhaarEntries(entries: UdhaarEntry[]): Promise<UdhaarEntry[]> {
    if (!Array.isArray(entries)) {
      throw new StorageValidationError('Udhaar entries must be an array')
    }
    const seenIds = new Set<string>()
    const validatedList = entries.map((e) => {
      const validated = validateUdhaarEntry(e)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate udhaar id "${validated.id}" detected`)
      }
      seenIds.add(validated.id)
      return validated
    })
    const json = JSON.stringify(validatedList)
    this.writeRaw(STORAGE_KEYS.UDHAAR, json)
    return validatedList
  }

  async addUdhaarEntry(entry: UdhaarEntry): Promise<UdhaarEntry> {
    // Validates positive amounts, valid calendar dates, profileId user ownership, and customerId
    const validated = validateUdhaarEntry(entry)
    const existing = await this.getUdhaarEntries()

    if (existing.some((e) => e.id === validated.id)) {
      throw new StorageValidationError(`Udhaar entry with ID "${validated.id}" already exists`)
    }

    // Creating Udhaar must NOT create cash income transactions or alter declared cash balance!
    const updated = [...existing, validated]
    await this.saveUdhaarEntries(updated)
    return validated
  }

  async updateUdhaarEntry(
    id: string,
    updates: Partial<Omit<UdhaarEntry, 'id' | 'profileId'>>
  ): Promise<UdhaarEntry> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid udhaar ID is required for update')
    }

    const existing = await this.getUdhaarEntries()
    const index = existing.findIndex((e) => e.id === id)
    if (index === -1) {
      throw new StorageNotFoundError('UdhaarEntry', id)
    }

    const target = existing[index]
    const merged = {
      ...target,
      ...updates,
      id,
      profileId: target.profileId, // User ownership cannot be overwritten
    }

    const validated = validateUdhaarEntry(merged)
    existing[index] = validated
    await this.saveUdhaarEntries(existing)
    return validated
  }

  async settleUdhaarEntry(id: string, settledAt?: LocalDate): Promise<UdhaarEntry> {
    return this.updateUdhaarEntry(id, {
      isSettled: true,
      settledAt: settledAt || getTodayLocalDate(),
    })
  }

  async deleteUdhaarEntry(id: string): Promise<boolean> {
    if (typeof id !== 'string' || id.trim() === '') {
      throw new StorageValidationError('Valid udhaar ID is required for deletion')
    }

    const existing = await this.getUdhaarEntries()
    const filtered = existing.filter((e) => e.id !== id)
    if (filtered.length === existing.length) {
      return false
    }

    await this.saveUdhaarEntries(filtered)
    return true
  }

  // --- Repayments (Member 2 Module) ---

  async getRepayments(udhaarId?: string): Promise<RepaymentRecord[]> {
    const raw = this.readRaw(STORAGE_KEYS.REPAYMENTS)
    if (raw === null) return []
    try {
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) {
        throw new StorageCorruptionError(STORAGE_KEYS.REPAYMENTS, raw, 'Expected array of repayments')
      }
      const validated = parsed.map((item) => validateRepaymentRecord(item))
      if (udhaarId) {
        return validated.filter((r) => r.udhaarId === udhaarId)
      }
      return validated
    } catch (err) {
      if (err instanceof StorageError) throw err
      throw new StorageCorruptionError(STORAGE_KEYS.REPAYMENTS, raw, (err as Error).message)
    }
  }

  async saveRepayments(repayments: RepaymentRecord[]): Promise<RepaymentRecord[]> {
    if (!Array.isArray(repayments)) {
      throw new StorageValidationError('Repayments must be an array')
    }
    const seenIds = new Set<string>()
    const validatedList = repayments.map((r) => {
      const validated = validateRepaymentRecord(r)
      if (seenIds.has(validated.id)) {
        throw new StorageValidationError(`Duplicate repayment id "${validated.id}" detected`)
      }
      seenIds.add(validated.id)
      return validated
    })
    const json = JSON.stringify(validatedList)
    this.writeRaw(STORAGE_KEYS.REPAYMENTS, json)
    return validatedList
  }

  async recordRepayment(params: RecordRepaymentParams): Promise<RecordRepaymentResult> {
    if (typeof params !== 'object' || params === null) {
      throw new StorageValidationError('Repayment parameters must be an object')
    }
    if (typeof params.profileId !== 'string' || params.profileId.trim() === '') {
      throw new StorageValidationError('Valid profileId (user ownership) is required')
    }
    if (typeof params.udhaarId !== 'string' || params.udhaarId.trim() === '') {
      throw new StorageValidationError('Valid udhaarId is required')
    }

    // Reject non-positive, zero, negative or fractional repayments
    if (!isSafePaise(params.amountPaise, false) || params.amountPaise <= 0) {
      throw new StorageValidationError('Repayment amount must be a positive safe integer in paise', 'amountPaise')
    }

    // Duplicate request protection (coordinating idempotency with Member 1)
    if (params.requestId && typeof params.requestId === 'string') {
      const processedRaw = this.readRaw(STORAGE_KEYS.PROCESSED_REQUESTS)
      const processed: string[] = processedRaw ? JSON.parse(processedRaw) : []
      if (processed.includes(params.requestId)) {
        throw new StorageValidationError(`Duplicate repayment request detected for token: ${params.requestId}`)
      }
    }

    // Retrieve target credit entry
    const allUdhaars = await this.getUdhaarEntries()
    const entryIndex = allUdhaars.findIndex((e) => e.id === params.udhaarId)
    if (entryIndex === -1) {
      throw new StorageNotFoundError('UdhaarEntry', params.udhaarId)
    }
    const targetEntry = allUdhaars[entryIndex]

    // Backend user ownership enforcement
    if (targetEntry.profileId !== params.profileId) {
      throw new StorageValidationError(
        `User ownership mismatch: unauthorized access to udhaar entry "${params.udhaarId}"`,
        'profileId'
      )
    }

    // Check outstanding balance & reject excessive repayment (overpayment)
    const currentRemaining = getUdhaarRemainingPaise(targetEntry)
    if (currentRemaining <= 0) {
      throw new StorageValidationError('Udhaar entry is already fully settled')
    }
    if (params.amountPaise > currentRemaining) {
      throw new StorageValidationError(
        `Repayment amount (${params.amountPaise} paise) exceeds remaining outstanding balance (${currentRemaining} paise)`
      )
    }

    const repaymentDate =
      params.date && isValidLocalDate(params.date) ? params.date : getTodayLocalDate()
    const repaymentId =
      params.id || `rep-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
    const transactionId = `tx-rep-${repaymentId}`

    // 1. Create linked cash-received TransactionRecord (shared transaction ledger)
    const newTransaction: TransactionRecord = {
      id: transactionId,
      profileId: params.profileId,
      type: 'income',
      amountPaise: params.amountPaise,
      date: repaymentDate,
      category: 'other income',
      paymentMode: params.paymentMode || 'cash',
      description: `Repayment received for Udhaar #${targetEntry.id}: ${targetEntry.description}`,
      repaymentId,
      udhaarId: targetEntry.id,
    }
    const validatedTx = validateTransaction(newTransaction)

    // 2. Create RepaymentRecord
    const newRepayment: RepaymentRecord = {
      id: repaymentId,
      profileId: params.profileId,
      udhaarId: targetEntry.id,
      customerId: targetEntry.customerId,
      amountPaise: params.amountPaise,
      date: repaymentDate,
      paymentMode: params.paymentMode || 'cash',
      transactionId,
      note: params.note,
      createdAt: getTodayLocalDate(),
    }
    const validatedRepayment = validateRepaymentRecord(newRepayment)

    // 3. Update UdhaarEntry with reduced outstanding amount
    const newRepaidAmount = (targetEntry.repaidAmountPaise || 0) + params.amountPaise
    const isNowSettled = newRepaidAmount >= targetEntry.originalAmountPaise
    const updatedEntry: UdhaarEntry = {
      ...targetEntry,
      repaidAmountPaise: newRepaidAmount,
      isSettled: isNowSettled,
      settledAt: isNowSettled ? repaymentDate : targetEntry.settledAt,
    }
    const validatedUdhaar = validateUdhaarEntry(updatedEntry)

    // Atomic write coordination: backup current raw values for rollback if write fails
    const rawUdhaarBefore = this.readRaw(STORAGE_KEYS.UDHAAR)
    const rawRepaymentsBefore = this.readRaw(STORAGE_KEYS.REPAYMENTS)
    const rawTransactionsBefore = this.readRaw(STORAGE_KEYS.TRANSACTIONS)
    const rawProcessedBefore = this.readRaw(STORAGE_KEYS.PROCESSED_REQUESTS)

    try {
      allUdhaars[entryIndex] = validatedUdhaar
      const allRepayments = await this.getRepayments()
      const updatedRepayments = [...allRepayments, validatedRepayment]
      const allTransactions = await this.getTransactions()
      const updatedTransactions = [...allTransactions, validatedTx]

      // Save atomically to storage
      await this.saveUdhaarEntries(allUdhaars)
      await this.saveRepayments(updatedRepayments)
      await this.saveTransactions(updatedTransactions)

      if (params.requestId) {
        const processedList: string[] = rawProcessedBefore ? JSON.parse(rawProcessedBefore) : []
        processedList.push(params.requestId)
        this.writeRaw(STORAGE_KEYS.PROCESSED_REQUESTS, JSON.stringify(processedList))
      }

      return {
        repayment: validatedRepayment,
        updatedEntry: validatedUdhaar,
        transaction: validatedTx,
      }
    } catch (err) {
      // Rollback all affected raw keys to guarantee no partial write or false success
      if (rawUdhaarBefore !== null) this.writeRaw(STORAGE_KEYS.UDHAAR, rawUdhaarBefore)
      else this.removeRaw(STORAGE_KEYS.UDHAAR)

      if (rawRepaymentsBefore !== null) this.writeRaw(STORAGE_KEYS.REPAYMENTS, rawRepaymentsBefore)
      else this.removeRaw(STORAGE_KEYS.REPAYMENTS)

      if (rawTransactionsBefore !== null) this.writeRaw(STORAGE_KEYS.TRANSACTIONS, rawTransactionsBefore)
      else this.removeRaw(STORAGE_KEYS.TRANSACTIONS)

      if (rawProcessedBefore !== null) this.writeRaw(STORAGE_KEYS.PROCESSED_REQUESTS, rawProcessedBefore)
      else this.removeRaw(STORAGE_KEYS.PROCESSED_REQUESTS)

      throw err
    }
  }

  // --- Reset / Clear ---

  async clearAll(): Promise<void> {
    this.removeRaw(STORAGE_KEYS.PROFILE)
    this.removeRaw(STORAGE_KEYS.SHIFTS)
    this.removeRaw(STORAGE_KEYS.EXPENSES)
    this.removeRaw(STORAGE_KEYS.TRANSACTIONS)
    this.removeRaw(STORAGE_KEYS.CUSTOMERS)
    this.removeRaw(STORAGE_KEYS.UDHAAR)
    this.removeRaw(STORAGE_KEYS.REPAYMENTS)
    this.removeRaw(STORAGE_KEYS.PROCESSED_REQUESTS)
  }
}

/**
 * Singleton service instance and function exports
 */
let activeService: StorageService = new LocalStorageService()

export function setStorageService(service: StorageService): void {
  activeService = service
}

export function getStorageService(): StorageService {
  return activeService
}

export const storageService = {
  getProfile: () => activeService.getProfile(),
  saveProfile: (p: Profile) => activeService.saveProfile(p),
  getShifts: () => activeService.getShifts(),
  saveShifts: (s: ShiftLog[]) => activeService.saveShifts(s),
  addShift: (s: ShiftLog) => activeService.addShift(s),
  updateShift: (id: string, u: Partial<Omit<ShiftLog, 'id'>>) => activeService.updateShift(id, u),
  deleteShift: (id: string) => activeService.deleteShift(id),
  getExpenses: () => activeService.getExpenses(),
  saveExpenses: (e: PlannedExpense[]) => activeService.saveExpenses(e),
  addExpense: (e: PlannedExpense) => activeService.addExpense(e),
  updateExpense: (id: string, u: Partial<Omit<PlannedExpense, 'id'>>) => activeService.updateExpense(id, u),
  deleteExpense: (id: string) => activeService.deleteExpense(id),
  getTransactions: () => activeService.getTransactions(),
  saveTransactions: (t: TransactionRecord[]) => activeService.saveTransactions(t),
  addTransaction: (t: TransactionRecord) => activeService.addTransaction(t),
  updateTransaction: (id: string, u: Partial<Omit<TransactionRecord, 'id'>>) => activeService.updateTransaction(id, u),
  deleteTransaction: (id: string) => activeService.deleteTransaction(id),
  getCustomers: () => activeService.getCustomers(),
  saveCustomers: (c: Customer[]) => activeService.saveCustomers(c),
  addCustomer: (c: Customer) => activeService.addCustomer(c),
  updateCustomer: (id: string, u: Partial<Omit<Customer, 'id'>>) => activeService.updateCustomer(id, u),
  archiveCustomer: (id: string) => activeService.archiveCustomer(id),
  unarchiveCustomer: (id: string) => activeService.unarchiveCustomer(id),
  deleteCustomer: (id: string) => activeService.deleteCustomer(id),
  getUdhaarEntries: (customerId?: string) => activeService.getUdhaarEntries(customerId),
  saveUdhaarEntries: (e: UdhaarEntry[]) => activeService.saveUdhaarEntries(e),
  addUdhaarEntry: (e: UdhaarEntry) => activeService.addUdhaarEntry(e),
  updateUdhaarEntry: (id: string, u: Partial<Omit<UdhaarEntry, 'id' | 'profileId'>>) => activeService.updateUdhaarEntry(id, u),
  settleUdhaarEntry: (id: string, settledAt?: LocalDate) => activeService.settleUdhaarEntry(id, settledAt),
  deleteUdhaarEntry: (id: string) => activeService.deleteUdhaarEntry(id),
  getRepayments: (udhaarId?: string) => activeService.getRepayments(udhaarId),
  saveRepayments: (r: RepaymentRecord[]) => activeService.saveRepayments(r),
  recordRepayment: (p: RecordRepaymentParams) => activeService.recordRepayment(p),
  clearAll: () => activeService.clearAll(),
}

export const getProfile = () => activeService.getProfile()
export const saveProfile = (p: Profile) => activeService.saveProfile(p)
export const getShifts = () => activeService.getShifts()
export const saveShifts = (s: ShiftLog[]) => activeService.saveShifts(s)
export const addShift = (s: ShiftLog) => activeService.addShift(s)
export const updateShift = (id: string, u: Partial<Omit<ShiftLog, 'id'>>) => activeService.updateShift(id, u)
export const deleteShift = (id: string) => activeService.deleteShift(id)
export const getExpenses = () => activeService.getExpenses()
export const saveExpenses = (e: PlannedExpense[]) => activeService.saveExpenses(e)
export const addExpense = (e: PlannedExpense) => activeService.addExpense(e)
export const updateExpense = (id: string, u: Partial<Omit<PlannedExpense, 'id'>>) => activeService.updateExpense(id, u)
export const deleteExpense = (id: string) => activeService.deleteExpense(id)
export const getTransactions = () => activeService.getTransactions()
export const saveTransactions = (t: TransactionRecord[]) => activeService.saveTransactions(t)
export const addTransaction = (t: TransactionRecord) => activeService.addTransaction(t)
export const updateTransaction = (id: string, u: Partial<Omit<TransactionRecord, 'id'>>) => activeService.updateTransaction(id, u)
export const deleteTransaction = (id: string) => activeService.deleteTransaction(id)
export const getCustomers = () => activeService.getCustomers()
export const saveCustomers = (c: Customer[]) => activeService.saveCustomers(c)
export const addCustomer = (c: Customer) => activeService.addCustomer(c)
export const updateCustomer = (id: string, u: Partial<Omit<Customer, 'id'>>) => activeService.updateCustomer(id, u)
export const archiveCustomer = (id: string) => activeService.archiveCustomer(id)
export const unarchiveCustomer = (id: string) => activeService.unarchiveCustomer(id)
export const deleteCustomer = (id: string) => activeService.deleteCustomer(id)
export const getUdhaarEntries = (customerId?: string) => activeService.getUdhaarEntries(customerId)
export const saveUdhaarEntries = (e: UdhaarEntry[]) => activeService.saveUdhaarEntries(e)
export const addUdhaarEntry = (e: UdhaarEntry) => activeService.addUdhaarEntry(e)
export const updateUdhaarEntry = (id: string, u: Partial<Omit<UdhaarEntry, 'id' | 'profileId'>>) => activeService.updateUdhaarEntry(id, u)
export const settleUdhaarEntry = (id: string, settledAt?: LocalDate) => activeService.settleUdhaarEntry(id, settledAt)
export const deleteUdhaarEntry = (id: string) => activeService.deleteUdhaarEntry(id)
export const getRepayments = (udhaarId?: string) => activeService.getRepayments(udhaarId)
export const saveRepayments = (r: RepaymentRecord[]) => activeService.saveRepayments(r)
export const recordRepayment = (p: RecordRepaymentParams) => activeService.recordRepayment(p)
export const clearAllData = () => activeService.clearAll()
export type { PaymentMode } from '../types'
