import type {
    DailySeriesItem,
    FinancialSummary,
    FinancialSummaryInput,
    LocalDate,
    MoneyPaise,
    Transaction,
} from '../types'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validates that a string adheres strictly to the local YYYY-MM-DD calendar date format.
 */
export function validateDate(date: string, fieldName = 'date'): void {
    if (!DATE_REGEX.test(date)) {
        throw new Error(`${fieldName} must be formatted as YYYY-MM-DD, received: ${date}`)
    }
}

/**
 * Returns an inclusive continuous array of calendar days (YYYY-MM-DD) between startDate and endDate.
 * Uses UTC calendar date increments to prevent timezone shifts and daylight saving anomalies.
 */
export function getCalendarDays(startDate: LocalDate, endDate: LocalDate): LocalDate[] {
    validateDate(startDate, 'startDate')
    validateDate(endDate, 'endDate')
    if (startDate > endDate) {
        throw new Error(`startDate (${startDate}) cannot be after endDate (${endDate})`)
    }

    const dates: LocalDate[] = []
    const [sy, sm, sd] = startDate.split('-').map(Number)
    const [ey, em, ed] = endDate.split('-').map(Number)
    const cur = new Date(Date.UTC(sy, sm - 1, sd))
    const end = new Date(Date.UTC(ey, em - 1, ed))

    while (cur <= end) {
        const y = cur.getUTCFullYear()
        const m = String(cur.getUTCMonth() + 1).padStart(2, '0')
        const d = String(cur.getUTCDate()).padStart(2, '0')
        dates.push(`${y}-${m}-${d}`)
        cur.setUTCDate(cur.getUTCDate() + 1)
    }

    return dates
}

export type FinancialSummaryOptions = {
    startDate?: LocalDate
    endDate?: LocalDate
}

/**
 * Compares two transactions sharing the same ID to determine if they are exact duplicates.
 */
function areTransactionsIdentical(a: Transaction, b: Transaction): boolean {
    return (
        a.id === b.id &&
        a.date === b.date &&
        a.amountPaise === b.amountPaise &&
        a.type === b.type &&
        (a.category ?? '').trim() === (b.category ?? '').trim() &&
        (a.description ?? '') === (b.description ?? '') &&
        (a.profileId ?? '') === (b.profileId ?? '') &&
        (a.shiftId ?? null) === (b.shiftId ?? null) &&
        (a.workSessionId ?? null) === (b.workSessionId ?? null) &&
        (a.repaymentId ?? null) === (b.repaymentId ?? null)
    )
}

function normalizeInput(
    inputOrTransactions: FinancialSummaryInput | Transaction[],
    options?: FinancialSummaryOptions,
): {
    startDate?: LocalDate
    endDate?: LocalDate
    transactions: Transaction[]
} {
    if (Array.isArray(inputOrTransactions)) {
        return {
            startDate: options?.startDate,
            endDate: options?.endDate,
            transactions: inputOrTransactions,
        }
    }

    return {
        startDate: inputOrTransactions.startDate,
        endDate: inputOrTransactions.endDate,
        transactions: inputOrTransactions.transactions ?? [],
    }
}

function assertSafeInteger(value: number, name: string): void {
    if (!Number.isSafeInteger(value)) {
        throw new Error(`${name} must be integer paise, received: ${value}`)
    }
}

/**
 * Pure calculation function to compute financial summary metrics from transactions.
 * - Validates every transaction (amount, date format, non-negative, type) BEFORE period filtering.
 * - Rejects negative amountPaise.
 * - Throws when two transactions share an ID but have different content.
 * - Ignores exact duplicate transactions.
 * - Returns only periodIncomePaise, periodExpensesPaise, netRecordedCashFlowPaise, dailySeries and expenseCategoryTotals.
 */
