# CLAUDE.md — SignalPulse AI
> Version 2.0 | Stack: Next.js · Supabase · n8n · OpenAI gpt-4o-mini · SerpApi · Docker
> Single source of truth. Claude Code reads this automatically at session start.

---

## SECTION 0: BEHAVIOR RULES

### 0.1 Session Start Protocol
1. Read this entire file
2. Read the MEMORY LOG at the bottom
3. State: last completed phase, what's next, any unresolved issues
4. Ask user to confirm before proceeding

**Never assume continuity from a previous session. Always re-orient from the memory log.**

### 0.2 Memory Log Protocol (CRITICAL)
After every completed phase, append an entry to MEMORY LOG. Non-negotiable.

```
### [DATE] — [Phase Name] — Completed by: [Human | Claude Code]
**What was built:** [files created/modified]
**Key decisions:** [architectural choices, deviations, tradeoffs]
**Known issues:** [anything next session should know]
**Next step:** [exactly what to do next, and who owns it]
```

### 0.3 Coding Standards
- TypeScript everywhere. No `any` — use interfaces in `lib/types.ts`
- `@/` path aliases throughout. No `../` relative imports across directories
- Functional components only
- Every async function must have try/catch
- Never hardcode secrets — throw descriptive error at startup if env var missing
- Comment the *why* not the *what*
- Remove all debug `console.log` before marking phase complete

### 0.4 File Safety Rules
- Never delete files without explicit user confirmation
- Never modify `supabase/schema.sql` — use `supabase/migrations/YYYYMMDD_description.sql`
- Never commit secrets — verify `.gitignore` before every `git add`
- Always read a file before editing it

### 0.5 When Uncertain
Stop and ask. Phrase as: "Before I build X, I want to confirm: [specific question]."

### 0.6 Testing Before Marking Complete
- **SQL:** Run in Supabase SQL Editor. Confirm no errors. Run SELECT to verify.
- **TypeScript/API:** `npm run build` with zero errors. Test route with curl or browser.
- **UI Components:** Render with live data. Verify empty, loading, error states.

### 0.7 Ownership
All original phases complete. Claude Code owns all future frontend/API work.
Human owns any future n8n workflow changes.

---

## SECTION 1: PROJECT CONTEXT

**What:** SignalPulse AI — B2B Sales Intelligence Engine. Monitors job postings to identify "Buying Windows" — moments when hiring patterns signal a company is about to purchase new software.

**Example:** A company posts "NetSuite Implementation Manager" → tells Ramp/Brex/Stripe this company is formalizing their finance stack right now.

**Stack:** Next.js 14 (App Router) · Supabase (Postgres) · n8n (automation) · OpenAI gpt-4o-mini · SerpApi (Google Jobs) · Docker

**Live URLs:**
- Dashboard: https://signalpulse-six.vercel.app
- GitHub: https://github.com/chase-sinclair/signalpulse
- n8n (DigitalOcean): http://159.89.185.13:5678
- Supabase: https://qolusthqrhcontdvfvyx.supabase.co

---

## SECTION 2: FILE STRUCTURE

```
signalpulse/
├── CLAUDE.md
├── .env.local                    # Never commit — contains Supabase keys
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # Main leads table view
│   ├── companies/page.tsx        # Company trends + Weekly Delta
│   ├── intelligence/page.tsx     # Market Intelligence tab
│   └── api/
│       ├── signals/route.ts
│       ├── tags/route.ts
│       ├── intelligence/summary/route.ts
│       └── intelligence/velocity/route.ts
├── components/
│   ├── LeadsTable.tsx
│   ├── TrendChart.tsx
│   ├── WeeklyDeltaBadge.tsx
│   ├── IntentScoreBadge.tsx
│   ├── FilterSidebar.tsx
│   ├── KpiCard.tsx
│   └── NavLinks.tsx
├── lib/
│   ├── types.ts                  # All TypeScript interfaces — source of truth
│   ├── supabase.ts               # Browser, server, admin clients
│   └── utils.ts
├── supabase/
│   ├── schema.sql                # DO NOT EDIT — use migrations/
│   └── migrations/
├── docker/
│   ├── docker-compose.yml
│   └── setup.sh
└── n8n/
    ├── signalpulse_daily.json
    └── signalpulse_snapshots.json
```

---

## SECTION 3: ENVIRONMENT VARIABLES

```env
# .env.local (Next.js)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=[in .env.local — never commit]
```

