import { useState } from 'react'
import type { Customer, UdhaarEntry } from '../../types'
import {
  calculateCustomerOutstandingPaise,
  deriveUdhaarStatus,
} from '../../services/storage'

interface CustomerListProps {
  customers: Customer[]
  udhaarEntries: UdhaarEntry[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectCustomer: (customerId: string) => void
  onAddCustomer: () => void
  onEditCustomer: (customer: Customer) => void
  onLoadMocks: () => void
  onRetry: () => void
}

const formatRupees = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)

export function CustomerList({
  customers,
  udhaarEntries,
  isLoading,
  error,
  searchQuery,
  onSearchChange,
  onSelectCustomer,
  onAddCustomer,
  onEditCustomer,
  onLoadMocks,
  onRetry,
}: CustomerListProps) {
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active')

  const activeCustomers = customers.filter((c) => !c.isArchived)
  const archivedCustomers = customers.filter((c) => c.isArchived)

  const currentList = viewTab === 'active' ? activeCustomers : archivedCustomers

  // Case-insensitive name filter
  const filteredCustomers = currentList.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search customers by name..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
            aria-label="Search customers by name"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-semibold text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {customers.length === 0 && !isLoading && (
            <button
              type="button"
              onClick={onLoadMocks}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-hidden"
              title="Loads sample labelled mock customers and credit records"
            >
              Load Sample Mocks
            </button>
          )}
          <button
            type="button"
            onClick={onAddCustomer}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Customer
          </button>
        </div>
      </div>

      {/* Active vs Archived Filter Tabs */}
      {archivedCustomers.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setViewTab('active')}
            className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${viewTab === 'active' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Active Customers ({activeCustomers.length})
          </button>
          <button
            type="button"
            onClick={() => setViewTab('archived')}
            className={`rounded-lg px-3 py-1.5 font-semibold transition-all ${viewTab === 'archived' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Archived ({archivedCustomers.length})
          </button>
        </div>
      )}

      {/* 1. LOADING STATE */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Loading customers">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-slate-200" />
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. ERROR STATE */}
      {!isLoading && error && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-900 shadow-2xs"
          role="alert"
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="mt-3 text-base font-bold text-rose-900">
            Failed to Load Customers
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-rose-700">
            {error}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 focus:outline-hidden"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onLoadMocks}
              className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus:outline-hidden"
            >
              Use Labelled Offline Mocks
            </button>
          </div>
        </div>
      )}

      {/* 3. EMPTY STATE (No Customers in Storage) */}
      {!isLoading && !error && customers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12 shadow-2xs">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No Customers Registered Yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500 sm:text-sm">
            Add regular contacts, tea vendors, co-riders, or mechanics to start keeping track of informal Udhaar and due dates.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onAddCustomer}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 focus:outline-hidden"
            >
              Add First Customer
            </button>
            <button
              type="button"
              onClick={onLoadMocks}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-hidden"
            >
              Load Sample Customers &amp; Udhaar [Labelled Mocks]
            </button>
          </div>
        </div>
      )}

      {/* 4. SEARCH EMPTY STATE (Query yielded 0 results) */}
      {!isLoading && !error && currentList.length > 0 && filteredCustomers.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xs">
          <p className="text-sm font-semibold text-slate-700">
            No customers found matching &quot;{searchQuery}&quot;
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Check the spelling or add a new customer with this name.
          </p>
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="mt-4 rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* 5. POPULATED CUSTOMER LIST */}
      {!isLoading && !error && filteredCustomers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Showing {filteredCustomers.length} of {currentList.length}{' '}
              {viewTab === 'archived' ? 'Archived Customer' : 'Active Customer'}
              {currentList.length === 1 ? '' : 's'}
            </p>
            {searchQuery && (
              <span className="text-xs text-indigo-600">
                Filtered by: &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {filteredCustomers.map((customer) => {
              const custEntries = udhaarEntries.filter((e) => e.customerId === customer.id)
              const outstandingPaise = calculateCustomerOutstandingPaise(custEntries, customer.id)
              const hasOverdue = custEntries.some((e) => deriveUdhaarStatus(e) === 'overdue')
              const hasDueToday = custEntries.some((e) => deriveUdhaarStatus(e) === 'due-today')

              return (
                <article
                  key={customer.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:border-indigo-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-700 text-sm">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          {/* Customer Name */}
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">
                            {customer.name}
                          </h3>

                          {/* Customer Unique ID Display */}
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className="inline-flex items-center rounded-xs bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 border border-slate-200"
                              title="Unique Customer ID ensures distinction even with identical names"
                            >
                              ID: #{customer.id}
                            </span>
                            {customer.isArchived && (
                              <span className="rounded-xs bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditCustomer(customer)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-hidden"
                        title="Edit customer info"
                        aria-label={`Edit ${customer.name}`}
                      >
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                    </div>

                    {/* Contact & Note Details */}
                    <div className="mt-3.5 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <svg className="size-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span className="font-medium text-slate-700">{customer.contact}</span>
                      </div>

                      {customer.note && (
                        <p className="line-clamp-2 text-slate-500 italic">
                          &quot;{customer.note}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Outstanding Credit Summary Badge */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      {outstandingPaise > 0 ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                            hasOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : hasDueToday
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {(hasOverdue || hasDueToday) && (
                            <span className={`size-1.5 rounded-full ${hasOverdue ? 'bg-rose-600' : 'bg-amber-600'}`} />
                          )}
                          {formatRupees(outstandingPaise)} Outstanding
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          ₹0 Credit
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">
                        ({custEntries.length} {custEntries.length === 1 ? 'entry' : 'entries'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectCustomer(customer.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-hidden"
                    >
                      View Details
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
