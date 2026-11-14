/**
 * Mock data service for Goals, Allocations, Bills & Savings Vaults.
 *
 * NOTE FOR TEAM / MEMBER C:
 * This file serves as the initial front-end mock implementation of the agreed
 * data interface until the real backend/persistence layer (e.g. Supabase, SQLite,
 * or localStorage) is connected.
 *
 * REMAINING INTEGRATION WORK:
 * 1. Replace in-memory arrays with persistent database queries.
 * 2. Connect user profile authentication to replace hardcoded profileId.
 * 3. Add synchronization and conflict resolution when offline.
 */

import type {
  Bill,
  BillGoal,
  GoalAllocation,
  SavingsVault,
  AddContributionInput,
  WithdrawalInput,
  CreateVaultInput,
  BaselineOutput,
  MoneyPaise,
} from '../types'
import {
  validateBillGoalInput,
  validateContributionInput,
  validateWithdrawalInput,
  validateCreateVaultInput,
  calculateGoalBalance,
  type CreateBillGoalInput,
} from '../engine/goals'

function delay<T>(result: T, ms = 150): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(result), ms))
}

// In-memory mock store
const mockBillGoals: BillGoal[] = [
  {
    id: 'goal-bike-emi',
    profileId: 'profile-1',
    name: 'Bike Loan EMI',
    targetPaise: 600000, // ₹6,000
    dueDate: '2026-12-14',
    isPaid: false,
    createdAt: '2026-11-14',
  },
  {
    id: 'goal-mobile-recharge',
    profileId: 'profile-1',
    name: 'Mobile Postpaid Bill',
    targetPaise: 50000, // ₹500
    dueDate: '2026-11-14', // Due today!
    isPaid: false,
    createdAt: '2026-11-01',
  },
  {
    id: 'goal-room-rent',
    profileId: 'profile-1',
    name: 'Room Rent (Funded)',
    targetPaise: 300000, // ₹3,000
    dueDate: '2026-11-20',
    isPaid: false,
    createdAt: '2026-11-01',
  },
]

// Opening, manual and withdrawal allocation records
const mockAllocations: GoalAllocation[] = [
  {
    id: 'alloc-1',
    goalId: 'goal-bike-emi',
    profileId: 'profile-1',
    amountPaise: 150000, // ₹1,500 opening contribution
    date: '2026-11-14',
    type: 'opening',
  },
  {
    id: 'alloc-2',
    goalId: 'goal-room-rent',
    profileId: 'profile-1',
    amountPaise: 300000, // ₹3,000 fully funded
    date: '2026-11-10',
    type: 'opening',
  },
  {
    id: 'alloc-vault-1',
    goalId: 'vault-1',
    profileId: 'profile-1',
    amountPaise: 850000,
    date: '2026-11-01',
    type: 'opening',
    note: 'Initial emergency buffer',
  },
  {
    id: 'alloc-vault-2',
    goalId: 'vault-2',
    profileId: 'profile-1',
    amountPaise: 150000,
    date: '2026-11-01',
    type: 'opening',
    note: 'Diwali preparation',
  },
  {
    id: 'alloc-vault-3',
    goalId: 'vault-3',
    profileId: 'profile-1',
    amountPaise: 350000,
    date: '2026-11-05',
    type: 'opening',
    note: 'Brake pad replacement fund',
  },
  {
    id: 'alloc-vault-4',
    goalId: 'vault-4',
    profileId: 'profile-1',
    amountPaise: 1000000,
    date: '2026-11-10',
    type: 'opening',
    note: 'Named long-term savings reserve',
  },
]

const mockVaults: SavingsVault[] = [
  {
    id: 'vault-1',
    profileId: 'profile-1',
    label: 'Emergency Fund',
    category: 'emergency',
    targetPaise: 2000000, // ₹20,000
    currentPaise: 850000, // ₹8,500
    createdAt: '2026-11-01',
  },
  {
    id: 'vault-2',
    profileId: 'profile-1',
    label: 'Festival & Family',
    category: 'festival',
    targetPaise: 500000, // ₹5,000
    currentPaise: 150000, // ₹1,500
    createdAt: '2026-11-01',
  },
  {
    id: 'vault-3',
    profileId: 'profile-1',
    label: 'Vehicle Maintenance',
    category: 'vehicle_maintenance',
    targetPaise: 1000000, // ₹10,000
    currentPaise: 350000, // ₹3,500
    createdAt: '2026-11-05',
  },
  {
    id: 'vault-4',
    profileId: 'profile-1',
    label: 'Future Investment Fund',
    category: 'future_investment',
    targetPaise: 5000000, // ₹50,000
    currentPaise: 1000000, // ₹10,000
    createdAt: '2026-11-10',
  },
]