**Key rules:**
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — server-side only, never in `NEXT_PUBLIC_` vars
- Before every `git commit` run: `git grep -i "sk-\|service_role\|eyJ"` and abort if any non-anon key found

---

## SECTION 4: DATABASE SCHEMA (LIVE — DO NOT MODIFY schema.sql)

**Tables:** `companies`, `job_signals`, `signal_tags`, `weekly_snapshots`

**Key view:** `signals_with_tags` — aggregates tags onto each signal as `tech_stack: string[]`. Always query this view, never raw tables separately.

**Critical schema deviations from original spec:**
- `posted_at` is `TEXT` (not TIMESTAMPTZ) — SerpApi returns relative strings like "4 days ago"
- `is_hot_lead` threshold is `>= 9` in n8n (not >= 8)
- `job_family` CHECK constraint: `Finance | Infrastructure | Security | Sales | Operations | Other`

**Stored procedure:** `refresh_weekly_snapshots()` — called via Supabase RPC every Sunday at 23:00 by the snapshots n8n workflow.

---

## SECTION 5: DESIGN SYSTEM

All new UI must match this exactly:

```css
--bg-base:        #0a0a0f;
--bg-surface:     #111118;
--bg-elevated:    #1a1a24;
--border:         #1e1e2e;
--accent:         #6366f1;   /* indigo — interactive elements */
--accent-hot:     #f59e0b;   /* amber — hot lead indicators */
--text-primary:   #f1f5f9;
--text-secondary: #94a3b8;
--text-muted:     #475569;
--score-high:     #10b981;   /* 8-10 */
--score-mid:      #f59e0b;   /* 5-7  */
--score-low:      #ef4444;   /* 1-4  */

font-display: 'DM Mono', monospace;   /* numbers, scores, tags */
font-body:    'Geist', sans-serif;
```

**Reusable components:** `KpiCard`, `IntentScoreBadge`, `WeeklyDeltaBadge`, `TrendChart`, `FilterSidebar`, `LeadsTable`. Always reuse before creating new components.

---

## SECTION 6: N8N WORKFLOW (LIVE ON DIGITALOCEAN)

**Daily scraper** (`SignalPulse AI`) — runs 6:00 AM daily. Current query set:

| Query | Family |
|---|---|
| NetSuite Implementation Manager | Finance |
| Head of Finance automation | Finance |
| ERP Project Manager | Finance |
| Business Systems Analyst NetSuite | Finance |
| Snowflake data engineer implementation | Infrastructure |
| Databricks data engineer | Infrastructure |
| Okta implementation engineer | Security |
| CrowdStrike deployment administrator | Security |
| Salesforce implementation administrator | Sales |
| HubSpot CRM implementation | Sales |
| Workday implementation consultant | Operations |
| Rippling HRIS implementation | Operations |

**Weekly snapshots** (`signalpulse_snapshots`) — runs Sunday 23:00. Calls `refresh_weekly_snapshots()` via Supabase RPC.

**Critical n8n expression patterns (do not change without testing):**
- `external_job_id`: `$node["Split Out1"].json["job_id"] || $node["Split Out1"].json["share_link"] || $node["Split Out1"].json["title"] + "_" + $node["Split Out1"].json["company_name"]`
- `job_family`: `$json.output[0].content[0].text.job_family.charAt(0).toUpperCase() + $json.output[0].content[0].text.job_family.slice(1)`
- `company_id` in Map Tags to Job ID: `$('Get a row').item.json.company_id`
- Score filter: `>= 7 AND > 0`

**OpenAI model:** `gpt-4o-mini`. Returns JSON with: `score`, `reason`, `tech_stack`, `job_family`.

---

## SECTION 7: FEATURE ROADMAP

| Priority | Feature | Status | Owner |
|---|---|---|---|
| 1 | Signal Categories (multi-family queries) | ✅ Complete | Human + Claude |
| 2 | Explainable Scoring (score_components JSONB) | ✅ Complete | Claude Code |
| 3 | Market Intelligence Tab | ✅ Complete | Claude Code |
| 4 | Visualization Improvements (sparklines, velocity badges) | ⬜ Pending | Claude Code |
| 5 | Slack/Email Alerts (n8n hot lead notifications) | ⬜ Pending | Human |
| 6 | Company Enrichment (Clearbit firmographics) | ⬜ Pending | Claude Code |

**Priority 2 — Explainable Scoring** requires schema migration before frontend work:
```sql
ALTER TABLE job_signals ADD COLUMN score_components JSONB;
```
Human must run this and confirm before Claude Code builds the UI.

---

