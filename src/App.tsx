import { useCallback, useEffect, useState } from 'react'

import type { NavTabId } from './components/navigation'
import { Layout } from './components/Layout'
import BillsAndGoals from './components/BillsAndGoals'
import SaathiAssistant from './components/SaathiAssistant'

import { OverviewPage } from './pages/OverviewPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { IncomeExpensesPage } from './pages/IncomeExpensesPage'
import { UdhaarPage } from './pages/UdhaarPage'

import { DataProvider } from './context/DataContext'
import { useProfile } from './hooks/useData'

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

/**
 * Reads the saved profile from the shared data provider.
 * This component must render inside DataProvider.
 */
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
        return <BillsAndGoalsPage />

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

      <SaathiAssistant />
    </DataProvider>
  )
}