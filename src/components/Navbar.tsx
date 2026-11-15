import type { NavTabId } from './navigation'
import { NAV_TABS } from './navigation'
import { OverviewIcon, ShiftsIcon, IncomeExpensesIcon, BillsVaultsIcon, UdhaarIcon } from './Icons'

interface NavbarProps {
  activeTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
}

function getTabIcon(tabId: NavTabId) {
  const iconProps = { className: 'size-4 shrink-0' }
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

export function Navbar({ activeTab, onSelectTab }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectTab('overview')}
            className="flex items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-teal-700 font-bold text-white shadow-sm">
              ₹
            </span>
            <span className="text-xl font-bold tracking-tight text-teal-900">
              IncomeFlow
            </span>
          </button>
          <span className="hidden rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-inset ring-teal-600/20 sm:inline-block">
            Delivery Rider Planner
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {getTabIcon(tab.id)}
                <span>{tab.label}</span>
                {tab.ownerBadge && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                      isActive ? 'bg-teal-800 text-teal-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.ownerBadge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Mobile Status Tag */}
        <div className="flex items-center md:hidden">
          <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-medium text-teal-900">
            Vihaan Starter
          </span>
        </div>
      </div>
    </header>
  )
}
