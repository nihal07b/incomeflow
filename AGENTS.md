# IncomeFlow team instructions

Read docs/PROJECT.md and src/types.ts before implementation.

- Scope: delivery riders, one upcoming bill. No investments, banking transfers, udhaar or live platform connections.
- A owns src/components, src/pages, src/App.tsx and src/index.css.
- B owns src/engine and its tests.
- C owns src/data, src/services, configuration, deployment and coordinated shared-type edits.
- D owns src/demo, docs, acceptance checks and demo assets. Coordinate fixture edits with B.
- Money is integer paise. Current cash includes reserved money; expected net earnings excludes work costs.
- Historical shifts must not be added again to cash declared as-of today. Forecast money is not actual cash.
- Preserve negative earnings; missing days do not mean zero income.
- The starter engine does end-of-period arithmetic only. Implement daily cash checks before calling it a full planner.
- Never invent history, claim guaranteed forecasts or claim money was transferred.
- Never commit secrets or use service-role keys in browser/VITE_ configuration.
- Keep tasks small. Coordinate dependency and shared-file edits with C.
- Run npm run check before reporting completion; say what was and was not tested.
- Do not change unrelated files, force-push or reset another member's work.
