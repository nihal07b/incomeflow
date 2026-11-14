import { createContext } from 'react'
import { dataStore as defaultStore, DataStore } from '../services/dataStore'

export const StoreContext = createContext<DataStore>(defaultStore)
