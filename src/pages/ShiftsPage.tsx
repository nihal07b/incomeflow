export function ShiftsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Shifts & Work Sessions
            </h1>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              Member 1
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Log your daily platform delivery shifts, fuel deductions, and track true net hourly earnings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg border border-dashed border-teal-300 bg-teal-50/50 px-3 py-1.5 text-xs font-medium text-teal-800">
            Phase 1 Layout Placeholder
          </span>
        </div>
      </div>

      {/* Summary KPI Placeholders */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" aria-label="Shift Statistics">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Weekly Hours</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">0.0 hrs</p>
          <span className="text-[11px] text-slate-400">Target: 36 hrs</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Gross Earnings</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">₹0</p>
          <span className="text-[11px] text-slate-400">Before fuel & bike cost</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Fuel & Work Costs</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">₹0</p>
          <span className="text-[11px] text-slate-400">Petrol, maintenance</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Net Take-Home</p>
          <p className="mt-1 text-2xl font-bold text-teal-700">₹0</p>
          <span className="text-[11px] text-slate-400">Actual spendable income</span>
        </div>
      </section>

      {/* Shift Logging Entry Form Placeholder Area */}
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            Work-Session Logger (Phase 3)
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            The shift entry form will capture session date, slot (Morning, Afternoon, Evening, Night), duration in hours, platform gross earnings, and real fuel/bike expenses.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
              📅 Date & Time Slot
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
              ⏱️ Shift Hours
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
              💰 Gross Earnings (Paise)
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
              ⛽ Petrol & Vehicle Costs
            </span>
          </div>
        </div>
      </section>

      {/* Shift History List Placeholder */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-semibold text-slate-900">Logged Shift History</h2>
          <span className="text-xs text-slate-500">0 records</span>
        </div>
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500">No shifts logged yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Shifts logged here will feed directly into Member 4’s cash-flow projections and baseline earnings model.
          </p>
        </div>
      </section>
    </div>
  )
}
