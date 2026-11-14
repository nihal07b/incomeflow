export function UdhaarPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Udhaar & Peer Repayments
            </h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
              Member 2 Module
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Track informal peer borrowing, petrol pump credit, and scheduled repayment commitments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-800">
            Reserved for Member 2
          </span>
        </div>
      </div>

      {/* Summary KPI Placeholders */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Udhaar Summary">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Udhaar Taken (Owed)
            </p>
            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
              Payable
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">₹0</p>
          <p className="mt-1 text-xs text-slate-500">Money owed to friends/mechanics</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Udhaar Given (Receivable)
            </p>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Receivable
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">₹0</p>
          <p className="mt-1 text-xs text-slate-500">Money owed to you by co-riders</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Net Informal Balance
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">₹0</p>
          <p className="mt-1 text-xs text-slate-500">Scheduled before next bill date</p>
        </div>
      </section>

      {/* Member 2 Scope / Placeholder Details */}
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m16 3 4 4-4 4" />
            <path d="M20 7H4" />
            <path d="m8 21-4-4 4-4" />
            <path d="M4 17h16" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">
          Udhaar & Informal Credit Ledger
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          This section is owned by <strong>Member 2</strong>. It will record informal loans, peer borrow/lend records, contact names, repayment due dates, and factor those cash outflows into the next-bill timeline.
        </p>
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 rounded-xl bg-slate-50 p-4 text-left text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-indigo-600" />
            <span>Peer-to-peer credit book (petrol pump khata, mechanic udhaar)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-indigo-600" />
            <span>Due date timeline syncing with cash flow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-indigo-600" />
            <span>Repayment commitments factored into available spendable cash</span>
          </div>
        </div>
      </section>
    </div>
  )
}
