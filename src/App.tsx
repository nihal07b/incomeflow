import { useCallback, useEffect, useState } from 'react'
import type { NavTabId } from './components/navigation'
import { Layout } from './components/Layout'
import BillsAndGoals from './components/BillsAndGoals'
import SaathiAssistant from './components/SaathiAssistant'

import { OverviewPage } from './pages/OverviewPage'
import { FinancialAnalysisPage } from './pages/FinancialAnalysisPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { IncomeExpensesPage } from './pages/IncomeExpensesPage'
import { UdhaarPage } from './pages/UdhaarPage'

import { DataProvider } from './context/DataContext'
import { useProfile } from './hooks/useData'

type AppPage = NavTabId | 'financial-analysis'

function getInitialPage(): AppPage {
  const hash = window.location.hash.replace('#', '')

  if (hash === 'financial-analysis') {
    return 'financial-analysis'
  }

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

function BillsAndGoalsPage() {
  const { profile, loading, error } = useProfile()

  if (loading) {
    return (
      <section
        role="status"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        Loading your profile…
      </section>
    )
  }

  if (error) {
    return (
      <section
        role="alert"
        className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900"
      >
        <h1 className="text-xl font-semibold">
          Could not load bills and goals
        </h1>
        <p className="mt-2">{error}</p>
      </section>
    )
  }

  if (!profile) {
    return (
      <section
        role="status"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950"
      >
        <h1 className="text-xl font-semibold">Bills &amp; Vaults</h1>
        <p className="mt-2">
          A saved profile is required before bills and goals can load.
        </p>
      </section>
    )
  }

  return <BillsAndGoals profile={profile} />
}

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>(getInitialPage)

  const handleSelectTab = useCallback((tab: NavTabId) => {
    setActivePage(tab)
    window.location.hash = tab
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      setActivePage(getInitialPage())
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage />

      case 'financial-analysis':
        return <FinancialAnalysisPage />

      case 'shifts':
        return <ShiftsPage />

      case 'income-expenses':
        return <IncomeExpensesPage />

      case 'bills-vaults':
        return <BillsAndGoalsPage />

      case 'udhaar':
        return <UdhaarPage />

      default:
        return <OverviewPage />
    }
  }

  const activeNavTab: NavTabId =
    activePage === 'financial-analysis' ? 'overview' : activePage

  return (
    <DataProvider>
      <Layout activeTab={activeNavTab} onSelectTab={handleSelectTab}>
        {renderCurrentPage()}
      </Layout>

      <SaathiAssistant />
    </DataProvider>
  )
}