/** Fetch all bill goals for a user */
export async function fetchBillGoals(profileId: string): Promise<BillGoal[]> {
  const filtered = mockBillGoals.filter(g => g.profileId === profileId)
  return delay([...filtered])
}

/** Fetch all allocations for a user's goals */
export async function fetchGoalAllocations(profileId: string): Promise<GoalAllocation[]> {
  const filtered = mockAllocations.filter(a => a.profileId === profileId)
  return delay([...filtered])
}

/**
 * Create a new bill goal.
 * An opening contribution is stored strictly as a single allocation record,
 * ensuring no double counting.
 */
export async function createBillGoal(
  profileId: string,
  input: CreateBillGoalInput,
  currentDate = '2026-11-14'
): Promise<{ goal: BillGoal; allocation?: GoalAllocation }> {
  const validation = validateBillGoalInput(input)
  if (!validation.isValid) {
    const message = Object.values(validation.errors).join(' ')
    throw new Error(message || 'Invalid bill input.')
  }

  const newGoal: BillGoal = {
    id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    profileId,
    name: input.name.trim(),
    targetPaise: input.targetPaise,
    dueDate: input.dueDate,
    isPaid: false,
    createdAt: currentDate,
  }

  mockBillGoals.push(newGoal)

  let createdAllocation: GoalAllocation | undefined
  if (input.openingContributionPaise && input.openingContributionPaise > 0) {
    createdAllocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      goalId: newGoal.id,
      profileId,
      amountPaise: input.openingContributionPaise,
      date: currentDate,
      type: 'opening',
    }
    mockAllocations.push(createdAllocation)
  }

  return delay({ goal: newGoal, allocation: createdAllocation })
}

/**
 * Add a manual contribution to an existing bill or vault.
 *
 * Idempotency & Retries:
 * Coordinates with Member 1's backend / API contract.
 * If an idempotencyKey is supplied and has already been processed,
 * the existing allocation is returned without creating a duplicate.
 */
export async function addContribution(
  profileId: string,
  input: AddContributionInput,
  currentDate = '2026-11-14'
): Promise<GoalAllocation> {
  const validation = validateContributionInput(input.amountPaise, input.note)
  if (!validation.isValid) {
    const message = Object.values(validation.errors).join(' ')
    throw new Error(message || 'Invalid contribution input.')
  }

  // Idempotency check: if an allocation with this key already exists, return it
  if (input.idempotencyKey) {
    const existing = mockAllocations.find(a => a.idempotencyKey === input.idempotencyKey)
    if (existing) {
      return delay(existing)
    }
  }

  // Verify target existence
  if (input.targetType === 'bill') {
    const goal = mockBillGoals.find(g => g.id === input.targetId && g.profileId === profileId)
    if (!goal) {
      throw new Error(`Bill goal ${input.targetId} not found.`)
    }
  } else if (input.targetType === 'vault') {
    const vault = mockVaults.find(v => v.id === input.targetId && v.profileId === profileId)
    if (!vault) {
      throw new Error(`Savings vault ${input.targetId} not found.`)
    }
    // Update vault allocated cash balance
    vault.currentPaise += input.amountPaise
  }

  const newAllocation: GoalAllocation = {
    id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    goalId: input.targetId,
    profileId,
    amountPaise: input.amountPaise,
    date: currentDate,
    type: input.type || 'manual',
    note: input.note?.trim() || undefined,
    idempotencyKey: input.idempotencyKey,
  }

  mockAllocations.push(newAllocation)
  return delay(newAllocation)
}

/**
 * Baseline Output from Member 4's agreed contract.
 * Standard roadmap scenario:
 * Historical baseline = ₹800 (80000 paise).
 */
export async function fetchHistoricalBaseline(_profileId: string): Promise<BaselineOutput> {
  return delay({
    available: true,
    baselineDailyIncomePaise: 80000, // ₹800
    shiftsAnalyzed: 14,
  })
}

