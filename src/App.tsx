<<<<<<< HEAD
import { useState } from 'react'
import { calculateBillGap } from './engine/cashflow'
import BillsAndGoals from './components/BillsAndGoals'
import { demoProjection } from './demo/scenario'
=======
import { useState, useEffect, useCallback } from 'react'
import type { NavTabId } from './components/navigation'
import { Layout } from './components/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { IncomeExpensesPage } from './pages/IncomeExpensesPage'
import { BillsVaultsPage } from './pages/BillsVaultsPage'
import { UdhaarPage } from './pages/UdhaarPage'
import { DataProvider } from './context/DataContext'
>>>>>>> ebf21e9b69980f12d5c69033384afa7032addf21

function getInitialTab(): NavTabId {
  const hash = window.location.hash.replace('#', '')
  if (
    hash === 'overview' ||
    hash === 'shifts' ||
    hash === 'income-expenses' ||
    hash === 'bills-vaults' ||
    hash === 'udhaar'
  ) {
    return hash
  }
  return 'overview'
}

export default function App() {
<<<<<<< HEAD
  // Mock profile – in real app this would come from auth service
  const mockProfile = {
    id: 'profile-1',
    displayName: 'Demo User',
    language: 'en' as const,
    currentCashPaise: 150000,
    cashAsOfDate: '2026-11-14',
    essentialDailySpendPaise: 1400,
    minimumCushionPaise: 5000,
  };

  const [repair, setRepair] = useState(false)
  const [extraShift, setExtraShift] = useState(false)
  const result = calculateBillGap({ ...demoProjection, otherExpensesPaise: repair ? 70000 : 0, expectedNetEarningsPaise: demoProjection.expectedNetEarningsPaise + (extraShift ? 65000 : 0) })
  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
      <header className="mb-10 flex items-center justify-between gap-4"><strong className="text-xl text-teal-800">IncomeFlow</strong><span className="rounded-full bg-teal-100 px-3 py-1 text-sm text-teal-900">Team starter · Synthetic data</span></header>
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">A clearer plan for your next bill</p>
      <h1 className="my-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">See what changes when life happens.</h1>
      <p className="max-w-2xl text-lg text-slate-600">An editable demo foundation for the Vihaan team. These earnings are assumptions, not predictions or money already saved.</p>
      <section className="my-8 grid gap-4 sm:grid-cols-3" aria-label="Bill summary">
        {[['Bill due in 7 days', demoProjection.billAmountPaise], ['Available cash now', demoProjection.currentCashPaise], ['Estimated bill gap', result.billGapPaise]].map(([label, value]) => <article key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-sm text-slate-600">{label}</h2><p className="mt-3 text-3xl font-semibold" aria-live="polite">{rupees(Number(value))}</p></article>)}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Compare a change</h2>
        <p className="mt-2 text-slate-600">Essentials: ₹1,400 · Minimum cushion: ₹500 · Planned net earnings: ₹4,000</p>
        <div className="my-6 space-y-4">
          <label className="flex cursor-pointer items-center gap-3"><input className="size-5 accent-teal-700" type="checkbox" checked={repair} onChange={e => setRepair(e.target.checked)} />Add a ₹700 vehicle repair</label>
          <label className="flex cursor-pointer items-center gap-3"><input className="size-5 accent-teal-700" type="checkbox" checked={extraShift} onChange={e => setExtraShift(e.target.checked)} />Assume an additional available shift earns ₹650 net</label>
        </div>
        <p className="rounded-xl bg-teal-50 p-4 text-teal-950" aria-live="polite">{result.billGapPaise > 0 ? `This scenario still leaves an estimated ${rupees(result.billGapPaise)} gap after retaining your cash cushion.` : 'This scenario appears sufficient for the bill while retaining your cash cushion.'}</p>
        <button type="button" className="mt-5 rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700" onClick={() => { setRepair(false); setExtraShift(false) }}>Reset scenario</button>
      </section>

      <section className="my-12">
        <BillsAndGoals profile={mockProfile} />
      </section>

      <footer className="mt-8 text-sm leading-6 text-slate-500">Starter only: onboarding, shift history, daily cash-flow forecasting, persistence, authentication and Hindi translation are team tasks. No account connection or bank transfer is performed.</footer>
    </main>
=======
  const [activeTab, setActiveTab] = useState<NavTabId>(getInitialTab)

  const handleSelectTab = useCallback((tab: NavTabId) => {
    setActiveTab(tab)
    window.location.hash = tab
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getInitialTab())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const renderCurrentPage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />
      case 'shifts':
        return <ShiftsPage />
      case 'income-expenses':
        return <IncomeExpensesPage />
      case 'bills-vaults':
        return <BillsVaultsPage />
      case 'udhaar':
        return <UdhaarPage />
      default:
        return <OverviewPage />
    }
  }

  return (
    <DataProvider>
      <Layout activeTab={activeTab} onSelectTab={handleSelectTab}>
        {renderCurrentPage()}
      </Layout>
    </DataProvider>
>>>>>>> ebf21e9b69980f12d5c69033384afa7032addf21
  )
}
