import type {
  Profile,
  ShiftLog,
  PlannedExpense,
  LocalDate,
  MoneyPaise,
  TimeSlot,
  DayStatus,
  DayLog,
} from '../types'

/**
 * Storage Keys — Namespaced and versioned (incomeflow:v1:*)
 */
export const STORAGE_KEYS = {
  PROFILE: 'incomeflow:v1:profile',
  SHIFTS: 'incomeflow:v1:shifts',
  EXPENSES: 'incomeflow:v1:expenses',
  TRANSACTIONS: 'incomeflow:v1:transactions',
  DAY_LOGS: 'incomeflow:v1:daylogs',
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
      `Corrupted data found in storage for key "${key}". Raw value was preserved and not overwritten.${
        details ? ` Details: ${details}` : ''
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
export type PaymentMode = 'cash' | 'digital'

export interface TransactionRecord {
  id: string
  profileId: string
  type: TransactionType
  amountPaise: MoneyPaise
  date: LocalDate
  category: TransactionCategory
  paymentMode: PaymentMode
  description?: string
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

  return result
}

export const VALID_DAY_STATUSES: DayStatus[] = ['complete', 'no_work', 'incomplete']

export function validateDayLog(dayLog: unknown): DayLog {
  if (typeof dayLog !== 'object' || dayLog === null) {
    throw new StorageValidationError('DayLog must be an object')
  }
  const d = dayLog as Record<string, unknown>

  if (typeof d.date !== 'string' || !isValidLocalDate(d.date)) {
    throw new StorageValidationError(
      'DayLog date must be a valid calendar date in YYYY-MM-DD format',
      'date'
    )
  }
  if (
    typeof d.status !== 'string' ||
    !VALID_DAY_STATUSES.includes(d.status as DayStatus)
  ) {
    throw new StorageValidationError(
      'DayLog status must be "complete", "no_work", or "incomplete"',
      'status'
    )
  }

  return {
    date: d.date,
    status: d.status as DayStatus,
  }
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

  // Day Logs
  getDayLogs(): Promise<DayLog[]>
  saveDayLogs(dayLogs: DayLog[]): Promise<DayLog[]>
  upsertDayLog(dayLog: DayLog): Promise<DayLog>
  deleteDayLog(date: LocalDate): Promise<boolean>

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

  // --- Day Log Operations ---

  async getDayLogs(): Promise<DayLog[]> {
    const raw = this.readRaw(STORAGE_KEYS.DAY_LOGS)
    if (raw === null || raw.trim() === '') {
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new StorageCorruptionError(STORAGE_KEYS.DAY_LOGS, raw, 'Invalid JSON syntax')
    }

    if (!Array.isArray(parsed)) {
      throw new StorageValidationError(`Stored day logs must be an array, received ${typeof parsed}`)
    }

    const seenDates = new Set<string>()
    const validatedList: DayLog[] = []

    for (const item of parsed) {
      const validated = validateDayLog(item)
      if (seenDates.has(validated.date)) {
        throw new StorageValidationError(`Duplicate DayLog date detected: "${validated.date}"`)
      }
      seenDates.add(validated.date)
      validatedList.push(validated)
    }

    return validatedList.sort((a, b) => b.date.localeCompare(a.date))
  }

  async saveDayLogs(dayLogs: DayLog[]): Promise<DayLog[]> {
    if (!Array.isArray(dayLogs)) {
      throw new StorageValidationError('dayLogs must be an array')
    }

    const seenDates = new Set<string>()
    const validatedList: DayLog[] = []

    for (const item of dayLogs) {
      const validated = validateDayLog(item)
      if (seenDates.has(validated.date)) {
        throw new StorageValidationError(`Duplicate DayLog date detected: "${validated.date}"`)
      }
      seenDates.add(validated.date)
      validatedList.push(validated)
    }

    const sorted = validatedList.sort((a, b) => b.date.localeCompare(a.date))
    const json = JSON.stringify(sorted)
    this.writeRaw(STORAGE_KEYS.DAY_LOGS, json)
    return sorted
  }

  async upsertDayLog(dayLog: DayLog): Promise<DayLog> {
    const validated = validateDayLog(dayLog)
    const existing = await this.getDayLogs()
    const index = existing.findIndex((d) => d.date === validated.date)

    let updated: DayLog[]
    if (index >= 0) {
      updated = [...existing]
      updated[index] = validated
    } else {
      updated = [validated, ...existing]
    }

    await this.saveDayLogs(updated)
    return validated
  }

  async deleteDayLog(date: LocalDate): Promise<boolean> {
    if (typeof date !== 'string' || !isValidLocalDate(date)) {
      throw new StorageValidationError('Valid calendar date is required for deletion')
    }

    const existing = await this.getDayLogs()
    const filtered = existing.filter((d) => d.date !== date)
    if (filtered.length === existing.length) {
      return false
    }

    await this.saveDayLogs(filtered)
    return true
  }

  // --- Reset / Clear ---

  async clearAll(): Promise<void> {
    this.removeRaw(STORAGE_KEYS.PROFILE)
    this.removeRaw(STORAGE_KEYS.SHIFTS)
    this.removeRaw(STORAGE_KEYS.EXPENSES)
    this.removeRaw(STORAGE_KEYS.TRANSACTIONS)
    this.removeRaw(STORAGE_KEYS.DAY_LOGS)
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
  getDayLogs: () => activeService.getDayLogs(),
  saveDayLogs: (d: DayLog[]) => activeService.saveDayLogs(d),
  upsertDayLog: (d: DayLog) => activeService.upsertDayLog(d),
  deleteDayLog: (date: LocalDate) => activeService.deleteDayLog(date),
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
export const getDayLogs = () => activeService.getDayLogs()
export const saveDayLogs = (d: DayLog[]) => activeService.saveDayLogs(d)
export const upsertDayLog = (d: DayLog) => activeService.upsertDayLog(d)
export const deleteDayLog = (date: LocalDate) => activeService.deleteDayLog(date)
export const clearAllData = () => activeService.clearAll()
