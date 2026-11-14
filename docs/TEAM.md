# Team workflow

One owner pushes the starter. Everyone else clones after that first push.

| Role | Branch | First deliverable |
| --- | --- | --- |
| A: UI | feat/ui-onboarding | Validated onboarding and shift forms |
| B: engine | feat/planning-engine | Daily cash flow and tests |
| C: integration | feat/data-storage | Storage interface and persistence |
| D: QA/demo | feat/demo-qa | Acceptance scenarios and demo evidence |

Start: git switch main, git pull --ff-only, then git switch -c YOUR_BRANCH.
Commit small changes, push the branch, and open a PR into main. C coordinates merges; one teammate reviews.
After a merge: git fetch origin, then git merge origin/main on your feature branch. Resolve conflicts you understand, rerun checks. Never force-push to main.
Only C edits package.json/package-lock.json and shared configuration unless agreed otherwise.
Coordinate shared-type changes before parallel implementation.

## Full MVP acceptance checklist
- No history: assumptions labelled, no fabricated prediction.
- Missing shift not silently zero.
- Negative net earnings preserved.
- Edit/delete updates without double counting.
- Repair changes balance exactly once.
- Unavailable day never recommended.
- Today/overdue bill handled explicitly.
- Infeasible goal displays a gap.
- Refresh retains records after persistence is implemented.
- Demo reset changes only demo data.
- Cloud users isolated once implemented.
- Phone width works without horizontal overflow.
