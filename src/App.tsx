
import { useState, useEffect, useCallback } from 'react'
import type { NavTabId } from './components/navigation'
import { Layout } from './components/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { FinancialAnalysisPage } from './pages/FinancialAnalysisPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { IncomeExpensesPage } from './pages/IncomeExpensesPage'
import { BillsVaultsPage } from './pages/BillsVaultsPage'
import { UdhaarPage } from './pages/UdhaarPage'
import { DataProvider } from './context/DataContext'
import SaathiAssistant from './components/SaathiAssistant'

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
        return <BillsVaultsPage />

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
