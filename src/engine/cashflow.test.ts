import { describe, it, expect } from 'vitest'
import { calculateBillGap } from './cashflow'
import { demoProjection } from '../demo/scenario'
describe('bill-gap arithmetic', () => {
  it('matches the roadmap example, repair and additional shift', () => {
    expect(calculateBillGap(demoProjection).billGapPaise).toBe(40000)
    expect(calculateBillGap({ ...demoProjection, otherExpensesPaise: 70000 }).billGapPaise).toBe(110000)
    expect(calculateBillGap({ ...demoProjection, otherExpensesPaise: 70000, expectedNetEarningsPaise: 465000 }).billGapPaise).toBe(45000)
  })
  it('keeps the full gap when there is no spendable cash', () => {
    expect(calculateBillGap({ ...demoProjection, currentCashPaise: 0, expectedNetEarningsPaise: -10000 }).billGapPaise).toBe(400000)
  })
  it('never returns a negative gap when funded', () => {
    expect(calculateBillGap({ ...demoProjection, currentCashPaise: 1000000 }).billGapPaise).toBe(0)
  })
  it('rejects non-finite, fractional and negative expense inputs', () => {
    for (const invalid of [NaN, Infinity, 1.5, -1]) expect(() => calculateBillGap({ ...demoProjection, essentialsPaise: invalid })).toThrow()
  })
})