## SECTION 8: BUILD ORDER STATUS

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Supabase Schema + Seed | ✅ Complete |
| Phase 2 | n8n Workflow | ✅ Complete |
| Phase 3 | Handoff | ✅ Complete |
| Phase 4a | Types + Supabase Client | ✅ Complete |
| Phase 4b | API Route | ✅ Complete |
| Phase 5a | UI Components | ✅ Complete |
| Phase 5b | Dashboard Pages | ✅ Complete |
| Phase 6a | Docker + n8n Deploy (DigitalOcean) | ✅ Complete |
| Phase 6b | Vercel Deploy + README | ✅ Complete |
| Phase 7 | Polish | ✅ Complete |
| Phase 8 | Signal Categories + Pipeline Fixes | ✅ Complete |
| Phase 9 | Market Intelligence Tab | ✅ Complete |

---

### Component Rules

**title_match (0-3)**
Check `job_title` case-insensitive:
- 3 → contains a named tool AND ("implementation" OR "migration" OR "rollout")
- 2 → contains "implementation" OR "migration" OR "rollout" without named tool
- 1 → contains a named tool without implementation signal
- 0 → neither

**stack_match (0-3)**
Count named tool mentions in `raw_description` case-insensitive:
- 3 → 3+ named tools found
- 2 → 2 named tools found
- 1 → 1 named tool found
- 0 → none found

**seniority (0-2)**
Check `job_title` case-insensitive:
- 2 → contains: vp, director, head of, chief, cfo, cto, cio, controller, president
- 1 → contains: manager, senior, sr., lead, principal
- 0 → contains: analyst, coordinator, associate, intern, junior, or no signal

**urgency (0-2)**
Count urgency terms in `raw_description` case-insensitive:
- 2 → 2+ terms found
- 1 → 1 term found
- 0 → none found OR contains: "maintain", "support existing", "ongoing support"

### Keyword Lists (define as constants in lib/scoring.ts)

```typescript
const NAMED_TOOLS = [
  'netsuite', 'workday', 'salesforce', 'hubspot', 'okta', 'crowdstrike',
  'snowflake', 'databricks', 'rippling', 'sap', 'oracle', 'sage intacct',
  'quickbooks', 'dynamics', 'servicenow', 'coupa', 'concur', 'blackline',
  'brex', 'ramp', 'stripe', 'adp', 'kronos', 'workato', 'mulesoft',
  'dbt', 'fivetran', 'looker', 'tableau', 'power bi'
]

const URGENCY_TERMS = [
  'go-live', 'go live', 'migration', 'cutover', 'starting now',
  'new implementation', 'phase 1', 'rollout', 'launch', 'replacing',
  'immediately', 'urgent', 'as soon as possible', 'asap'
]
```

### Files to Create/Modify

**New: `lib/scoring.ts`**
- Export `computeScoreComponents(signal: Pick<JobSignal, 'job_title' | 'raw_description' | 'tech_stack'>): ScoreComponents`
- Export `computeIntentScore(components: ScoreComponents): number`
- All keyword lists as exported constants at top of file
- Pure functions — no side effects, no imports from Next.js

**Update: `lib/types.ts`**
Add:
```typescript
export interface ScoreComponent {
  score: number;
  max: number;
  reason: string;
}

export interface ScoreComponents {
  title_match: ScoreComponent;
  stack_match: ScoreComponent;
  seniority:   ScoreComponent;
  urgency:     ScoreComponent;
}
```
Add to `JobSignal`:
```typescript
score_components: ScoreComponents | null;
```

**Update: `app/api/signals/route.ts`**
After fetching from Supabase, enrich each signal:
```typescript
import { computeScoreComponents, computeIntentScore } from '@/lib/scoring'

const enriched = (data ?? []).map(signal => {
  const components = computeScoreComponents(signal)
  return {
    ...signal,
    score_components: components,
    computed_score: computeIntentScore(components)
  }
})
```
Return `enriched` instead of raw `data`.

**New: `components/ScoreBreakdown.tsx`**
Props: `{ components: ScoreComponents; computedScore: number }`
- 4 rows: label | dot display | score fraction | reason text
- Dot display: filled ● vs empty ○, colored green/amber/red
- Labels: "Title Signal", "Tech Stack", "Seniority", "Urgency"
- Subtle slide-down animation 150ms
- Null-safe: renders nothing if components is null

**Update: `components/LeadsTable.tsx`**
- `IntentScoreBadge` becomes clickable — toggles `ScoreBreakdown`
- Add chevron icon (down/up) next to badge
- Only one row expanded at a time
- Pass `score_components` and `computed_score` from signal to breakdown

