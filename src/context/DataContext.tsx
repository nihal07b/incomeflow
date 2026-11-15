import { useEffect, type ReactNode } from 'react'
import { dataStore as defaultStore, DataStore, type DataStoreState } from '../services/dataStore'
import type { Profile, ShiftLog, DayLog, LocalDate } from '../types'
import type { TransactionRecord } from '../services/storage'
import { StoreContext } from './StoreContext'

export interface DataContextValue extends DataStoreState {
  saveProfile: (profile: Profile) => Promise<Profile>
  addShift: (shift: ShiftLog) => Promise<ShiftLog>
  updateShift: (id: string, updates: Partial<Omit<ShiftLog, 'id'>>) => Promise<ShiftLog>
  deleteShift: (id: string) => Promise<boolean>
  addTransaction: (transaction: TransactionRecord) => Promise<TransactionRecord>
  updateTransaction: (
    id: string,
    updates: Partial<Omit<TransactionRecord, 'id'>>
  ) => Promise<TransactionRecord>
  deleteTransaction: (id: string) => Promise<boolean>
  upsertDayLog: (dayLog: DayLog) => Promise<DayLog>
  deleteDayLog: (date: LocalDate) => Promise<boolean>
  refreshData: () => Promise<void>
}

export interface DataProviderProps {
  children: ReactNode
  store?: DataStore
}

export function DataProvider({ children, store = defaultStore }: DataProviderProps) {
  useEffect(() => {
    void store.init()
  }, [store])

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  )
}
