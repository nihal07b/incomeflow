export function BillsVaultsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Bills & Savings Vaults
            </h1>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
              Member 3 Module
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Upcoming bill reminders, deadline tracking, and locked safety vaults to ensure on-time payment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg border border-dashed border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800">
            Reserved for Member 3
          </span>
        </div>
      </div>

      {/* Overview Cards Placeholder */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Bills and Vaults Summary">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Primary Upcoming Bill
            </p>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              Due in 7 days
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">Bike EMI: ₹4,000</p>
          <p className="mt-1 text-xs text-slate-500">Target due date: Next Tuesday</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Locked Savings Vault
          </p>
          <p className="mt-2 text-2xl font-bold text-teal-700">₹500</p>
          <p className="mt-1 text-xs text-slate-500">Minimum protected cash cushion</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Vault Target Progress
          </p>
          <p className="mt-2 text-2xl font-bold text-sky-700">12.5%</p>
          <p className="mt-1 text-xs text-slate-500">₹500 of ₹4,000 protected</p>
        </div>
      </section>

      {/* Member 3 Scope / Placeholder Details */}
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          Bills & Savings Vault Module
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          This section is owned by <strong>Member 3</strong>. It will include full CRUD for upcoming bills (EMI, room rent, phone recharge), automated cushion allocation rules, and vault progress tracking.
        </p>
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 rounded-xl bg-slate-50 p-4 text-left text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-sky-600" />
            <span>Single upcoming bill planner with priority sorting</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-sky-600" />
            <span>Virtual vaults ring-fenced from daily spending cash</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-sky-600" />
            <span>Integration with Member 4’s daily cashflow shortfall warnings</span>
          </div>
        </div>
      </section>
    </div>
  )
}
