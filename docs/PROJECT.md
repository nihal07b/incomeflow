# IncomeFlow: initial build contract

Target: delivery riders planning one upcoming bill. This scaffold is not the completed MVP.

## Included
- React + Vite + TypeScript + Tailwind.
- Synthetic scenario screen with repair/extra-shift toggles and reset.
- Shared draft types and validated bill-gap arithmetic with tests.
- GitHub CI, PR template and team ownership rules.

## Next tasks
1. A: onboarding, shift-entry form, dashboard and comparison screens.
2. B: daily cash-flow projection, historical baseline, availability constraints and insufficient-data handling.
3. C: storage interface, local persistence first, optional Supabase/auth/user isolation after.
4. D: acceptance scenarios, phone walkthroughs, user discovery and pitch.

## Units and dates
Money is integer paise (₹1 = 100 paise). Dates use local YYYY-MM-DD; use calendar-day logic, not UTC truncation. currentCash is a user-entered balance as of cashAsOfDate and includes already-reserved bill money. Historical shift logs inform the baseline; they are not new money automatically added to that balance. Before enabling real editing, agree on a clear ledger cutoff and reconciliation policy.

## First integration gate
Onboarding -> saved plan -> logged shift -> recalculated dashboard. No history means no historical prediction. Estimated earnings and actual balances must have distinct labels.

## Not implemented yet
Auth, persistence, integrations, day-by-day planning, prediction ranges, Hindi translation, onboarding and shift CRUD. The starter has only a labelled fictional demo.

## Build gates
- Hour 1: deployed shell and agreed contracts.
- Hour 4: connected user journey.
- Hour 7: scope freeze.
- Hour 8: feature freeze.
- Hour 10: tested build, recording and submission.
