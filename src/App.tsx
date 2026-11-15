
import { useCallback, useEffect, useState } from 'react'
import type { NavTabId } from './components/navigation'
import type { DemoUser } from './types'

import { Layout } from './components/Layout'
import SaathiAssistant from './components/SaathiAssistant'

import { OverviewPage } from './pages/OverviewPage'
import { FinancialAnalysisPage } from './pages/FinancialAnalysisPage'
import { ShiftsPage } from './pages/ShiftsPage'
import { IncomeExpensesPage } from './pages/IncomeExpensesPage'
import { BillsVaultsPage } from './pages/BillsVaultsPage'
import { UdhaarPage } from './pages/UdhaarPage'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'

import { DataProvider } from './context/DataContext'

type AppPage = NavTabId | 'financial-analysis'
type AuthStep = 'login' | 'onboarding' | 'dashboard'

const USER_KEY = 'incomeflow:demo:user'
const SESSION_KEY = 'incomeflow:demo:session'

function readSavedUser(): DemoUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null

    const user: unknown = JSON.parse(raw)

    if (
      typeof user === 'object' &&
      user !== null &&
      'email' in user &&
      typeof user.email === 'string' &&
      'onboardingComplete' in user &&
      user.onboardingComplete === true
    ) {
      return user as DemoUser
    }
  } catch {
    return null
  }

  return null
}

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
  const [savedUser, setSavedUser] = useState<DemoUser | null>(
    readSavedUser
  )

  const [email, setEmail] = useState('')

  const [authStep, setAuthStep] = useState<AuthStep>(() => {
    const user = readSavedUser()
    const session = localStorage.getItem(SESSION_KEY)

    return user && session === user.email
      ? 'dashboard'
      : 'login'
  })

  const [activePage, setActivePage] = useState<AppPage>(
    getInitialPage
  )

  const handleLogin = (loginEmail: string) => {
    const normalizedEmail = loginEmail.trim().toLowerCase()
    setEmail(normalizedEmail)

    if (
      savedUser &&
      savedUser.email.toLowerCase() === normalizedEmail &&
      savedUser.onboardingComplete
    ) {
      localStorage.setItem(SESSION_KEY, savedUser.email)
      setAuthStep('dashboard')
      return
    }

    setAuthStep('onboarding')
  }

  const handleOnboardingComplete = (user: DemoUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(SESSION_KEY, user.email)

    setSavedUser(user)
    setAuthStep('dashboard')
    setActivePage('overview')
    window.location.hash = 'overview'
  }

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY)
    setAuthStep('login')
    setEmail('')
    setActivePage('overview')
    window.location.hash = 'overview'
  }

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

  if (authStep === 'login') {
    return <LoginPage onContinue={handleLogin} />
  }

  if (authStep === 'onboarding') {
    return (
      <OnboardingPage
        email={email}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  const activeNavTab: NavTabId =
    activePage === 'financial-analysis'
      ? 'overview'
      : activePage

  return (
    <DataProvider>
      <div className="relative">
        <Layout
          activeTab={activeNavTab}
          onSelectTab={handleSelectTab}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-teal-900">
                Welcome, {savedUser?.name || 'Gig Worker'}!
              </p>

              <p className="text-xs text-teal-700">
                {savedUser?.platform} · Demo Account
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100"
            >
              Logout
            </button>
          </div>

          {renderCurrentPage()}
        </Layout>

        <SaathiAssistant />
      </div>
    </DataProvider>
  )
}