export function calculateFinancialSummary(
    inputOrTransactions: FinancialSummaryInput | Transaction[],
    options?: FinancialSummaryOptions,
): FinancialSummary {
    const normalized = normalizeInput(inputOrTransactions, options)
    const { startDate, endDate, transactions } = normalized

    if (startDate) validateDate(startDate, 'startDate')
    if (endDate) validateDate(endDate, 'endDate')
    if (startDate && endDate && startDate > endDate) {
        throw new Error(`startDate (${startDate}) cannot be after endDate (${endDate})`)
    }

    const isInBounds = (date: LocalDate): boolean => {
        if (startDate && date < startDate) return false
        if (endDate && date > endDate) return false
        return true
    }

    const seenTransactionsById = new Map<string, Transaction>()
    const dailyIncome = new Map<LocalDate, MoneyPaise>()
    const dailyExpenses = new Map<LocalDate, MoneyPaise>()
    const expenseCategoryTotals: Record<string, MoneyPaise> = {}
    const allActiveDates = new Set<LocalDate>()

    // Validate every transaction before period filtering
    for (const tx of transactions) {
        validateDate(tx.date, `Transaction ${tx.id} date`)
        assertSafeInteger(tx.amountPaise, `Transaction ${tx.id} amountPaise`)
        if (tx.amountPaise < 0) {
            throw new Error(`Transaction ${tx.id} amountPaise cannot be negative, received: ${tx.amountPaise}`)
        }
        if (tx.type !== 'income' && tx.type !== 'expense') {
            throw new Error(`Unsupported transaction type: ${(tx as { type: string }).type}`)
        }

        // Check duplicate ID content
        if (seenTransactionsById.has(tx.id)) {
            const existing = seenTransactionsById.get(tx.id)!
            if (!areTransactionsIdentical(existing, tx)) {
                throw new Error(
                    `Transaction ${tx.id} shares an ID with an existing transaction but has different content`,
                )
            }
            // Exact duplicate: ignore
            continue
        }
        seenTransactionsById.set(tx.id, tx)

        // Filter by period bounds
        if (!isInBounds(tx.date)) continue

        allActiveDates.add(tx.date)

        if (tx.type === 'income') {
            dailyIncome.set(tx.date, (dailyIncome.get(tx.date) ?? 0) + tx.amountPaise)
        } else {
            dailyExpenses.set(tx.date, (dailyExpenses.get(tx.date) ?? 0) + tx.amountPaise)
            const normalizedCategory = tx.category.trim() || 'uncategorized'
            expenseCategoryTotals[normalizedCategory] =
                (expenseCategoryTotals[normalizedCategory] ?? 0) + tx.amountPaise
        }
    }

    // Build continuous daily series
    let rangeDays: LocalDate[] = []
    if (startDate && endDate) {
        rangeDays = getCalendarDays(startDate, endDate)
    } else if (allActiveDates.size > 0) {
        const sorted = Array.from(allActiveDates).sort()
        rangeDays = getCalendarDays(sorted[0], sorted[sorted.length - 1])
    }

    let periodIncomePaise = 0
    let periodExpensesPaise = 0

    const dailySeries: DailySeriesItem[] = rangeDays.map((date) => {
        const inc = dailyIncome.get(date) ?? 0
        const exp = dailyExpenses.get(date) ?? 0
        periodIncomePaise += inc
        periodExpensesPaise += exp
        const netPaise = inc - exp
        assertSafeInteger(netPaise, `Daily netPaise for ${date}`)
        return {
            date,
            incomePaise: inc,
            expensesPaise: exp,
            netPaise,
        }
    })

    // If no continuous range was built and there were no transactions, totals remain 0
    if (rangeDays.length === 0) {
        for (const inc of dailyIncome.values()) periodIncomePaise += inc
        for (const exp of dailyExpenses.values()) periodExpensesPaise += exp
    }

    const netRecordedCashFlowPaise = periodIncomePaise - periodExpensesPaise
    assertSafeInteger(netRecordedCashFlowPaise, 'netRecordedCashFlowPaise')

    return {
        periodIncomePaise,
        periodExpensesPaise,
        netRecordedCashFlowPaise,
        dailySeries,
        expenseCategoryTotals,
    }
}

/**
 * Pure calculation function for total period income.
 */
export function calculatePeriodIncome(
    inputOrTransactions: FinancialSummaryInput | Transaction[],
    options?: FinancialSummaryOptions,
): MoneyPaise {
    return calculateFinancialSummary(inputOrTransactions, options).periodIncomePaise
}

/**
 * Pure calculation function for total period expenses.
 */
export function calculatePeriodExpenses(
    inputOrTransactions: FinancialSummaryInput | Transaction[],
    options?: FinancialSummaryOptions,
): MoneyPaise {
    return calculateFinancialSummary(inputOrTransactions, options).periodExpensesPaise
}

/**
 * Pure calculation function for net recorded cash flow (Income - Expenses).
 */
export function calculateNetRecordedCashFlow(
    inputOrTransactions: FinancialSummaryInput | Transaction[],
    options?: FinancialSummaryOptions,
): MoneyPaise {
    return calculateFinancialSummary(inputOrTransactions, options).netRecordedCashFlowPaise
}

/**
 * Pure calculation function for expense totals grouped by category.
 */
export function calculateExpenseCategoryTotals(
    inputOrTransactions: FinancialSummaryInput | Transaction[],
    options?: FinancialSummaryOptions,
): Record<string, MoneyPaise> {
    return calculateFinancialSummary(inputOrTransactions, options).expenseCategoryTotals
}

/**
 * Pure calculation function for continuous daily series.
 */
export function calculateDailySeries(
    inputOrTransactions: FinancialSummaryInput | Transaction[],
    options?: FinancialSummaryOptions,
): DailySeriesItem[] {
    return calculateFinancialSummary(inputOrTransactions, options).dailySeries
}
