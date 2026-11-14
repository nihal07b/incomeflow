export function IncomeExpensesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Income & Expenses
            </h1>
            <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              Member 1
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Track declared cash on hand, daily essentials, and surprise costs like vehicle repairs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg border border-dashed border-teal-300 bg-teal-50/50 px-3 py-1.5 text-xs font-medium text-teal-800">
            Phase 1 Layout Placeholder
          </span>
        </div>
      </div>

      {/* Summary KPI Placeholders */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4" aria-label="Cashflow Overview">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Current Declared Cash</p>
          <p className="mt-1 text-2xl font-bold text-teal-700">₹1,500</p>
          <span className="text-[11px] text-slate-400">Includes reserved cushion</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Essential Daily Spend</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">₹200 / day</p>
          <span className="text-[11px] text-slate-400">Food, basic groceries, chai</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Unplanned Expenses</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">₹0</p>
          <span className="text-[11px] text-slate-400">Repairs, medical, fines</span>
        </div>
      </section>

      {/* Expense Entry Section Placeholder */}
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 sm:p-8">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-8 8H6a2 2 0 0 1-2-2V7" />
              <circle cx="18" cy="14" r="1" />
            </svg>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-slate-900">
            Income & Expense Logger (Phase 3)
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Record cash deposits, essential daily survival expenditures, and emergency vehicle repairs so the next-bill engine reflects exact liquidity.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
              🏷️ Expense Category
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
              💵 Amount (Integer Paise)
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
              📅 Local Calendar Date
            </span>
            <span className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
              🛡️ Cash Cushion Protection
            </span>
          </div>
        </div>
      </section>

      {/* Ledger History List Placeholder */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-base font-semibold text-slate-900">Expense Ledger History</h2>
          <span className="text-xs text-slate-500">0 records</span>
        </div>
        <div className="py-12 text-center">
          <p className="text-sm text-slate-500">No expenses recorded yet.</p>
          <p className="mt-1 text-xs text-slate-400">
            Recorded transactions will update the cash-as-of balance and recalculate the bill gap.
          </p>
        </div>
      </section>
    </div>
  )
}
