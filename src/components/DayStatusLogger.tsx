import { useEffect, useState } from 'react'
import type { DayStatus, LocalDate } from '../types'
import { getTodayLocalDate } from '../services/storage'
import { useDayLogs } from '../hooks/useData'

export function DayStatusLogger() {
  const { dayLogs, loading, upsertDayLog, deleteDayLog } = useDayLogs()
  const [date, setDate] = useState<LocalDate>(getTodayLocalDate())
  const [status, setStatus] = useState<DayStatus | ''>('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const savedStatus = dayLogs.find((log) => log.date === date)?.status

  useEffect(() => {
    setStatus(savedStatus ?? '')
  }, [date, savedStatus])

  async function save() {
    if (!date || !status) return
    setBusy(true)
    setMessage('')
    try {
      await upsertDayLog({ date, status })
      setMessage('Daily status saved.')
    } catch {
      setMessage('Could not save daily status. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!date) return
    setBusy(true)
    setMessage('')
    try {
      await deleteDayLog(date)
      setStatus('')
      setMessage('Daily status removed; the day is now missing.')
    } catch {
      setMessage('Could not remove daily status. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Daily work status</h2>
      <p className="text-sm text-slate-600">Mark days explicitly. No record means missing, not a day off. A completed day can have ₹0 earnings.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">Date
          <input className="mt-1 block w-full rounded-lg border border-slate-300 p-2" type="date" value={date} onChange={(e) => { setDate(e.target.value); setMessage('') }} />
        </label>
        <label className="text-sm font-medium text-slate-700">Status
          <select className="mt-1 block w-full rounded-lg border border-slate-300 p-2" value={status} onChange={(e) => { setStatus(e.target.value as DayStatus | ''); setMessage('') }}>
            <option value="">Missing / not recorded</option>
            <option value="complete">Complete — fully logged workday</option>
            <option value="no_work">No work — did not work</option>
            <option value="incomplete">Incomplete — still logging</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || loading || !date || !status} onClick={() => void save()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save day status</button>
        <button type="button" disabled={busy || loading || !date || !savedStatus} onClick={() => void remove()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Remove status</button>
      </div>
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </section>
  )
}
