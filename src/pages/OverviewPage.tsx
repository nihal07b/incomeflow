import { useEffect, useState } from 'react'
import { getAnalysisRange, getTodayIST, loadFinancialAnalysis } from '../services/financialAnalysis'
import type { AnalysisPeriod, AnalysisView } from '../services/financialAnalysis'
import { STORAGE_KEYS } from '../services/storage'

const money = (paise: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(paise / 100)
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'
const button = 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700'

type LoadState =
  | { key: string; status: 'loading' }
  | { key: string; status: 'success'; data: AnalysisView }
  | { key: string; status: 'error'; message: string }

function AnalysisResults({ data }: { data: AnalysisView }) {
  const { summary, recordedDates, hasRecords, dayStatuses, dayAnalysis } = data
  const knownIncomeDate = (date: string) => recordedDates.includes(date) || dayStatuses[date] === 'complete' || dayStatuses[date] === 'no_work'
  const hasDailyEvidence = hasRecords || Object.values(dayStatuses).some(status => status === 'complete' || status === 'no_work')
  const statusLabel = (date: string) => {
    if (dayAnalysis.status === 'error') return 'Daily status unavailable'
    switch (dayStatuses[date]) {
      case 'complete': return 'Complete — worked'
      case 'no_work': return 'Explicitly no work'
      case 'incomplete': return 'Incomplete logging'
      default: return 'Unknown — no daily status'
    }
  }
  const recorded = new Set(recordedDates)
  const peak = Math.max(1, ...summary.dailySeries.map(day => day.incomePaise))
  const categories = Object.entries(summary.expenseCategoryTotals).sort((a, b) => b[1] - a[1])
  const categoryMax = Math.max(1, ...categories.map(([, amount]) => amount))
  const cards = [
    { label: 'Recorded income', amount: summary.periodIncomePaise, note: 'Cash receipts in the selected period', color: 'text-teal-800' },
    { label: 'Recorded expenses', amount: summary.periodExpensesPaise, note: 'Expense entries in the selected period', color: 'text-rose-800' },
    { label: 'Net recorded cash flow', amount: summary.netRecordedCashFlowPaise, note: 'Income minus expenses — not your current balance', color: 'text-slate-900' },
  ]
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">Loaded {data.startDate} to {data.endDate}, inclusive · IST calendar dates · Local profile: <span className="break-all font-medium">{data.profileId}</span></p>
      {!hasRecords && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        No transaction entries in this period. Saved daily statuses are shown below when available; unlogged days remain unknown.
      </div>}
      <section aria-label="Financial totals" className="grid gap-4 md:grid-cols-3">
        {cards.map(card => <article key={card.label} className={panel}>
          <h2 className="text-sm font-medium text-slate-600">{card.label}</h2>
          <p className={`mt-3 break-words text-2xl font-bold ${card.color}`}>{hasRecords ? money(card.amount) : 'No entries'}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{card.note}</p>
        </article>)}
      </section>

      <section className={panel} aria-labelledby="income-trend-heading">
        <h2 id="income-trend-heading" className="text-lg font-bold text-slate-900">Recorded income trend</h2>
        <p className="mt-1 text-sm text-slate-600">Bars show recorded cash income, including repayments. A completed workday can have ₹0 income. No-work days are labelled separately. Grey markers are unknown or incomplete days without entries, not confirmed zero earnings.</p>
        {hasDailyEvidence ? <>
          <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable daily income chart">
            <div className="flex items-end gap-2 border-b border-slate-200 pb-2" style={{ minWidth: summary.dailySeries.length * 48 }}>
              {summary.dailySeries.map(day => <div key={day.date} className="min-w-10 flex-1 text-center">
                <div className="flex h-36 items-end justify-center">
                  {knownIncomeDate(day.date) ? <div
                    className="w-6 rounded-t bg-teal-600"
                    style={{ height: day.incomePaise === 0 ? 2 : Math.max(3, day.incomePaise / peak * 140) }}
                    role="img" aria-label={`${day.date}: ${money(day.incomePaise)} recorded income; ${statusLabel(day.date)}`}
                    title={`${day.date}: ${money(day.incomePaise)} recorded income; ${statusLabel(day.date)}`}
                  /> : <span role="img" aria-label={`${day.date}: ${statusLabel(day.date)}; no transaction entries`} title={`${day.date}: ${statusLabel(day.date)}; no transaction entries`} className="mb-1 h-1 w-5 rounded bg-slate-300" />}
                </div>
                <span className="mt-2 block text-xs text-slate-600">{day.date.slice(8)}/{day.date.slice(5, 7)}</span>
              </div>)}
            </div>
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-teal-800">View exact daily values</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Daily recorded income, expenses and net cash flow for the selected period</caption>
                <thead><tr className="border-b border-slate-200"><th scope="col" className="p-2">Date</th><th scope="col" className="p-2">Income</th><th scope="col" className="p-2">Expenses</th><th scope="col" className="p-2">Net</th><th scope="col" className="p-2">Records</th></tr></thead>
                <tbody>{summary.dailySeries.map(day => <tr key={day.date} className="border-b border-slate-100">
                  <th scope="row" className="whitespace-nowrap p-2 font-normal">{day.date}</th>
                  {[day.incomePaise, day.expensesPaise, day.netPaise].map((value, index) => <td key={index} className="whitespace-nowrap p-2">{recorded.has(day.date) || dayStatuses[day.date] === 'complete' || (index === 0 && dayStatuses[day.date] === 'no_work') ? money(value) : '—'}</td>)}
                  <td className="p-2">{statusLabel(day.date)}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>
        </> : <p className="mt-5 text-sm text-slate-500">No recorded trend to display.</p>}
      </section>

      <section className={panel} aria-labelledby="expense-categories-heading">
        <h2 id="expense-categories-heading" className="text-lg font-bold text-slate-900">Expense categories</h2>
        {categories.length ? <ul className="mt-4 space-y-4">
          {categories.map(([category, amount]) => <li key={category}>
            <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span className="capitalize text-slate-700">{category.replace(/[-_]/g, ' ')}</span><span className="font-semibold">{money(amount)}</span></div>
            <div aria-hidden="true" className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${amount / categoryMax * 100}%` }} /></div>
          </li>)}
        </ul> : <p className="mt-4 text-sm text-slate-500">{hasRecords ? 'No expense entries in this period.' : 'No transaction entries in this period.'}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Savings and recorded-day analysis">
        <article className={panel}>
          <h2 className="text-lg font-bold text-slate-900">Savings summary</h2>
          <p className="mt-3 font-medium text-slate-700">Unavailable — allocation data not connected</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">The supplied summary does not include savings contributions or withdrawals. Net cash flow is not being substituted for savings.</p>
        </article>
        <article className={panel}>
          <h2 className="text-lg font-bold text-slate-900">Best / worst recorded earning days</h2>
          <p className="mt-2 text-sm text-slate-600">Uses recorded cash income on completed workdays only, including any repayments. No-work, incomplete and missing days are not ranked.</p>
          {dayAnalysis.status === 'error' ? <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">Daily analysis needs attention</p>
            <p className="mt-1">{dayAnalysis.message}</p>
            <p className="mt-2">Review daily statuses in Shifts &amp; Work Sessions, then use Refresh records above. Transaction totals remain available.</p>
          </div> : <>
            <p className="mt-3 text-sm text-slate-600">{dayAnalysis.result.eligibleDayCount} completed workdays · {dayAnalysis.result.noWorkDayCount} no-work days · {dayAnalysis.result.incompleteDayCount} incomplete · {dayAnalysis.result.missingDayCount} missing</p>
            <p className="mt-1 text-xs text-slate-500">Under the current calculation rules, today is counted as incomplete unless marked complete.</p>
            {dayAnalysis.result.bestRecordedDays?.length ? <div className="mt-4 space-y-4">
              <div><h3 className="font-semibold text-teal-800">Best recorded day(s)</h3><ul>{dayAnalysis.result.bestRecordedDays.map(day => <li key={day.date} className="mt-1 text-sm">{day.date}: {money(day.incomePaise)}</li>)}</ul></div>
              <div><h3 className="font-semibold text-slate-800">Worst recorded day(s)</h3><ul>{dayAnalysis.result.worstRecordedDays?.map(day => <li key={day.date} className="mt-1 text-sm">{day.date}: {money(day.incomePaise)}</li>)}</ul></div>
              {dayAnalysis.result.bestEqualsWorst && <p className="text-sm text-slate-600">Best and worst match because there is one completed workday, or all completed workdays have equal income.</p>}
            </div> : <p className="mt-4 text-sm text-slate-600">No completed workdays in this period. Mark a genuinely finished workday complete to include it. Completed ₹0 days are eligible.</p>}
            <dl className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
              <div><dt>Average per recorded workday</dt><dd className="font-semibold">{dayAnalysis.result.averageIncomePerRecordedWorkday ? money(dayAnalysis.result.averageIncomePerRecordedWorkday.averagePaise) : 'Unavailable — no completed workdays'}</dd></div>
              <div><dt>Average per fully logged calendar day</dt><dd className="font-semibold">{dayAnalysis.result.averageIncomePerFullyLoggedCalendarDay ? money(dayAnalysis.result.averageIncomePerFullyLoggedCalendarDay.averagePaise) : 'Unavailable — no fully logged days'}</dd></div>
            </dl>
          </>}
        </article>
      </section>
    </div>
  )
}

export function OverviewPage() {
  const [period, setPeriod] = useState<AnalysisPeriod>('week')
  const [endDate, setEndDate] = useState(getTodayIST)
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<LoadState>({ key: '', status: 'loading' })
  const requestKey = `${period}:${endDate}:${revision}`
  let rangeLabel = ''
  try { const range = getAnalysisRange(period, endDate); rangeLabel = `${range.startDate} to ${range.endDate} (inclusive)` } catch { rangeLabel = 'Choose a valid end date.' }

  useEffect(() => {
    let cancelled = false
    loadFinancialAnalysis(period, endDate).then(data => {
      if (!cancelled) setState({ key: requestKey, status: 'success', data })
    }).catch((error: unknown) => {
      if (!cancelled) setState({ key: requestKey, status: 'error', message: error instanceof Error ? error.message : 'Unable to load financial records.' })
    })
    return () => { cancelled = true }
  }, [period, endDate, requestKey])

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1)
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === STORAGE_KEYS.TRANSACTIONS || event.key === STORAGE_KEYS.PROFILE || event.key === STORAGE_KEYS.DAY_LOGS) refresh()
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', onStorage) }
  }, [])

  const loading = state.key !== requestKey || state.status === 'loading'
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-teal-700">IncomeFlow · Financial analysis</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Know what came in. See what went out.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Based only on saved transaction records in this browser. No synthetic transactions are loaded. Unlogged activity is unknown.</p>
      </header>
      <section className={panel} aria-label="Analysis period controls">
        <div className="flex flex-wrap items-end gap-4">
          <label className="min-w-0 w-full text-sm font-medium text-slate-700 sm:w-auto">Period
            <select value={period} onChange={event => setPeriod(event.target.value as AnalysisPeriod)} className="mt-1 block w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="week">Weekly — Monday to selected date</option>
              <option value="month">Monthly — first day to selected date</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Period ending (IST)
            <input type="date" value={endDate} min="1900-01-01" max={getTodayIST()} onChange={event => setEndDate(event.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2" />
          </label>
          <button className={button} type="button" onClick={() => setRevision(value => value + 1)}>Refresh records</button>
        </div>
        <p className="mt-3 text-sm text-slate-500">{rangeLabel}. All loaded cards and charts use this same period.</p>
      </section>
      {loading ? <div role="status" className={panel}>Loading recorded financial activity…</div> : state.status === 'error' ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
        <h2 className="font-semibold">Could not load financial analysis</h2>
        <p className="mt-2 text-sm">{state.message}</p>
        <p className="mt-2 text-sm">No demo figures have been substituted. Correct the date or underlying data, then retry. Do not clear storage to hide this error.</p>
        <button type="button" className={`${button} mt-4`} onClick={() => setRevision(value => value + 1)}>Retry</button>
      </div> : state.status === 'success' ? <AnalysisResults data={state.data} /> : null}
    </div>
  )
}
