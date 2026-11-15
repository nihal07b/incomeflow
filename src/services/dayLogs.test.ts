import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageService, createMemoryStorageBackend, validateDayLog } from './storage'
import { DataStore } from './dataStore'

describe('DayLog persistence and shared state', () => {
  let storage: LocalStorageService
  beforeEach(() => { storage = new LocalStorageService(createMemoryStorageBackend()) })

  it('treats missing days as missing, not no_work', async () => {
    expect(await storage.getDayLogs()).toEqual([])
  })

  it('supports explicit complete, no_work, and incomplete statuses', async () => {
    await storage.upsertDayLog({ date: '2026-11-12', status: 'complete' })
    await storage.upsertDayLog({ date: '2026-11-13', status: 'no_work' })
    await storage.upsertDayLog({ date: '2026-11-14', status: 'incomplete' })
    expect((await storage.getDayLogs()).map(x => x.status)).toEqual(['incomplete', 'no_work', 'complete'])
  })

  it('upserts a single record per date and supports deletion', async () => {
    await storage.upsertDayLog({ date: '2026-11-14', status: 'incomplete' })
    await storage.upsertDayLog({ date: '2026-11-14', status: 'complete' })
    expect(await storage.getDayLogs()).toEqual([{ date: '2026-11-14', status: 'complete' }])
    expect(await storage.deleteDayLog('2026-11-14')).toBe(true)
    expect(await storage.getDayLogs()).toEqual([])
  })

  it('rejects invalid dates and statuses', async () => {
    expect(() => validateDayLog({ date: '2026-02-30', status: 'complete' })).toThrow()
    expect(() => validateDayLog({ date: '2026-11-14', status: 'unknown' })).toThrow()
    await expect(storage.saveDayLogs([
      { date: '2026-11-14', status: 'complete' },
      { date: '2026-11-14', status: 'no_work' },
    ])).rejects.toThrow()
  })

  it('publishes day log changes to shared DataStore subscribers', async () => {
    const store = new DataStore(storage)
    await store.init()
    let updates = 0
    const unsubscribe = store.subscribe(() => { updates += 1 })
    await store.upsertDayLog({ date: '2026-11-14', status: 'complete' })
    expect(store.getSnapshot().dayLogs).toEqual([{ date: '2026-11-14', status: 'complete' }])
    expect(updates).toBeGreaterThan(0)
    await store.deleteDayLog('2026-11-14')
    expect(store.getSnapshot().dayLogs).toEqual([])
    unsubscribe()
  })
})
