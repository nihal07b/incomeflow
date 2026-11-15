
import { useData } from '../hooks/useData'

const money = (paise: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)

const localDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const goTo = (tab: string) => {
  window.location.hash = tab
}

export function OverviewPage() {
  const { transactions, dayLogs, loading, error } = useData()

  const today = localDate(new Date())
  const month = today.slice(0, 7)

  const todayTransactions = transactions.filter(
    (tx) => tx.date === today
  )

  const todayIncome = todayTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amountPaise, 0)

  const todayExpenses = todayTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amountPaise, 0)

  const monthlyTransactions = transactions.filter(
    (tx) => tx.date.startsWith(month)
  )

  const monthlyNet = monthlyTransactions.reduce(
    (sum, tx) =>
      sum + (tx.type === 'income' ? tx.amountPaise : -tx.amountPaise),
    0
  )

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))

    const key = localDate(date)
    const daily = transactions.filter((tx) => tx.date === key)

    return {
      date: key,
      label: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      income: daily
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amountPaise, 0),
      expense: daily
        .filter((tx) => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amountPaise, 0),
    }
  })

  const maxChartValue = Math.max(
    1,
    ...lastSevenDays.flatMap((day) => [day.income, day.expense])
  )

  const weekStart = lastSevenDays[0].date

  const weeklyLogs = dayLogs.filter(
    (log) => log.date >= weekStart && log.date <= today
  )

  const completed = weeklyLogs.filter(
    (log) => log.status === 'complete'
  ).length

  const incomplete = weeklyLogs.filter(
    (log) => log.status === 'incomplete'
  ).length

  const noWork = weeklyLogs.filter(
    (log) => log.status === 'no_work'
  ).length

  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const cards = [
    {
      label: "Today's Earnings",
      value: todayIncome,
      color: 'text-emerald-700',
    },
    {
      label: "Today's Expenses",
      value: todayExpenses,
      color: 'text-rose-600',
    },
    {
      label: "Today's Net Income",
      value: todayIncome - todayExpenses,
      color: 'text-teal-700',
    },
    {
      label: "This Month's Net Income",
      value: monthlyNet,
      color: 'text-slate-900',
    },
  ]

  if (loading) {
    return <p className="p-6 text-slate-600">Loading dashboard...</p>
  }

  if (error) {
    return (
      <p className="rounded-xl bg-rose-50 p-6 text-rose-700">
        Unable to load dashboard: {error}
      </p>
    )
  }

  return (
    <main className="space-y-7">
      <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-teal-800 p-6 text-white sm:p-8">
        <p className="text-sm font-medium text-teal-200">
          IncomeFlow • Rider Dashboard
        </p>

        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          Your Financial Dashboard
        </h1>

        <p className="mt-2 text-sm text-slate-200 sm:text-base">
          Track your earnings, expenses and daily work in one place.
        </p>

        <p className="mt-4 text-sm text-teal-100">
          {new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {card.label}
            </p>
            <p className={`mt-3 text-3xl font-bold ${card.color}`}>
              {money(card.value)}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Based on your saved transactions
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Last 7 Days: Income vs Expenses
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Your actual recorded income and expenses
        </p>

        <div className="mt-5 flex items-center gap-5 text-xs">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-teal-600" />
            Income
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-rose-400" />
            Expenses
          </span>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2">
          {lastSevenDays.map((day) => (
            <div key={day.date} className="min-w-0 text-center">
              <div className="flex h-44 items-end justify-center gap-1 rounded-lg bg-slate-50 px-1 py-2">
                <div
                  title={`Income: ${money(day.income)}`}
                  className="w-1/3 rounded-t bg-teal-600"
                  style={{
                    height: `${(day.income / maxChartValue) * 100}%`,
                  }}
                />
                <div
                  title={`Expenses: ${money(day.expense)}`}
                  className="w-1/3 rounded-t bg-rose-400"
                  style={{
                    height: `${(day.expense / maxChartValue) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-600">
                {day.label}
              </p>
            </div>
          ))}
        </div>

        {lastSevenDays.every(
          (day) => day.income === 0 && day.expense === 0
        ) && (
            <p className="mt-4 text-center text-sm text-slate-500">
              No transactions recorded in the last seven days.
            </p>
          )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Work Status
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Recorded status over the last seven days
          </p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Completed', value: completed, color: 'text-emerald-700' },
              { label: 'Incomplete', value: incomplete, color: 'text-amber-700' },
              { label: 'No Work', value: noWork, color: 'text-slate-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-50 p-4 text-center">
                <p className={`text-3xl font-bold ${item.color}`}>
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo('shifts')}
            className="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Log Work
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Quick Actions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your finances quickly
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Add Income', tab: 'income-expenses' },
              { label: 'Add Expense', tab: 'income-expenses' },
              { label: 'Manage Udhaar', tab: 'udhaar' },
              { label: 'Bills & Savings', tab: 'bills-vaults' },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => goTo(action.tab)}
                className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-left text-sm font-semibold text-teal-900 hover:bg-teal-100"
              >
                {action.label} →
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            Recent Transactions
          </h2>
          <button
            type="button"
            onClick={() => goTo('income-expenses')}
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            View All
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            No transactions yet. Add your first income or expense.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold capitalize text-slate-900">
                    {tx.category}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {tx.date}
                    {tx.description ? ` • ${tx.description}` : ''}
                  </p>
                </div>

                <p
                  className={`shrink-0 font-bold ${tx.type === 'income'
                      ? 'text-emerald-700'
                      : 'text-rose-600'
                    }`}
                >
                  {tx.type === 'income' ? '+' : '-'}
                  {money(tx.amountPaise)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