/**
 * Today's shift earnings.
 * Standard roadmap scenario:
 * Today's earnings = ₹1,500 (150000 paise).
 */
export async function fetchTodayEarnings(_profileId: string): Promise<MoneyPaise> {
  return delay(150000) // ₹1,500
}

/**
 * Create a new savings vault.
 * Reuses the single-allocation accounting logic.
 */
export async function createVault(
  profileId: string,
  input: CreateVaultInput,
  currentDate = '2026-11-14'
): Promise<{ vault: SavingsVault; allocation?: GoalAllocation }> {
  const validation = validateCreateVaultInput(input)
  if (!validation.isValid) {
    const message = Object.values(validation.errors).join(' ')
    throw new Error(message || 'Invalid vault input.')
  }

  const initialAmount = input.openingContributionPaise || 0

  const newVault: SavingsVault = {
    id: `vault-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    profileId,
    label: input.label.trim(),
    category: input.category,
    targetPaise: input.targetPaise,
    currentPaise: initialAmount,
    createdAt: currentDate,
  }

  mockVaults.push(newVault)

  let createdAllocation: GoalAllocation | undefined
  if (initialAmount > 0) {
    createdAllocation = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      goalId: newVault.id,
      profileId,
      amountPaise: initialAmount,
      date: currentDate,
      type: 'opening',
      note: 'Opening vault allocation',
    }
    mockAllocations.push(createdAllocation)
  }

  return delay({ vault: newVault, allocation: createdAllocation })
}

/**
 * Add a withdrawal from an existing goal or vault.
 *
 * Rules:
 * - Amount must be positive.
 * - Amount cannot exceed current allocated balance.
 * - Preserves a withdrawal history record.
 * - Updates balance and progress consistently.
 * - Coordinates idempotency key deduplication with Member 1.
 */
export async function withdrawFromGoal(
  profileId: string,
  input: WithdrawalInput,
  currentDate = '2026-11-14'
): Promise<GoalAllocation> {
  // Idempotency check: if an allocation with this key already exists, return it
  if (input.idempotencyKey) {
    const existing = mockAllocations.find(a => a.idempotencyKey === input.idempotencyKey)
    if (existing) {
      return delay(existing)
    }
  }

  // Calculate current allocated balance using shared accounting engine
  const { allocatedPaise: currentBalance } = calculateGoalBalance(mockAllocations, input.targetId)

  // Validate withdrawal input
  const validation = validateWithdrawalInput(input.amountPaise, currentBalance, input.note)
  if (!validation.isValid) {
    const message = Object.values(validation.errors).join(' ')
    throw new Error(message || 'Invalid withdrawal input.')
  }

  // Target existence check
  if (input.targetType === 'vault') {
    const vault = mockVaults.find(v => v.id === input.targetId && v.profileId === profileId)
    if (!vault) {
      throw new Error(`Savings vault ${input.targetId} not found.`)
    }
    vault.currentPaise = Math.max(0, vault.currentPaise - input.amountPaise)
  } else if (input.targetType === 'bill') {
    const bill = mockBillGoals.find(b => b.id === input.targetId && b.profileId === profileId)
    if (!bill) {
      throw new Error(`Bill goal ${input.targetId} not found.`)
    }
  }

  const withdrawalAllocation: GoalAllocation = {
    id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    goalId: input.targetId,
    profileId,
    amountPaise: input.amountPaise,
    date: currentDate,
    type: 'withdrawal',
    note: input.note?.trim() || undefined,
    idempotencyKey: input.idempotencyKey,
  }

  mockAllocations.push(withdrawalAllocation)
  return delay(withdrawalAllocation)
}

/** Legacy / backwards-compatible helpers */
export async function fetchBills(profileId: string): Promise<Bill[]> {
  const goals = await fetchBillGoals(profileId)
  return goals.map(g => ({
    id: g.id,
    profileId: g.profileId,
    label: g.name,
    amountPaise: g.targetPaise,
    dueDate: g.dueDate,
  }))
}

export async function fetchVaults(profileId: string): Promise<SavingsVault[]> {
  const filtered = mockVaults.filter(v => v.profileId === profileId)
  return delay([...filtered])
}
