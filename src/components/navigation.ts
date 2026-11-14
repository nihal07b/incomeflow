export type NavTabId = 'overview' | 'shifts' | 'income-expenses' | 'bills-vaults' | 'udhaar'

export interface NavTabItem {
  id: NavTabId
  label: string
  shortLabel: string
  ownerBadge?: string
}

export const NAV_TABS: NavTabItem[] = [
  {
    id: 'overview',
    label: 'Overview / Plan',
    shortLabel: 'Overview',
  },
  {
    id: 'shifts',
    label: 'Shifts & Work Sessions',
    shortLabel: 'Shifts',
    ownerBadge: 'Member 1',
  },
  {
    id: 'income-expenses',
    label: 'Income & Expenses',
    shortLabel: 'Expenses',
    ownerBadge: 'Member 1',
  },
  {
    id: 'bills-vaults',
    label: 'Bills & Vaults',
    shortLabel: 'Bills',
    ownerBadge: 'Member 3',
  },
  {
    id: 'udhaar',
    label: 'Udhaar',
    shortLabel: 'Udhaar',
    ownerBadge: 'Member 2',
  },
]
