import { useState, useEffect, useCallback } from 'react'
import type { NavTabId } from './components/navigation'
import { Layout } from './components/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { IncomeExpensesPage } from './pages/IncomeExpensesPage'
import { BillsVaultsPage } from './pages/BillsVaultsPage'
import { UdhaarPage } from './pages/UdhaarPage'
import { DataProvider } from './context/DataContext'
import SaathiAssistant from "./components/SaathiAssistant";

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
      <SaathiAssistant />
    </DataProvider>
  )
}
