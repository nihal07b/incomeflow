import type { NavTabId } from './navigation'
import { NAV_TABS } from './navigation'
import { OverviewIcon, ShiftsIcon, IncomeExpensesIcon, BillsVaultsIcon, UdhaarIcon } from './Icons'

interface BottomNavProps {
  activeTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
}

function getTabIcon(tabId: NavTabId) {
  const iconProps = { className: 'size-5' }
  switch (tabId) {
    case 'overview':
      return <OverviewIcon {...iconProps} />
    case 'shifts':
      return <ShiftsIcon {...iconProps} />
    case 'income-expenses':
      return <IncomeExpensesIcon {...iconProps} />
    case 'bills-vaults':
      return <BillsVaultsIcon {...iconProps} />
    case 'udhaar':
      return <UdhaarIcon {...iconProps} />
  }
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-1 shadow-lg backdrop-blur-md md:hidden"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 items-center">
        {NAV_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
                isActive
                  ? 'text-teal-700 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 font-normal'
              }`}
            >
              <div
                className={`flex size-8 items-center justify-center rounded-full transition-transform ${
                  isActive ? 'bg-teal-50 scale-105' : ''
                }`}
              >
                {getTabIcon(tab.id)}
              </div>
              <span className="mt-0.5 text-[10px] leading-tight tracking-tight">
                {tab.shortLabel}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
