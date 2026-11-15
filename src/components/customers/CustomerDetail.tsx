import { useState } from 'react'
import type { Customer, UdhaarEntry, UdhaarStatus, MoneyPaise, LocalDate, PaymentMode } from '../../types'
import {
  deriveUdhaarStatus,
  calculateCustomerOutstandingPaise,
  getUdhaarRemainingPaise,
} from '../../services/storage'
import { RepaymentModal } from './RepaymentModal'

interface CustomerDetailProps {
  customer: Customer
  entries: UdhaarEntry[]
  onBack: () => void
  onEdit: (customer: Customer) => void
  onDelete?: (customerId: string) => void
  onArchive?: (customerId: string) => void
  onUnarchive?: (customerId: string) => void
  onAddUdhaar: () => void
  onSettleUdhaar?: (entryId: string) => Promise<void>
  onRecordRepayment: (data: {
    requestId: string
    udhaarId: string
    amountPaise: MoneyPaise
    date: LocalDate
    paymentMode: PaymentMode
    note?: string
  }) => Promise<void>
}

const formatRupees = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)

export function CustomerDetail({
  customer,
  entries,
  onBack,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
  onAddUdhaar,
  onRecordRepayment,
}: CustomerDetailProps) {
  const [filter, setFilter] = useState<'all' | UdhaarStatus>('all')
  const [selectedEntryForRepayment, setSelectedEntryForRepayment] = useState<UdhaarEntry | null>(null)

  // Derive status for all customer entries
  const entriesWithStatus = entries.map((entry) => ({
    ...entry,
    derivedStatus: deriveUdhaarStatus(entry),
  }))

  const filteredEntries =
    filter === 'all'
      ? entriesWithStatus
      : entriesWithStatus.filter((e) => e.derivedStatus === filter)

  // Calculations
  const outstandingPaise = calculateCustomerOutstandingPaise(entries, customer.id)
  const overdueEntries = entriesWithStatus.filter((e) => e.derivedStatus === 'overdue')
  const dueTodayEntries = entriesWithStatus.filter((e) => e.derivedStatus === 'due-today')
  const pendingEntries = entriesWithStatus.filter((e) => e.derivedStatus === 'pending')
  const settledEntries = entriesWithStatus.filter((e) => e.derivedStatus === 'settled')

  const getStatusBadge = (status: UdhaarStatus) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
            <span className="size-1.5 rounded-full bg-rose-600" />
            Overdue
          </span>
        )
      case 'due-today':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 animate-pulse">
            <span className="size-1.5 rounded-full bg-amber-600" />
            Due Today
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
            <span className="size-1.5 rounded-full bg-indigo-600" />
            Pending
          </span>
        )
      case 'settled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Settled
          </span>
        )
    }
  }

  return (
    <div className="space-y-6" aria-label={`Customer details for ${customer.name}`}>
      {/* Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Customer List
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {customer.isArchived ? (
            onUnarchive && (
              <button
                type="button"
                onClick={() => onUnarchive(customer.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-hidden"
              >
                Unarchive Customer
              </button>
            )
          ) : (
            onArchive && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Archive customer "${customer.name}"? Their financial credit history will be preserved.`
                    )
                  ) {
                    onArchive(customer.id)
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-hidden"
                title="Archives customer while preserving all financial history"
              >
                Archive Customer
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onEdit(customer)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit Info
          </button>

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Remove customer "${customer.name}" from active list? All past credit entries and financial history will remain intact.`
                  )
                ) {
                  onDelete(customer.id)
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 focus:outline-hidden"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 font-bold text-indigo-700 text-xl shadow-2xs">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {customer.name}
                </h1>
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 border border-indigo-200">
                  ID: #{customer.id}
                </span>
                {customer.isArchived && (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-300">
                    Archived
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Registered on {customer.createdAt}
              </p>
            </div>
          </div>

          {/* Outstanding Balance KPI Pill */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:text-right">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Outstanding Credit Balance
            </span>
            <p className={`mt-1 text-3xl font-extrabold ${outstandingPaise > 0 ? (overdueEntries.length > 0 ? 'text-rose-600' : 'text-slate-900') : 'text-emerald-600'}`}>
              {formatRupees(outstandingPaise)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {outstandingPaise > 0
                ? `${overdueEntries.length} overdue · ${dueTodayEntries.length} due today`
                : 'All debts cleared'}
            </p>
          </div>
        </div>

        {/* Customer Info Grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Contact / Location
            </span>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {customer.contact}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Notes & Memo
            </span>
            <p className="mt-1 text-sm text-slate-700">
              {customer.note || 'No notes added.'}
            </p>
          </div>
        </div>

        {/* Identity & Accounting Notice */}
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-900 flex items-start gap-2.5">
          <svg className="size-4 shrink-0 text-indigo-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <div>
            <strong>Identity &amp; Financial Integrity:</strong> Bound to ID <code className="font-mono font-bold">#{customer.id}</code>. Credit recorded here is tracked separately from cash-on-hand. Archiving a customer never deletes their credit history.
          </div>
        </div>
      </div>

      {/* Credit Entries Ledger Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Udhaar &amp; Credit Ledger
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Records for {customer.name} · {entries.length} {entries.length === 1 ? 'entry' : 'entries'} total
            </p>
          </div>

          {/* Add Udhaar Button */}
          <button
            type="button"
            onClick={onAddUdhaar}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Record Udhaar Credit
          </button>
        </div>

        {/* Filter Pills */}
        {entries.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
            >
              Pending ({pendingEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('due-today')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === 'due-today' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
            >
              Due Today ({dueTodayEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('overdue')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === 'overdue' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
            >
              Overdue ({overdueEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('settled')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${filter === 'settled' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
            >
              Settled ({settledEntries.length})
            </button>
          </div>
        )}

        {/* Empty State */}
        {entries.length === 0 ? (
          <div className="my-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 3 4 4-4 4" />
                <path d="M20 7H4" />
                <path d="m8 21-4-4 4-4" />
                <path d="M4 17h16" />
              </svg>
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">
              No Udhaar Credit Recorded Yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              Record peer credit, garage maintenance tabs, or tea stall khata for {customer.name}.
            </p>
            <button
              type="button"
              onClick={onAddUdhaar}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700"
            >
              Record First Udhaar Credit
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="my-8 rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            No entries found matching filter &quot;{filter}&quot;.
          </div>
        ) : (
          /* List of Udhaar Entries */
          <div className="mt-5 space-y-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {entry.description}
                    </h3>
                    {getStatusBadge(entry.derivedStatus)}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      Given on: <strong>{entry.entryDate}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Due date: <strong>{entry.dueDate}</strong>
                    </span>
                    {entry.isSettled && entry.settledAt && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">
                          Settled on {entry.settledAt}
                        </span>
                      </>
                    )}
                    <span className="font-mono text-[10px] text-slate-400">
                      (#{entry.id})
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900">
                      {formatRupees(getUdhaarRemainingPaise(entry))}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {entry.isSettled ? (
                        <span className="text-emerald-700 font-medium">Fully settled</span>
                      ) : (entry.repaidAmountPaise || 0) > 0 ? (
                        <span>
                          {formatRupees(entry.repaidAmountPaise || 0)} repaid of {formatRupees(entry.originalAmountPaise)}
                        </span>
                      ) : (
                        <span>Original: {formatRupees(entry.originalAmountPaise)}</span>
                      )}
                    </p>
                  </div>

                  {!entry.isSettled && (
                    <button
                      type="button"
                      onClick={() => setSelectedEntryForRepayment(entry)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
                      title="Record a partial or full cash repayment"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Record Repayment
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Repayment Modal */}
      {selectedEntryForRepayment && (
        <RepaymentModal
          isOpen={Boolean(selectedEntryForRepayment)}
          entry={selectedEntryForRepayment}
          customerName={customer.name}
          onClose={() => setSelectedEntryForRepayment(null)}
          onSave={onRecordRepayment}
        />
      )}
    </div>
  )
}
