/** End-of-period arithmetic only, not the future daily planner.
 * Current cash includes reserved money. Net earnings already excludes work costs.
 */
export interface ProjectionInput {
  currentCashPaise: number
  expectedNetEarningsPaise: number
  essentialsPaise: number
  otherExpensesPaise: number
  minimumCushionPaise: number
  billAmountPaise: number
}
export function calculateBillGap(input: ProjectionInput) {
  for (const [key, value] of Object.entries(input)) {
    if (!Number.isSafeInteger(value)) throw new Error(`${key} must be integer paise`)
    if (key !== 'currentCashPaise' && key !== 'expectedNetEarningsPaise' && value < 0) throw new Error(`${key} cannot be negative`)
  }
  const projectedCashPaise = input.currentCashPaise + input.expectedNetEarningsPaise - input.essentialsPaise - input.otherExpensesPaise
  if (!Number.isSafeInteger(projectedCashPaise)) throw new Error('Projection exceeds supported range')
  const availableForBillPaise = Math.max(0, projectedCashPaise - input.minimumCushionPaise)
  return { projectedCashPaise, availableForBillPaise, billGapPaise: Math.max(0, input.billAmountPaise - availableForBillPaise) }
}
