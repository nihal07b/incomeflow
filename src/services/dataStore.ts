import type { Profile, ShiftLog, DayLog, LocalDate } from '../types'
import type { TransactionRecord } from './storage'
import {
  storageService,
  STORAGE_KEYS,
  type StorageService,
} from './storage'
import { calculateShiftSummary, type ShiftSummary } from '../utils/shifts'
import { calculateTransactionSummary, type TransactionSummary } from '../utils/transactions'

export interface DataStoreState {
  profile: Profile | null
  shifts: ShiftLog[]
  transactions: TransactionRecord[]
  dayLogs: DayLog[]
  loading: boolean
  error: string | null
  shiftSummary: ShiftSummary
  transactionSummary: TransactionSummary
  version: number
}

const initialShiftSummary: ShiftSummary = {
  totalHours: 0,
  totalGrossPaise: 0,
  totalWorkCostsPaise: 0,
  totalNetPaise: 0,
  averageNetHourlyPaise: 0,
  shiftCount: 0,
}

const initialTxSummary: TransactionSummary = {
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

export class DataStore {
  private service: StorageService
  private listeners = new Set<() => void>()
  private initPromise: Promise<void> | null = null

  private state: DataStoreState = {
    profile: null,
    shifts: [],
    transactions: [],
    dayLogs: [],
    loading: true,
    error: null,
    shiftSummary: initialShiftSummary,
    transactionSummary: initialTxSummary,
    version: 0,
  }

  constructor(service: StorageService = storageService) {
    this.service = service
    this.setupCrossTabSync()
  }

  private setupCrossTabSync(): void {
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (event) => {
        if (
          event.key &&
          (event.key === STORAGE_KEYS.PROFILE ||
            event.key === STORAGE_KEYS.SHIFTS ||
            event.key === STORAGE_KEYS.TRANSACTIONS ||
            event.key === STORAGE_KEYS.EXPENSES ||
            event.key === STORAGE_KEYS.DAY_LOGS)
        ) {
          void this.refresh()
        }
      })
    }
  }

  private notify(): void {
    this.state = {
      ...this.state,
      version: this.state.version + 1,
    }
    for (const listener of this.listeners) {
      listener()
    }
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  public getSnapshot = (): DataStoreState => {
    return this.state
  }

  public async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }
    this.initPromise = this.refresh()
    return this.initPromise
  }

  public async refresh(): Promise<void> {
    try {
      this.state = { ...this.state, loading: true, error: null }
      this.notify()

      const [profile, shifts, transactions, dayLogs] = await Promise.all([
        this.service.getProfile(),
        this.service.getShifts(),
        this.service.getTransactions(),
        this.service.getDayLogs(),
      ])

      const sortedShifts = [...shifts].sort((a, b) => b.date.localeCompare(a.date))
      const sortedTxs = [...transactions].sort((a, b) => b.date.localeCompare(a.date))
      const sortedDayLogs = [...dayLogs].sort((a, b) => b.date.localeCompare(a.date))

      this.state = {
        profile,
        shifts: sortedShifts,
        transactions: sortedTxs,
        dayLogs: sortedDayLogs,
        loading: false,
        error: null,
        shiftSummary: calculateShiftSummary(sortedShifts),
        transactionSummary: calculateTransactionSummary(sortedTxs),
        version: this.state.version + 1,
      }
      this.notify()
    } catch (err) {
      this.state = {
        ...this.state,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to synchronize data',
        version: this.state.version + 1,
      }
      this.notify()
    }
  }

  // Profile operations
  public async saveProfile(profile: Profile): Promise<Profile> {
    const saved = await this.service.saveProfile(profile)
    this.state = {
      ...this.state,
      profile: saved,
    }
    this.notify()
    return saved
  }

  // Shift operations
  public async addShift(shift: ShiftLog): Promise<ShiftLog> {
    const added = await this.service.addShift(shift)
    const updatedShifts = [added, ...this.state.shifts].sort((a, b) =>
      b.date.localeCompare(a.date)
    )
    this.state = {
      ...this.state,
      shifts: updatedShifts,
      shiftSummary: calculateShiftSummary(updatedShifts),
    }
    this.notify()
    return added
  }

  public async updateShift(
    id: string,
    updates: Partial<Omit<ShiftLog, 'id'>>
  ): Promise<ShiftLog> {
    const updated = await this.service.updateShift(id, updates)
    const updatedShifts = this.state.shifts
      .map((s) => (s.id === id ? updated : s))
      .sort((a, b) => b.date.localeCompare(a.date))

    this.state = {
      ...this.state,
      shifts: updatedShifts,
      shiftSummary: calculateShiftSummary(updatedShifts),
    }
    this.notify()
    return updated
  }

  public async deleteShift(id: string): Promise<boolean> {
    const deleted = await this.service.deleteShift(id)
    if (deleted) {
      const updatedShifts = this.state.shifts.filter((s) => s.id !== id)
      this.state = {
        ...this.state,
        shifts: updatedShifts,
        shiftSummary: calculateShiftSummary(updatedShifts),
      }
      this.notify()
    }
    return deleted
  }

  // Transaction operations
  public async addTransaction(
    transaction: TransactionRecord
  ): Promise<TransactionRecord> {
    const added = await this.service.addTransaction(transaction)
    const updatedTxs = [added, ...this.state.transactions].sort((a, b) =>
      b.date.localeCompare(a.date)
    )
    this.state = {
      ...this.state,
      transactions: updatedTxs,
      transactionSummary: calculateTransactionSummary(updatedTxs),
    }
    this.notify()
    return added
  }

  public async updateTransaction(
    id: string,
    updates: Partial<Omit<TransactionRecord, 'id'>>
  ): Promise<TransactionRecord> {
    const updated = await this.service.updateTransaction(id, updates)
    const updatedTxs = this.state.transactions
      .map((t) => (t.id === id ? updated : t))
      .sort((a, b) => b.date.localeCompare(a.date))

    this.state = {
      ...this.state,
      transactions: updatedTxs,
      transactionSummary: calculateTransactionSummary(updatedTxs),
    }
    this.notify()
    return updated
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    const deleted = await this.service.deleteTransaction(id)
    if (deleted) {
      const updatedTxs = this.state.transactions.filter((t) => t.id !== id)
      this.state = {
        ...this.state,
        transactions: updatedTxs,
        transactionSummary: calculateTransactionSummary(updatedTxs),
      }
      this.notify()
    }
    return deleted
  }

  // Day Log operations
  public async upsertDayLog(dayLog: DayLog): Promise<DayLog> {
    const upserted = await this.service.upsertDayLog(dayLog)
    const existing = this.state.dayLogs
    const index = existing.findIndex((d) => d.date === upserted.date)
    let updatedList: DayLog[]
    if (index >= 0) {
      updatedList = [...existing]
      updatedList[index] = upserted
    } else {
      updatedList = [upserted, ...existing]
    }
    const sorted = updatedList.sort((a, b) => b.date.localeCompare(a.date))
    this.state = {
      ...this.state,
      dayLogs: sorted,
    }
    this.notify()
    return upserted
  }

  public async deleteDayLog(date: LocalDate): Promise<boolean> {
    const deleted = await this.service.deleteDayLog(date)
    if (deleted) {
      const updated = this.state.dayLogs.filter((d) => d.date !== date)
      this.state = {
        ...this.state,
        dayLogs: updated,
      }
      this.notify()
    }
    return deleted
  }
}

// Global default singleton store
export const dataStore = new DataStore()
