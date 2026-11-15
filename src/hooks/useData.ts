import { useContext, useSyncExternalStore } from 'react'
import { StoreContext } from '../context/StoreContext'
import type { DataContextValue } from '../context/DataContext'
import type { Profile, ShiftLog, DayLog, LocalDate } from '../types'
import type { TransactionRecord } from '../services/storage'
import type { ShiftSummary } from '../utils/shifts'
import type { TransactionSummary } from '../utils/transactions'

/**
 * Primary hook to consume the complete shared data state.
 * Subscribes reactively using useSyncExternalStore.
 */
export function useData(): DataContextValue {
  const store = useContext(StoreContext)
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return {
    ...state,
    saveProfile: (p: Profile) => store.saveProfile(p),
    addShift: (s: ShiftLog) => store.addShift(s),
    updateShift: (id: string, u: Partial<Omit<ShiftLog, 'id'>>) => store.updateShift(id, u),
    deleteShift: (id: string) => store.deleteShift(id),
    addTransaction: (t: TransactionRecord) => store.addTransaction(t),
    updateTransaction: (id: string, u: Partial<Omit<TransactionRecord, 'id'>>) =>
      store.updateTransaction(id, u),
    deleteTransaction: (id: string) => store.deleteTransaction(id),
    upsertDayLog: (log: DayLog) => store.upsertDayLog(log),
    deleteDayLog: (date: LocalDate) => store.deleteDayLog(date),
    refreshData: () => store.refresh(),
  }
}

/**
 * Focused hook for User Profile
 */
export function useProfile(): {
  profile: Profile | null
  loading: boolean
  error: string | null
  saveProfile: (profile: Profile) => Promise<Profile>
} {
  const data = useData()
  return {
    profile: data.profile,
    loading: data.loading,
    error: data.error,
    saveProfile: data.saveProfile,
  }
}

/**
 * Focused hook for Shifts & Work Sessions
 */
export function useShifts(): {
  shifts: ShiftLog[]
  shiftSummary: ShiftSummary
  loading: boolean
  error: string | null
  addShift: (shift: ShiftLog) => Promise<ShiftLog>
  updateShift: (id: string, updates: Partial<Omit<ShiftLog, 'id'>>) => Promise<ShiftLog>
  deleteShift: (id: string) => Promise<boolean>
  refreshShifts: () => Promise<void>
} {
  const data = useData()
  return {
    shifts: data.shifts,
    shiftSummary: data.shiftSummary,
    loading: data.loading,
    error: data.error,
    addShift: data.addShift,
    updateShift: data.updateShift,
    deleteShift: data.deleteShift,
    refreshShifts: data.refreshData,
  }
}

/**
 * Focused hook for Income & Expense Transactions
 */
export function useTransactions(): {
  transactions: TransactionRecord[]
  transactionSummary: TransactionSummary
  loading: boolean
  error: string | null
  addTransaction: (transaction: TransactionRecord) => Promise<TransactionRecord>
  updateTransaction: (
    id: string,
    updates: Partial<Omit<TransactionRecord, 'id'>>
  ) => Promise<TransactionRecord>
  deleteTransaction: (id: string) => Promise<boolean>
  refreshTransactions: () => Promise<void>
} {
  const data = useData()
  return {
    transactions: data.transactions,
    transactionSummary: data.transactionSummary,
    loading: data.loading,
    error: data.error,
    addTransaction: data.addTransaction,
    updateTransaction: data.updateTransaction,
    deleteTransaction: data.deleteTransaction,
    refreshTransactions: data.refreshData,
  }
}

/** Reactive daily work status records for analytics and the work log UI. */
export function useDayLogs(): {
  dayLogs: DayLog[]
  loading: boolean
  error: string | null
  upsertDayLog: (log: DayLog) => Promise<DayLog>
  deleteDayLog: (date: LocalDate) => Promise<boolean>
} {
  const data = useData()
  return {
    dayLogs: data.dayLogs,
    loading: data.loading,
    error: data.error,
    upsertDayLog: data.upsertDayLog,
    deleteDayLog: data.deleteDayLog,
  }
}
