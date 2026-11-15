import { useState, useEffect, useCallback } from 'react'
import type { Customer, UdhaarEntry, MoneyPaise, LocalDate, PaymentMode } from '../types'
import {
  storageService,
  LABELLED_MOCK_CUSTOMERS,
  getLabelledMockUdhaarEntries,
  getTodayLocalDate,
  calculateCustomerOutstandingPaise,
  deriveUdhaarStatus,
} from '../services/storage'
import { CustomerList } from '../components/customers/CustomerList'
import { CustomerDetail } from '../components/customers/CustomerDetail'
import { CustomerModal } from '../components/customers/CustomerModal'
import { UdhaarModal } from '../components/customers/UdhaarModal'

const formatRupees = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)

export function UdhaarPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [udhaarEntries, setUdhaarEntries] = useState<UdhaarEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null)
  const [isUdhaarModalOpen, setIsUdhaarModalOpen] = useState(false)

  // Load both customers and udhaar records from storage
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [custList, udhList] = await Promise.all([
        storageService.getCustomers(),
        storageService.getUdhaarEntries(),
      ])
      setCustomers(custList)
      setUdhaarEntries(udhList)
    } catch (err) {
      setError((err as Error).message || 'Unable to access storage records.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    Promise.all([storageService.getCustomers(), storageService.getUdhaarEntries()])
      .then(([custList, udhList]) => {
        if (!ignore) {
          setCustomers(custList)
          setUdhaarEntries(udhList)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError((err as Error).message || 'Unable to access storage records.')
          setIsLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [])

  // Save (Add or Edit) customer
  const handleSaveCustomer = async (data: {
    id?: string
    name: string
    contact: string
    note?: string
  }) => {
    if (data.id) {
      // Edit existing customer
      const updated = await storageService.updateCustomer(data.id, {
        name: data.name,
        contact: data.contact,
        note: data.note,
      })
      setCustomers((prev) =>
        prev.map((c) => (c.id === data.id ? updated : c))
      )
    } else {
      // Add new customer with distinct ID
      const newId = `cust-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
      const newCustomer: Customer = {
        id: newId,
        profileId: 'profile-demo-1', // Default user ownership
        name: data.name,
        contact: data.contact,
        note: data.note,
        createdAt: getTodayLocalDate(),
        isArchived: false,
      }
      const saved = await storageService.addCustomer(newCustomer)
      setCustomers((prev) => [...prev, saved])
    }
  }

  // Archive customer (preserves financial records)
  const handleArchiveCustomer = async (id: string) => {
    try {
      const archived = await storageService.archiveCustomer(id)
      setCustomers((prev) => prev.map((c) => (c.id === id ? archived : c)))
    } catch (err) {
      alert(`Failed to archive customer: ${(err as Error).message}`)
    }
  }

  // Unarchive customer
  const handleUnarchiveCustomer = async (id: string) => {
    try {
      const unarchived = await storageService.unarchiveCustomer(id)
      setCustomers((prev) => prev.map((c) => (c.id === id ? unarchived : c)))
    } catch (err) {
      alert(`Failed to unarchive customer: ${(err as Error).message}`)
    }
  }

  // Delete customer (financial history remains preserved)
  const handleDeleteCustomer = async (id: string) => {
    try {
      await storageService.deleteCustomer(id)
      setCustomers((prev) => prev.filter((c) => c.id !== id))
      if (selectedCustomerId === id) {
        setSelectedCustomerId(null)
      }
    } catch (err) {
      alert(`Failed to delete customer: ${(err as Error).message}`)
    }
  }

  // Add Udhaar entry for an existing customer
  const handleAddUdhaar = async (data: {
    originalAmountPaise: MoneyPaise
    description: string
    entryDate: LocalDate
    dueDate: LocalDate
  }) => {
    if (!selectedCustomerId) return

    const newId = `udh-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
    const newEntry: UdhaarEntry = {
      id: newId,
      profileId: 'profile-demo-1', // User ownership
      customerId: selectedCustomerId,
      originalAmountPaise: data.originalAmountPaise,
      description: data.description,
      entryDate: data.entryDate,
      dueDate: data.dueDate,
      isSettled: false,
      createdAt: getTodayLocalDate(),
    }

    // Creating Udhaar does NOT create cash income
    const saved = await storageService.addUdhaarEntry(newEntry)
    setUdhaarEntries((prev) => [...prev, saved])
  }

  // Settle an existing Udhaar entry
  const handleSettleUdhaar = async (entryId: string) => {
    const settled = await storageService.settleUdhaarEntry(entryId, getTodayLocalDate())
    setUdhaarEntries((prev) =>
      prev.map((e) => (e.id === entryId ? settled : e))
    )
  }

  // Record atomic cash repayment linked to shared transaction ledger
  const handleRecordRepayment = async (data: {
    requestId: string
    udhaarId: string
    amountPaise: MoneyPaise
    date: LocalDate
    paymentMode: PaymentMode
    note?: string
  }) => {
    const result = await storageService.recordRepayment({
      requestId: data.requestId,
      profileId: 'profile-demo-1',
      udhaarId: data.udhaarId,
      amountPaise: data.amountPaise,
      date: data.date,
      paymentMode: data.paymentMode,
      note: data.note,
    })

    setUdhaarEntries((prev) =>
      prev.map((e) => (e.id === data.udhaarId ? result.updatedEntry : e))
    )
  }

  // Load sample labelled mocks (Customers + Udhaar entries with all 4 states)
  const handleLoadMocks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const mockUdhaars = getLabelledMockUdhaarEntries()
      await Promise.all([
        storageService.saveCustomers(LABELLED_MOCK_CUSTOMERS),
        storageService.saveUdhaarEntries(mockUdhaars),
      ])
      setCustomers(LABELLED_MOCK_CUSTOMERS)
      setUdhaarEntries(mockUdhaars)
    } catch (err) {
      setError((err as Error).message || 'Failed to load sample mocks.')
    } finally {
      setIsLoading(false)
    }
  }

  // Selected customer for detail view
  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId) ?? null
    : null

  // Entries for the selected customer
  const selectedCustomerEntries = selectedCustomerId
    ? udhaarEntries.filter((e) => e.customerId === selectedCustomerId)
    : []

  // Overall Statistics across all records
  const totalReceivablePaise = calculateCustomerOutstandingPaise(udhaarEntries)
  const overdueEntries = udhaarEntries.filter((e) => deriveUdhaarStatus(e) === 'overdue')
  const overdueTotalPaise = overdueEntries.reduce((sum, e) => sum + e.originalAmountPaise, 0)
  const dueTodayEntries = udhaarEntries.filter((e) => deriveUdhaarStatus(e) === 'due-today')
  const dueTodayTotalPaise = dueTodayEntries.reduce((sum, e) => sum + e.originalAmountPaise, 0)
  const settledEntries = udhaarEntries.filter((e) => e.isSettled)

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Udhaar &amp; Credit Ledger
            </h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
              Member 2 Module
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Customer management, informal credit entries, and due-date tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs">
            <span className="size-2 rounded-full bg-emerald-500" />
            {customers.filter((c) => !c.isArchived).length} Active Customers
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-4" aria-label="Udhaar Summary KPIs">
        {/* Total Outstanding Receivable */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Receivable
            </p>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              Pending
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatRupees(totalReceivablePaise)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {udhaarEntries.filter((e) => !e.isSettled).length} active credit records
          </p>
        </div>

        {/* Due Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Due Today
            </p>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
              Today
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {formatRupees(dueTodayTotalPaise)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {dueTodayEntries.length} {dueTodayEntries.length === 1 ? 'entry' : 'entries'} to follow up
          </p>
        </div>

        {/* Overdue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overdue Credit
            </p>
            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
              Delayed
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">
            {formatRupees(overdueTotalPaise)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {overdueEntries.length} {overdueEntries.length === 1 ? 'entry' : 'entries'} past due date
          </p>
        </div>

        {/* Settled */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Settled Cleared
            </p>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              Repaid
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">
            {settledEntries.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Full history preserved
          </p>
        </div>
      </section>

      {/* Screen Render: Detail View or List View */}
      {selectedCustomer ? (
        <CustomerDetail
          customer={selectedCustomer}
          entries={selectedCustomerEntries}
          onBack={() => setSelectedCustomerId(null)}
          onEdit={(cust) => {
            setCustomerToEdit(cust)
            setIsCustomerModalOpen(true)
          }}
          onDelete={handleDeleteCustomer}
          onArchive={handleArchiveCustomer}
          onUnarchive={handleUnarchiveCustomer}
          onAddUdhaar={() => setIsUdhaarModalOpen(true)}
          onSettleUdhaar={handleSettleUdhaar}
          onRecordRepayment={handleRecordRepayment}
        />
      ) : (
        <CustomerList
          customers={customers}
          udhaarEntries={udhaarEntries}
          isLoading={isLoading}
          error={error}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectCustomer={(id) => setSelectedCustomerId(id)}
          onAddCustomer={() => {
            setCustomerToEdit(null)
            setIsCustomerModalOpen(true)
          }}
          onEditCustomer={(cust) => {
            setCustomerToEdit(cust)
            setIsCustomerModalOpen(true)
          }}
          onLoadMocks={handleLoadMocks}
          onRetry={loadData}
        />
      )}

      {/* Add / Edit Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        customerToEdit={customerToEdit}
        onClose={() => {
          setIsCustomerModalOpen(false)
          setCustomerToEdit(null)
        }}
        onSave={handleSaveCustomer}
      />

      {/* Add Udhaar Entry Modal */}
      {selectedCustomer && (
        <UdhaarModal
          isOpen={isUdhaarModalOpen}
          customer={selectedCustomer}
          onClose={() => setIsUdhaarModalOpen(false)}
          onSave={handleAddUdhaar}
        />
      )}
    </div>
  )
}
