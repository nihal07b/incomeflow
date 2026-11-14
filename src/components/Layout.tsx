import type { ReactNode } from 'react'
import type { NavTabId } from './navigation'
import { Navbar } from './Navbar'
import { BottomNav } from './BottomNav'

interface LayoutProps {
  activeTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
  children: ReactNode
}

export function Layout({ activeTab, onSelectTab, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div>
        <Navbar activeTab={activeTab} onSelectTab={onSelectTab} />
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 pb-24 md:pb-12">
          {children}
        </main>
      </div>

      <footer className="hidden border-t border-slate-200 bg-white py-6 md:block">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:px-6">
          <p>
            IncomeFlow · Vihaan Hackathon · All money values in integer paise
          </p>
          <p>
            Phase 1 Layout Foundation · Delivery Rider Next-Bill Planner
          </p>
        </div>
      </footer>

      <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} />
    </div>
  )
}