**Update: `components/IntentScoreBadge.tsx`**
- Accept optional `onClick` and `isExpanded` props
- Show chevron when `onClick` is provided
- Cursor pointer, subtle hover ring

### Design
- Match Section 5 color palette exactly
- Dot colors: green if score === max, amber if partial, red if 0
- Reason text: `--text-secondary`, 12px
- Panel background: `--bg-elevated`, border-top `--border`
- Mobile: full width, stacks cleanly

---

# MEMORY LOG

> Most recent entry first. Keep only last 2-3 entries — archive older ones.

---

### [2026-04-14] — Priority 2: Explainable Scoring — Completed by: 🤖 Claude Code

**What was built:**
- `lib/scoring.ts` — `computeScoreComponents()`, `computeIntentScore()`, `NAMED_TOOLS`, `URGENCY_TERMS` constants
- `lib/types.ts` — Added `ScoreComponent`, `ScoreComponents` interfaces; added `score_components?` and `computed_score?` to `JobSignal`
- `app/api/signals/route.ts` — Enriches each signal with `score_components` + `computed_score` after Supabase fetch
- `components/ScoreBreakdown.tsx` — 4-row breakdown panel with dot display, score fraction, reason text, 150ms slide-down animation
- `components/IntentScoreBadge.tsx` — Now accepts `onClick`/`isExpanded` props; renders as button with rotating ▾ chevron
- `components/LeadsTable.tsx` — `expandedId` state for single-row expansion; ScoreBreakdown renders in full-width row below signal

**Key decisions:**
- `computed_score` (deterministic, client-computed) replaces DB `intent_score` as the display source of truth in badge + sort
- Score components computed at API route level, not stored — no DB writes needed for this feature
- `score_components` and `computed_score` added as optional fields on `JobSignal` (not always present on raw DB rows)

**Known issues:**
- None

**Next step:**
- Priority 4 (Visualization Improvements — sparklines, velocity badges) — no schema changes needed

---

### [2026-04-08] — Section 16 Complete: Market Intelligence Tab — Completed by: 🤖 Claude Code

**What was built:**
- `app/api/intelligence/summary/route.ts` — KPIs + family breakdown + top 10 tags
- `app/api/intelligence/velocity/route.ts` — companies with 2+ signals in last 7 days
- `app/intelligence/page.tsx` — full Intelligence page with KPI cards, Top Tools list, TrendChart, Hiring Velocity grid
- `components/NavLinks.tsx` — added Intelligence nav link

**Key decisions:**
- Page placed at `app/intelligence/page.tsx` (not `app/(dashboard)/intelligence/`) — matches actual project file structure
- All data aggregated in JS from existing tables — no schema changes
- `VelocityCompany` interface exported from route file, imported by page

**Known issues:**
- Velocity section shows empty state until pipeline accumulates 2+ signals from same company within 7 days — expected behavior

**Next step:**
- Priority 2 (Explainable Scoring) — requires human to run schema migration first: `ALTER TABLE job_signals ADD COLUMN score_components JSONB;`
- OR Priority 4 (Visualization Improvements) — no schema changes needed

---

### [2026-04-08] — Signal Categories + Pipeline Fixes — Completed by: 👤 Human + 🤖 Claude Code

**What was built:**
- 8 new SerpApi queries across Sales, Security, Operations, Infrastructure families
- OpenAI prompt updated: multi-vertical, returns `job_family` in JSON, single value enforced
- `date_posted:today` chips filter added to SerpApi node
- `Edit Fields` node: `job_family` now dynamic + capitalized, `external_job_id` has null fallback
- `Map Tags to Job ID`: fixed dead `$('Postgres')` reference → `$('Get a row').item.json.company_id`
- `Create a row`: all field expressions updated to `$node["Edit Fields"].json.*`

**Current DB state:**
- 66 signals: Finance 42, Sales 11, Operations 10, Security 2, Other 1, Infrastructure 0
- Infrastructure not yet populating — Snowflake/Databricks queries need more days
- Some older rows missing tags (pre-fix) — self-correcting going forward

**Known issues:**
- `dbt analytics engineer` returned 0 results — replaced with `Databricks data engineer`
- Infrastructure family still empty — monitor over next few days

**Next step:**
- Let pipeline accumulate data daily
- Build Priority 2 or Priority 4 (see Feature Roadmap)

---
*End of CLAUDE.md — SignalPulse AI v2.0*
