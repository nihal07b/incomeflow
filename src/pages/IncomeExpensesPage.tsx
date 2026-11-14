import { useState, useEffect, useCallback, useId } from 'react'
import {
  storageService,
  getTodayLocalDate,
  TRANSACTION_INCOME_CATEGORIES,
  TRANSACTION_EXPENSE_CATEGORIES,
  type TransactionRecord,
  type TransactionType,
  type TransactionCategory,
  type PaymentMode,
} from '../services/storage'
import {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  getCategoryLabel,
  calculateTransactionSummary,
  filterTransactions,
  validateTransactionInput,
  type TransactionFormErrors,
  type TransactionFilterState,
} from '../utils/transactions'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function IncomeExpensesPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form State
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [type, setType] = useState<TransactionType>('expense')
  const [amountRupees, setAmountRupees] = useState<string>('250')
  const [date, setDate] = useState<string>(getTodayLocalDate())
  const [category, setCategory] = useState<TransactionCategory>('fuel')
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash')
  const [description, setDescription] = useState<string>('')
  const [formErrors, setFormErrors] = useState<TransactionFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter State
  const [filters, setFilters] = useState<TransactionFilterState>({
    type: 'all',
    category: 'all',
    paymentMode: 'all',
    startDate: '',
    endDate: '',
  })

  // Delete Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Unique accessible form field IDs
  const amountFieldId = useId()
  const dateFieldId = useId()
  const categoryFieldId = useId()
  const modeFieldId = useId()
  const descFieldId = useId()

  // Load transactions from local storage
  const loadTransactions = useCallback(async () => {
    try {
      const data = await storageService.getTransactions()
      setStorageError(null)
      // Sort newest date first
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
      setTransactions(sorted)
    } catch (err) {
      setStorageError(
        err instanceof Error ? err.message : 'Failed to load transactions'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const data = await storageService.getTransactions()
        if (!cancelled) {
          const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))
          setTransactions(sorted)
        }
      } catch (err) {
        if (!cancelled) {
          setStorageError(
            err instanceof Error ? err.message : 'Failed to load transactions'
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  // Clear success notification after 4 seconds
  useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [successMessage])

  // Automatically update category when switching between income and expense
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    if (newType === 'income') {
      setCategory('delivery earnings')
    } else {
      setCategory('fuel')
    }
    setFormErrors({})
  }

  // Reset form
  const resetForm = () => {
    setEditingTxId(null)
    setType('expense')
    setAmountRupees('250')
    setDate(getTodayLocalDate())
    setCategory('fuel')
    setPaymentMode('cash')
    setDescription('')
    setFormErrors({})
  }

  // Pre-fill form for editing
  const handleStartEdit = (tx: TransactionRecord) => {
    setEditingTxId(tx.id)
    setType(tx.type)
    setAmountRupees(paiseToRupees(tx.amountPaise).toString())
    setDate(tx.date)
    setCategory(tx.category)
    setPaymentMode(tx.paymentMode)
    setDescription(tx.description || '')
    setFormErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    resetForm()
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const inputData = {
      type,
      amountRupees,
      date,
      category,
      paymentMode,
      description,
    }

    const errors = validateTransactionInput(inputData)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setIsSubmitting(true)

    try {
      const amountPaise = rupeesToPaise(Number(amountRupees))

      if (editingTxId) {
        await storageService.updateTransaction(editingTxId, {
          type,
          amountPaise,
          date,
          category,
          paymentMode,
          description: description.trim() || undefined,
        })
        setSuccessMessage('Transaction updated successfully!')
      } else {
        const newTx: TransactionRecord = {
          id: generateId(),
          profileId: 'rider-default',
          type,
          amountPaise,
          date,
          category,
          paymentMode,
          description: description.trim() || undefined,
        }
        await storageService.addTransaction(newTx)
        setSuccessMessage(`${type === 'income' ? 'Income' : 'Expense'} recorded successfully!`)
      }

      resetForm()
      await loadTransactions()
    } catch (err) {
      setFormErrors({
        general:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while saving transaction',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Deletion
  const handleDeleteConfirm = async (id: string) => {
    setIsDeleting(true)
    try {
      await storageService.deleteTransaction(id)
      setConfirmDeleteId(null)
      setSuccessMessage('Transaction deleted successfully.')
      if (editingTxId === id) {
        resetForm()
      }
      await loadTransactions()
    } catch (err) {
      setStorageError(
        err instanceof Error ? err.message : 'Failed to delete transaction'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter handlers
  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.paymentMode !== 'all' ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate)

  const clearFilters = () => {
    setFilters({
      type: 'all',
      category: 'all',
      paymentMode: 'all',
      startDate: '',
      endDate: '',
    })
  }

  // Summaries & Filtered Data
  const summary = calculateTransactionSummary(transactions)
  const filteredTransactions = filterTransactions(transactions, filters)

  // Live preview values
  const numPreviewAmount = Number(amountRupees) > 0 ? Number(amountRupees) : 0
  const previewPaise = rupeesToPaise(numPreviewAmount)

  return (
    <div className="space-y-8">
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
            Log your daily cash transactions, platform earnings, fuel, food, and maintenance expenses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 border border-teal-200">
            {transactions.length} {transactions.length === 1 ? 'Transaction' : 'Transactions'}
          </span>
        </div>
      </div>

      {/* Storage Error Alert */}
      {storageError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <div className="flex items-center justify-between">
            <p>
              <strong>Storage Error:</strong> {storageError}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                loadTransactions()
              }}
              className="ml-3 rounded bg-rose-200 px-2 py-1 text-xs font-semibold text-rose-900 hover:bg-rose-300"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Success Flash Notification */}
      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 transition-all"
        >
          ✓ {successMessage}
        </div>
      )}

      {/* Financial Summary KPI Cards */}
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
        aria-label="Financial Summary"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Income</p>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              {summary.incomeCount} credits
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700 sm:text-3xl">
            {formatRupees(summary.totalIncomePaise)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cash: {formatRupees(summary.cashIncomePaise)}</span>
            <span>Digital: {formatRupees(summary.digitalIncomePaise)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Total Expenses</p>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              {summary.expenseCount} debits
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-700 sm:text-3xl">
            {formatRupees(summary.totalExpensePaise)}
          </p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cash: {formatRupees(summary.cashExpensePaise)}</span>
            <span>Digital: {formatRupees(summary.digitalExpensePaise)}</span>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 shadow-sm ${
            summary.netCashFlowPaise < 0
              ? 'border-rose-200 bg-rose-50/50'
              : 'border-teal-200 bg-teal-50/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600">Net Cash Flow</p>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                summary.netCashFlowPaise < 0
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-teal-100 text-teal-800'
              }`}
            >
              {summary.netCashFlowPaise < 0 ? 'Deficit' : 'Surplus'}
            </span>
          </div>
          <p
            className={`mt-2 text-2xl font-bold sm:text-3xl ${
              summary.netCashFlowPaise < 0 ? 'text-rose-700' : 'text-teal-800'
            }`}
          >
            {formatRupees(summary.netCashFlowPaise)}
          </p>
          <p className="mt-2 text-[11px] text-slate-600">
            {summary.netCashFlowPaise < 0
              ? 'Expenses exceeded cash income'
              : 'Net cash preserved on hand'}
          </p>
        </div>
      </section>

      {/* Financial Policy & Isolation Notice */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <span>🛡️ Financial Ledger Rules & Multi-Module Isolation</span>
        </div>
        <p>
          • <strong>Work-session separation:</strong> Platform shift earnings logged in the Shifts module are tracked separately to prevent double-counting.
        </p>
        <p>
          • <strong>Udhaar borrowing:</strong> Money taken on informal credit is a loan liability, not earned income. Repayments are tracked through Member 2’s module.
        </p>
        <p>
          • <strong>Savings vaults:</strong> Ring-fenced emergency cushions are protected assets and not counted as ordinary spent expenses.
        </p>
      </div>

      {/* Transaction Entry Form */}
      <section
        className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 transition-colors ${
          editingTxId ? 'border-teal-400 ring-2 ring-teal-100' : 'border-slate-200'
        }`}
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {editingTxId ? 'Edit Transaction' : 'Record a Transaction'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep your daily ledger accurate for bills, fuel, and meal spend.
            </p>
          </div>
          {editingTxId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="self-start rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {formErrors.general && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {formErrors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Type Toggle Pills */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Transaction Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex-1 rounded-xl py-2.5 px-4 text-sm font-semibold transition-all ${
                  type === 'income'
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                + Income (Money In)
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex-1 rounded-xl py-2.5 px-4 text-sm font-semibold transition-all ${
                  type === 'expense'
                    ? 'bg-amber-700 text-white shadow-sm ring-2 ring-amber-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                - Expense (Money Out)
              </button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Amount */}
            <div>
              <label
                htmlFor={amountFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Amount (₹)
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 font-medium">
                  ₹
                </span>
                <input
                  id={amountFieldId}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="250"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  className={`block w-full rounded-xl border bg-white pl-8 pr-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${
                    formErrors.amountRupees ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
              </div>
              {formErrors.amountRupees && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.amountRupees}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label
                htmlFor={dateFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Transaction Date
              </label>
              <input
                id={dateFieldId}
                type="date"
                value={date}
                max={getTodayLocalDate()}
                onChange={(e) => setDate(e.target.value)}
                className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${
                  formErrors.date ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {formErrors.date && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.date}</p>
              )}
            </div>

            {/* Category Dropdown */}
            <div>
              <label
                htmlFor={categoryFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Category
              </label>
              <select
                id={categoryFieldId}
                value={category}
                onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${
                  formErrors.category ? 'border-rose-400' : 'border-slate-300'
                }`}
              >
                {type === 'income' ? (
                  TRANSACTION_INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))
                ) : (
                  TRANSACTION_EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))
                )}
              </select>
              {formErrors.category && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.category}</p>
              )}
            </div>

            {/* Payment Mode */}
            <div>
              <label
                htmlFor={modeFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Payment Mode
              </label>
              <select
                id={modeFieldId}
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${
                  formErrors.paymentMode ? 'border-rose-400' : 'border-slate-300'
                }`}
              >
                <option value="cash">💵 Cash in Hand</option>
                <option value="digital">📱 Digital (UPI / Card / NetBanking)</option>
              </select>
              {formErrors.paymentMode && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.paymentMode}</p>
              )}
            </div>

            {/* Optional Description */}
            <div className="sm:col-span-2">
              <label
                htmlFor={descFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Description / Note (Optional)
              </label>
              <input
                id={descFieldId}
                type="text"
                placeholder="e.g. Petrol pump IndianOil, lunch dhaba, tyre puncture..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Real-time Preview Pill */}
          <div
            className={`rounded-xl border p-3 text-xs flex flex-wrap items-center justify-between gap-2 ${
              type === 'income'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                : 'border-amber-200 bg-amber-50 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wider">Preview:</span>
              <span>
                {type === 'income' ? 'Crediting' : 'Debiting'}{' '}
                <strong>{formatRupees(previewPaise)}</strong> for{' '}
                <strong>{getCategoryLabel(category)}</strong> ({paymentMode})
              </span>
            </div>
            <span className="font-medium text-slate-600">{date}</span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline-2 disabled:opacity-50 ${
                type === 'income'
                  ? 'bg-emerald-700 hover:bg-emerald-800 focus-visible:outline-emerald-700'
                  : 'bg-amber-700 hover:bg-amber-800 focus-visible:outline-amber-700'
              }`}
            >
              {isSubmitting
                ? 'Saving...'
                : editingTxId
                ? 'Update Transaction'
                : type === 'income'
                ? 'Add Income'
                : 'Add Expense'}
            </button>
            {editingTxId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Delete Confirmation Modal / Banner */}
      {confirmDeleteId && (
        <div
          role="dialog"
          aria-modal="true"
          className="rounded-2xl border border-rose-300 bg-rose-50 p-6 shadow-md"
        >
          <h3 className="text-base font-bold text-rose-950">
            Confirm Transaction Deletion
          </h3>
          <p className="mt-1 text-sm text-rose-800">
            Are you sure you want to delete this transaction record? This action will permanently remove it from your local storage ledger.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => handleDeleteConfirm(confirmDeleteId)}
              className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transaction History & Filter Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
            <p className="text-xs text-slate-500">
              Persisted in local storage (`incomeflow:v1:transactions`). Newest records shown first.
            </p>
          </div>
          <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:self-auto">
            Showing {filteredTransactions.length} of {transactions.length} records
          </span>
        </div>

        {/* Filters Bar */}
        <div className="my-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              🔍 Filter Records
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 text-xs">
            {/* Filter: Type */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: e.target.value as 'all' | TransactionType,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800"
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
            </div>

            {/* Filter: Payment Mode */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Payment Mode
              </label>
              <select
                value={filters.paymentMode}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    paymentMode: e.target.value as 'all' | PaymentMode,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800"
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash Only</option>
                <option value="digital">Digital Only</option>
              </select>
            </div>

            {/* Filter: Category */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: e.target.value as 'all' | TransactionCategory,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-slate-800"
              >
                <option value="all">All Categories</option>
                <optgroup label="Income">
                  {TRANSACTION_INCOME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {getCategoryLabel(c)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Expenses">
                  {TRANSACTION_EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {getCategoryLabel(c)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Filter: Start Date */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800"
              />
            </div>

            {/* Filter: End Date */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center text-sm text-slate-500">
            <div className="inline-block size-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
            <p className="mt-2">Loading transactions...</p>
          </div>
        )}

        {/* Empty History State */}
        {!loading && transactions.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">No transactions recorded yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Use the form above to record cash in hand or expenses like fuel, food, and maintenance.
            </p>
          </div>
        )}

        {/* Filter Zero Results State */}
        {!loading && transactions.length > 0 && filteredTransactions.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-slate-600">
              No transactions match your current filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Transactions List */}
        {!loading && filteredTransactions.length > 0 && (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'income'

              return (
                <article
                  key={tx.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center hover:bg-slate-50/60 rounded-xl px-3 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-full ${
                        isIncome
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isIncome ? '↓' : '↑'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-semibold text-slate-900">
                          {getCategoryLabel(tx.category)}
                        </strong>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isIncome ? 'Income' : 'Expense'}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                          {tx.paymentMode === 'cash' ? '💵 Cash' : '📱 Digital'}
                        </span>
                      </div>

                      {tx.description && (
                        <p className="text-xs text-slate-600">{tx.description}</p>
                      )}

                      <p className="text-[11px] text-slate-400">{tx.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          isIncome ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatRupees(tx.amountPaise)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {isIncome ? 'Credit' : 'Debit'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(tx)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        title="Edit transaction"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(tx.id)}
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        title="Delete transaction"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
