# IncomeFlow

A next-bill planner for delivery riders. Vihaan hackathon starter for a four-person team.

## Start on Windows
1. Install Node.js 24.x and Git, then restart your terminal.
2. Open this folder (the one containing package.json) in Antigravity.
3. Run:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL shown by Vite. Windows PowerShell users can use npm.cmd when script execution blocks npm.ps1. macOS/Linux users use npm.

No environment variables, API credits, Supabase account or bank connection are needed for this demo.

## Check

```powershell
npm.cmd run check
```

Runs lint, four engine tests and a TypeScript/production build. CI runs the same checks on GitHub. Test assertions include baseline ₹400 gap, repair ₹1,100 gap, and repair plus additional shift ₹450 gap.

## Included / not included
Working: synthetic scenario, two toggles, reset, end-of-period arithmetic, draft shared types, Tailwind, tests and CI.
Not implemented: onboarding, shift CRUD, persistence, auth, full daily planner, historical forecasts or Hindi UI. See docs/PROJECT.md and docs/TEAM.md.

## Create your GitHub remote (owner only)
Create an empty repository named incomeflow at https://github.com/new. Select private unless hackathon rules require public. Do NOT initialise with a README, .gitignore or licence: this folder already contains starter files.

Run inside this folder, replacing YOUR_USERNAME and your Git identity:

```powershell
git init -b main
git config user.name "Your Name"
git config user.email "Your verified GitHub email or GitHub noreply address"
git add .
git commit -m "chore: initialise IncomeFlow starter"
git remote add origin https://github.com/YOUR_USERNAME/incomeflow.git
git push -u origin main
```

Sign in through the Git credential browser flow if prompted; never paste access tokens into chat or source files. This archive deliberately excludes .git history so your initial commit uses your identity.

Add the other three members via repository Settings > Collaborators. They accept invitations before cloning. Do not have every member initialise a separate repo from the ZIP.

## Teammate setup

```powershell
git clone https://github.com/YOUR_USERNAME/incomeflow.git
cd incomeflow
npm.cmd ci
git switch -c feat/YOUR_TASK
npm.cmd run dev
```

Replace YOUR_USERNAME with the owner's username and YOUR_TASK with a specific task, e.g. ui-onboarding.

## PR workflow
Work on your own branch. Before pushing:

```powershell
npm.cmd run check
git add .
git commit -m "feat: describe your change"
git push -u origin HEAD
```

Open a pull request into main on GitHub. Member C integrates after one teammate reviews. Pull main before starting a new branch. Do not force-push main.

## Deployment handoff
For a Vite-compatible static host: install with npm ci, build with npm run build, publish dist. The starter uses no client routes or API calls. This archive is not itself deployed. Deploy a preview early; preserve the local demo as fallback.

## Antigravity starting task
Read AGENTS.md, docs/PROJECT.md, docs/TEAM.md and src/types.ts. Run npm run check. Summarise the scaffold and remaining work. Do not edit any files until assigned a bounded task. Respect file ownership and money units.

## Sensitive configuration
.env.example is a placeholder for later integration, not a working Supabase connection. Copy to .env.local only when implementing it. All VITE_ variables are public browser configuration. Never use a service-role/private key in frontend code.

## Source references
- https://vite.dev/guide/
- https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository
