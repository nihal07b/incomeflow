import { DayStatusLogger } from '../components/DayStatusLogger'
import { useProfile } from '../hooks/useData'
import { useState, useEffect, useId } from 'react'
import type { ShiftLog, TimeSlot, LocalDate } from '../types'
import { getTodayLocalDate } from '../services/storage'
import { useShifts } from '../hooks/useData'
import {
  rupeesToPaise,
  paiseToRupees,
  formatRupees,
  formatSlotLabel,
  calculateNetPaise,
  calculateNetHourlyPaise,
  validateShiftInput,
  type ShiftFormErrors,
} from '../utils/shifts'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `shift-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function ShiftsPage() {
  const { profile } = useProfile()
  const {
    shifts,
    shiftSummary: summary,
    loading,
    error: storageError,
    addShift,
    updateShift,
    deleteShift,
    refreshShifts,
  } = useShifts()

  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form State
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [date, setDate] = useState<LocalDate>(getTodayLocalDate())
  const [slot, setSlot] = useState<TimeSlot>('evening')
  const [hours, setHours] = useState<string>('4')
  const [grossRupees, setGrossRupees] = useState<string>('800')
  const [workCostsRupees, setWorkCostsRupees] = useState<string>('200')
  const [formErrors, setFormErrors] = useState<ShiftFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete Confirmation State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Unique accessible form field IDs
  const dateFieldId = useId()
  const slotFieldId = useId()
  const hoursFieldId = useId()
  const grossFieldId = useId()
  const costsFieldId = useId()

  // Clear success notification after 4 seconds
  useEffect(() => {
    if (!successMessage) return
    const timer = setTimeout(() => setSuccessMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [successMessage])

  // Reset form to default state
  const resetForm = () => {
    setEditingShiftId(null)
    setDate(getTodayLocalDate())
    setSlot('evening')
    setHours('4')
    setGrossRupees('800')
    setWorkCostsRupees('200')
    setFormErrors({})
  }

  // Pre-fill form for editing
  const handleStartEdit = (shift: ShiftLog) => {
    setEditingShiftId(shift.id)
    setDate(shift.date)
    setSlot(shift.slot)
    setHours(shift.hours.toString())
    setGrossRupees(paiseToRupees(shift.grossEarningsPaise).toString())
    setWorkCostsRupees(paiseToRupees(shift.workCostsPaise).toString())
    setFormErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    resetForm()
  }

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const inputData = {
      date,
      slot,
      hours,
      grossRupees,
      workCostsRupees,
    }

    const errors = validateShiftInput(inputData)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setFormErrors({})
    setIsSubmitting(true)

    try {
      const grossPaise = rupeesToPaise(Number(grossRupees))
      const costsPaise = rupeesToPaise(Number(workCostsRupees))
      const numHours = Number(hours)

      if (editingShiftId) {
        await updateShift(editingShiftId, {
          date,
          slot,
          hours: numHours,
          grossEarningsPaise: grossPaise,
          workCostsPaise: costsPaise,
        })
        setSuccessMessage('Shift session updated successfully!')
      } else {
        const newShift: ShiftLog = {
          id: generateId(),
          profileId: profile?.id ?? 'profile-demo-1',
          date,
          slot,
          hours: numHours,
          grossEarningsPaise: grossPaise,
          workCostsPaise: costsPaise,
        }
        await addShift(newShift)
        setSuccessMessage('Work session saved successfully!')
      }

      resetForm()
    } catch (err) {
      setFormErrors({
        general:
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while saving',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Deletion
  const handleDeleteConfirm = async (id: string) => {
    setIsDeleting(true)
    try {
      await deleteShift(id)
      setConfirmDeleteId(null)
      setSuccessMessage('Shift deleted successfully.')
      if (editingShiftId === id) {
        resetForm()
      }
    } catch (err) {
      setFormErrors({
        general: err instanceof Error ? err.message : 'Failed to delete shift',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Live calculation preview
  const previewGrossPaise = Number.isFinite(Number(grossRupees))
    ? rupeesToPaise(Math.max(0, Number(grossRupees)))
    : 0
  const previewCostsPaise = Number.isFinite(Number(workCostsRupees))
    ? rupeesToPaise(Math.max(0, Number(workCostsRupees)))
    : 0
  const previewNetPaise = calculateNetPaise(previewGrossPaise, previewCostsPaise)
  const previewHours = Number(hours) > 0 ? Number(hours) : 0
  const previewHourlyRate = calculateNetHourlyPaise(previewNetPaise, previewHours)

  return (
    <div className="space-y-8">
      <DayStatusLogger />
      {/* Page Header */}
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
          <span className="inline-flex items-center rounded-lg bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900 border border-teal-200">
            {shifts.length} {shifts.length === 1 ? 'Shift' : 'Shifts'} Logged
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
              onClick={() => refreshShifts()}
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

      {/* Summary KPI Cards */}
      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        aria-label="Shift Statistics"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Hours</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {summary.totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-500">hrs</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Across {summary.shiftCount} shifts</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Gross Earnings</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            {formatRupees(summary.totalGrossPaise)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Platform payouts</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Fuel & Work Costs</p>
          <p className="mt-2 text-2xl font-bold text-amber-700 sm:text-3xl">
            {formatRupees(summary.totalWorkCostsPaise)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Petrol & maintenance</p>
        </div>

        <div
          className={`rounded-2xl border p-5 shadow-sm ${summary.totalNetPaise < 0
            ? 'border-rose-200 bg-rose-50/50'
            : 'border-teal-200 bg-teal-50/50'
            }`}
        >
          <p className="text-xs font-medium text-slate-600">Net Take-Home</p>
          <p
            className={`mt-2 text-2xl font-bold sm:text-3xl ${summary.totalNetPaise < 0 ? 'text-rose-700' : 'text-teal-800'
              }`}
          >
            {formatRupees(summary.totalNetPaise)}
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            {summary.totalHours > 0
              ? `${formatRupees(summary.averageNetHourlyPaise)}/hr average`
              : 'True spendable cash'}
          </p>
        </div>
      </section>

      {/* Shift Form Section */}
      <section
        className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 transition-colors ${editingShiftId ? 'border-teal-400 ring-2 ring-teal-100' : 'border-slate-200'
          }`}
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {editingShiftId ? 'Edit Work Session' : 'Log a Work Session'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter shift details in rupees. Values are saved securely as integer paise.
            </p>
          </div>
          {editingShiftId && (
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Date Input */}
            <div>
              <label
                htmlFor={dateFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Work Date
              </label>
              <input
                id={dateFieldId}
                type="date"
                value={date}
                max={getTodayLocalDate()}
                onChange={(e) => setDate(e.target.value)}
                className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${formErrors.date ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
              />
              {formErrors.date && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.date}</p>
              )}
            </div>

            {/* Slot Input */}
            <div>
              <label
                htmlFor={slotFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Shift Time Slot
              </label>
              <select
                id={slotFieldId}
                value={slot}
                onChange={(e) => setSlot(e.target.value as TimeSlot)}
                className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${formErrors.slot ? 'border-rose-400' : 'border-slate-300'
                  }`}
              >
                <option value="morning">Morning (6am – 12pm)</option>
                <option value="afternoon">Afternoon (12pm – 5pm)</option>
                <option value="evening">Evening (5pm – 9pm)</option>
                <option value="night">Night (9pm – 2am)</option>
              </select>
              {formErrors.slot && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.slot}</p>
              )}
            </div>

            {/* Hours Input */}
            <div>
              <label
                htmlFor={hoursFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Hours Worked
              </label>
              <input
                id={hoursFieldId}
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="e.g. 4.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className={`mt-1.5 block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${formErrors.hours ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
              />
              {formErrors.hours && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.hours}</p>
              )}
            </div>

            {/* Gross Earnings Input */}
            <div>
              <label
                htmlFor={grossFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Gross Earnings (₹)
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 font-medium">
                  ₹
                </span>
                <input
                  id={grossFieldId}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="850"
                  value={grossRupees}
                  onChange={(e) => setGrossRupees(e.target.value)}
                  className={`block w-full rounded-xl border bg-white pl-8 pr-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${formErrors.grossRupees ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                />
              </div>
              {formErrors.grossRupees && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.grossRupees}</p>
              )}
            </div>

            {/* Work Costs Input */}
            <div>
              <label
                htmlFor={costsFieldId}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Fuel & Work Costs (₹)
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 font-medium">
                  ₹
                </span>
                <input
                  id={costsFieldId}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="200"
                  value={workCostsRupees}
                  onChange={(e) => setWorkCostsRupees(e.target.value)}
                  className={`block w-full rounded-xl border bg-white pl-8 pr-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 ${formErrors.workCostsRupees ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                />
              </div>
              {formErrors.workCostsRupees && (
                <p className="mt-1 text-xs text-rose-600">{formErrors.workCostsRupees}</p>
              )}
            </div>

            {/* Live Calculation Preview Card */}
            <div className="flex flex-col justify-end">
              <div
                className={`rounded-xl border p-3 ${previewNetPaise < 0
                  ? 'border-rose-200 bg-rose-50/60 text-rose-950'
                  : 'border-teal-200 bg-teal-50/60 text-teal-950'
                  }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Calculated Net:</span>
                  <span className="font-bold text-sm">
                    {formatRupees(previewNetPaise)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                  <span>Net Hourly Rate:</span>
                  <span className="font-semibold">
                    {previewHours > 0 ? `${formatRupees(previewHourlyRate)}/hr` : '—'}
                  </span>
                </div>
                {previewNetPaise < 0 && (
                  <p className="mt-1.5 text-[11px] leading-tight text-rose-700 font-medium">
                    ⚠️ Negative earnings: Fuel/costs exceed earnings for this shift.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : editingShiftId
                  ? 'Update Work Session'
                  : 'Save Work Session'}
            </button>
            {editingShiftId && (
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
            Confirm Deletion
          </h3>
          <p className="mt-1 text-sm text-rose-800">
            Are you sure you want to delete this work session? This action cannot be undone.
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

      {/* Shift History Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Work-Session History</h2>
            <p className="text-xs text-slate-500">
              Persisted in local storage (`incomeflow:v1:shifts`). Kept separate from transactions.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {shifts.length} {shifts.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 text-center text-sm text-slate-500">
            <div className="inline-block size-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
            <p className="mt-2">Loading shift history...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && shifts.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">No shifts logged yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Log your delivery shift above to track your gross earnings, fuel costs, and true net income.
            </p>
          </div>
        )}

        {/* Shifts List */}
        {!loading && shifts.length > 0 && (
          <div className="mt-4 divide-y divide-slate-100">
            {shifts.map((shift) => {
              const netPaise = calculateNetPaise(
                shift.grossEarningsPaise,
                shift.workCostsPaise
              )
              const hourlyRate = calculateNetHourlyPaise(netPaise, shift.hours)
              const isNegative = netPaise < 0

              return (
                <article
                  key={shift.id}
                  className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center hover:bg-slate-50/60 rounded-xl px-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-semibold text-slate-900">
                        {shift.date}
                      </strong>
                      <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800 border border-teal-100">
                        {formatSlotLabel(shift.slot)}
                      </span>
                      <span className="text-xs text-slate-500">
                        ⏱️ {shift.hours.toFixed(1)} hrs
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>Gross: <strong className="font-semibold text-slate-800">{formatRupees(shift.grossEarningsPaise)}</strong></span>
                      <span>·</span>
                      <span>Fuel/Cost: <strong className="font-semibold text-amber-700">-{formatRupees(shift.workCostsPaise)}</strong></span>
                      <span>·</span>
                      <span>
                        Net Rate: <strong className="font-semibold text-slate-800">{formatRupees(hourlyRate)}/hr</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${isNegative ? 'text-rose-700' : 'text-teal-700'
                          }`}
                      >
                        {formatRupees(netPaise)}
                      </p>
                      <p className="text-[11px] text-slate-500">Net Take-Home</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(shift)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                        title="Edit shift"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(shift.id)}
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        title="Delete shift"
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
