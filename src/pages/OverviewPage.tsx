import { useState } from 'react'
import { calculateBillGap } from '../engine/cashflow'
import { demoProjection } from '../demo/scenario'

const rupees = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)

export function OverviewPage() {
  const [repair, setRepair] = useState(false)
  const [extraShift, setExtraShift] = useState(false)

  const result = calculateBillGap({
    ...demoProjection,
    otherExpensesPaise: repair ? 70000 : 0,
    expectedNetEarningsPaise:
      demoProjection.expectedNetEarningsPaise + (extraShift ? 65000 : 0),
  })

  return (
    <div className="space-y-8">
      {/* Hero / Overview Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-teal-800">
            Next-Bill Scenario Planner
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
            Synthetic Demo
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          See what changes when life happens.
        </h1>
        <p className="mt-2 text-base text-slate-600 sm:text-lg">
          An editable planning foundation for delivery riders. These figures are planning assumptions, not historical guarantees or money already in the bank.
        </p>
      </div>

      {/* Primary Metric Cards */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Bill summary">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <h2 className="text-sm font-medium text-slate-500">Bill due in 7 days</h2>
          <p className="mt-2 text-3xl font-bold text-slate-900" aria-live="polite">
            {rupees(demoProjection.billAmountPaise)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Bike EMI due next Tuesday</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <h2 className="text-sm font-medium text-slate-500">Available cash now</h2>
          <p className="mt-2 text-3xl font-bold text-teal-700" aria-live="polite">
            {rupees(demoProjection.currentCashPaise)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Includes declared safety cushion</p>
        </article>

        <article
          className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
            result.billGapPaise > 0
              ? 'border-amber-200 bg-amber-50/50'
              : 'border-emerald-200 bg-emerald-50/50'
          }`}
        >
          <h2 className="text-sm font-medium text-slate-600">Estimated bill gap</h2>
          <p
            className={`mt-2 text-3xl font-bold ${
              result.billGapPaise > 0 ? 'text-amber-800' : 'text-emerald-700'
            }`}
            aria-live="polite"
          >
            {rupees(result.billGapPaise)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {result.billGapPaise > 0 ? 'Deficit after retaining cushion' : 'Fully funded with cushion'}
          </p>
        </article>
      </section>

      {/* Scenario Sandbox Comparison */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Compare a change</h2>
            <p className="mt-1 text-sm text-slate-600">
              Assumptions: Essentials {rupees(demoProjection.essentialsPaise)} · Safety Cushion {rupees(demoProjection.minimumCushionPaise)} · Planned Net {rupees(demoProjection.expectedNetEarningsPaise)}
            </p>
          </div>
          <button
            type="button"
            className="self-start rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700 sm:self-auto"
            onClick={() => {
              setRepair(false)
              setExtraShift(false)
            }}
          >
            Reset scenario
          </button>
        </div>

        <div className="my-6 space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <label className="flex cursor-pointer items-start gap-3 select-none">
            <input
              className="mt-0.5 size-5 rounded border-slate-300 accent-teal-700"
              type="checkbox"
              checked={repair}
              onChange={(e) => setRepair(e.target.checked)}
            />
            <span className="text-sm text-slate-800">
              <strong className="font-semibold text-slate-900">Add a ₹700 vehicle repair:</strong> Simulates emergency bike puncture/oil change expense before the bill date.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 select-none">
            <input
              className="mt-0.5 size-5 rounded border-slate-300 accent-teal-700"
              type="checkbox"
              checked={extraShift}
              onChange={(e) => setExtraShift(e.target.checked)}
            />
            <span className="text-sm text-slate-800">
              <strong className="font-semibold text-slate-900">Assume an additional available shift earns ₹650 net:</strong> Adds one weekend evening surge shift.
            </span>
          </label>
        </div>

        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            result.billGapPaise > 0
              ? 'bg-amber-50 text-amber-950 border border-amber-200'
              : 'bg-teal-50 text-teal-950 border border-teal-200'
          }`}
          aria-live="polite"
        >
          {result.billGapPaise > 0
            ? `⚠️ This scenario still leaves an estimated ${rupees(result.billGapPaise)} gap after retaining your cash cushion.`
            : `✓ This scenario appears sufficient for the bill while retaining your cash cushion of ${rupees(demoProjection.minimumCushionPaise)}.`}
        </div>
      </section>

      {/* Module Overview & Integration Architecture */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Module Navigation Map</h2>
        <p className="mt-1 text-sm text-slate-600">
          IncomeFlow brings together four dedicated modules to safeguard rider finances:
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Shifts & Work Sessions</h3>
              <span className="rounded bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">Member 1</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Log daily delivery hours, gross earnings, and real fuel/maintenance costs.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Income & Expenses</h3>
              <span className="rounded bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">Member 1</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Track daily essentials, unplanned costs, and maintain accurate cash balances.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Bills & Savings Vaults</h3>
              <span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">Member 3</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Track recurring bills, due dates, and lock away emergency safety cushions.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Udhaar & Repayments</h3>
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">Member 2</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Track informal peer borrowing/lending and factor repayments into cash flow.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
