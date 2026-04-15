# CLAUDE.md — SignalPulse AI
> Stack: Next.js · Supabase · n8n · OpenAI gpt-4o-mini · SerpApi · Docker
> Single source of truth. Claude Code reads this automatically at session start.

---

## SECTION 0: BEHAVIOR RULES

### Coding Standards
- TypeScript everywhere. No `any` — use interfaces in `lib/types.ts`
- `@/` path aliases throughout. No `../` relative imports across directories
- Functional components only. Every async function must have try/catch
- Never hardcode secrets — throw descriptive error at startup if env var missing
- Comment the *why* not the *what*. Remove all debug `console.log` before marking complete

### File Safety
- Never delete files without explicit user confirmation
- Never modify `supabase/schema.sql` — use `supabase/migrations/YYYYMMDD_description.sql`
- Never commit secrets — run `git grep -i "sk-\|service_role\|eyJ"` before every commit
- Always read a file before editing it

### Ownership
- Claude Code owns all frontend/API work
- Human owns all n8n workflow changes

### Memory Log Protocol
After every completed phase, prepend an entry to MEMORY LOG (bottom of this file). Keep last 2–3 entries only.

---

## SECTION 1: PROJECT CONTEXT

**What:** SignalPulse AI — B2B Sales Intelligence Engine. Monitors job postings to identify "Buying Windows" — moments when hiring patterns signal a company is about to purchase new software.

**Example:** A company posts "NetSuite Implementation Manager" → tells Ramp/Brex/Stripe this company is formalizing their finance stack right now.

**Live URLs:**
- Dashboard: https://signalpulse-six.vercel.app
- GitHub: https://github.com/chase-sinclair/signalpulse
- n8n (DigitalOcean): http://159.89.185.13:5678
- Supabase: https://qolusthqrhcontdvfvyx.supabase.co

---

## SECTION 2: FILE STRUCTURE

```
signalpulse/
├── app/
│   ├── page.tsx                          # Main leads table view
│   ├── companies/page.tsx                # Company trends + Weekly Delta
│   ├── intelligence/page.tsx             # Market Intelligence tab
│   ├── methodology/page.tsx              # Architecture + scoring explainer
│   └── api/
│       ├── signals/route.ts
│       ├── tags/route.ts
│       ├── intelligence/summary/route.ts
│       └── intelligence/velocity/route.ts
├── components/
│   ├── LeadsTable.tsx
│   ├── ScoreBreakdown.tsx
│   ├── IntentScoreBadge.tsx
│   ├── FilterSidebar.tsx
│   ├── TrendChart.tsx
│   ├── WeeklyDeltaBadge.tsx
│   ├── KpiCard.tsx
│   └── NavLinks.tsx
├── lib/
│   ├── types.ts        # All TypeScript interfaces — source of truth
│   ├── scoring.ts      # computeScoreComponents, computeIntentScore, computeSeniorityLabel
│   ├── supabase.ts     # Browser, server, admin clients
│   └── utils.ts
└── supabase/
    ├── schema.sql      # DO NOT EDIT — use migrations/
    └── migrations/
```

---

## SECTION 3: ENVIRONMENT VARIABLES

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-side only — never in NEXT_PUBLIC_ vars, bypasses RLS
```

---

## SECTION 4: DATABASE SCHEMA

**Tables:** `companies`, `job_signals`, `signal_tags`, `weekly_snapshots`

**Key view:** `signals_with_tags` — aggregates tags onto each signal as `tech_stack: string[]`. Always query this view, never raw tables separately.

**Critical deviations:**
- `posted_at` is `TEXT` — SerpApi returns relative strings like "4 days ago"
- `is_hot_lead` threshold is `>= 9` in n8n
- `job_family` CHECK: `Finance | Infrastructure | Security | Sales | Operations | Other`

**Stored procedure:** `refresh_weekly_snapshots()` — called via Supabase RPC every Sunday at 23:00.

---

## SECTION 5: DESIGN SYSTEM

```css
--bg-base:        #0a0a0f;
--bg-surface:     #111118;
--bg-elevated:    #1a1a24;
--border:         #1e1e2e;
--accent:         #6366f1;   /* indigo */
--accent-hot:     #f59e0b;   /* amber — hot leads */
--text-primary:   #f1f5f9;
--text-secondary: #94a3b8;
--text-muted:     #475569;
--score-high:     #10b981;   /* 8-10 */
--score-mid:      #f59e0b;   /* 5-7  */
--score-low:      #ef4444;   /* 1-4  */

font-display: 'DM Mono', monospace;
font-body:    'Geist', sans-serif;
```

Reuse before creating: `KpiCard`, `IntentScoreBadge`, `WeeklyDeltaBadge`, `TrendChart`, `FilterSidebar`, `LeadsTable`.

---

## SECTION 6: N8N WORKFLOW (LIVE ON DIGITALOCEAN)

**Daily scraper** (`SignalPulse AI`) — runs 6:00 AM daily:

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

**Weekly snapshots** (`signalpulse_snapshots`) — runs Sunday 23:00. Calls `refresh_weekly_snapshots()` via RPC.

**Critical n8n expressions (do not change without testing):**
- `external_job_id`: `$node["Split Out1"].json["job_id"] || $node["Split Out1"].json["share_link"] || $node["Split Out1"].json["title"] + "_" + $node["Split Out1"].json["company_name"]`
- `job_family`: `$json.output[0].content[0].text.job_family.charAt(0).toUpperCase() + $json.output[0].content[0].text.job_family.slice(1)`
- `company_id` in Map Tags to Job ID: `$('Get a row').item.json.company_id`
- Score filter: `>= 7 AND > 0`

**OpenAI model:** `gpt-4o-mini`. Returns JSON: `score`, `reason`, `tech_stack`, `job_family`.

---

## SECTION 7: SCORING SYSTEM

Scores computed client-side in `lib/scoring.ts` — not stored in DB. `computed_score` is the display source of truth (replaces DB `intent_score`). Max score: 10.

| Component | Max | Logic |
|---|---|---|
| `implementation_signal` | 3 | Named tool + impl/transform keyword in **title** = 3, keyword in title only = 2, tool in title OR keyword in description = 1 |
| `tool_specificity` | 3 | Named tool in `tech_stack[]` AND title = 3, in stack only = 2, untracked tools = 1, none = 0 |
| `buying_window` | 2 | URGENCY_TERMS + REPLACEMENT_SIGNALS in description. 2+ = 2, 1 = 1. Maintenance terms → 0 |
| `recency` | 2 | < 3 days = 2, 3–14 days = 1, 14+ days = 0 |

**IMPL_KEYWORDS** (checked in both title and description): `implementation`, `implementing`, `migrate`, `migration`, `rollout`, `deployment`, `deploying`, `transformation`, `transform`, `transforming`, `adoption`, `adopting`, `new system`, `new platform`, `new solution`, `new erp`, `new crm`, `go-live`, `go live`, `overhaul`, `modernization`, `modernising`, `consolidation`, `integration project`, `system change`, `system upgrade`, `phase 1`, `phase one`

Score tiers: green ≥ 8, amber ≥ 5, red < 5.

`computeSeniorityLabel()` returns `EXEC | SR | IC | null` — displayed as UI badge only, not part of score.

---

## SECTION 8: FEATURE ROADMAP

| Priority | Feature | Status |
|---|---|---|
| 1 | Signal Categories | ✅ Complete |
| 2 | Explainable Scoring | ✅ Complete |
| 3 | Market Intelligence Tab | ✅ Complete |
| 4 | UX Context Gaps (action menu, recency, filters, bubble chart, methodology) | ✅ Complete |
| 5 | Visualization Improvements (sparklines, velocity badges) | ⬜ Pending |
| 6 | Slack/Email Alerts — n8n hot lead notifications | ⬜ Pending (Human) |
| 7 | Company Enrichment (Clearbit firmographics) | ⬜ Pending |

---

# MEMORY LOG

---

### [2026-04-15] — UX Context Gaps — Completed by: 🤖 Claude Code

**What was built:**
- `components/LeadsTable.tsx` — Table independently scrollable (maxHeight + sticky thead). Recency traffic-light dot on Added column (green < 48h, amber 3-7d, gray 7+d). Action menu column: Copy Hook (clipboard + 2s feedback), LinkedIn people search, job posting source link.
- `components/FilterSidebar.tsx` — Dynamic signal counts next to each family and tag. Zero-count options dimmed to prevent dead-end filters.
- `app/page.tsx` — Passes signals array to FilterSidebar for count computation.
- `app/intelligence/page.tsx` — Velocity cards now clickable: navigates to `/?search=CompanyName`. Tool × Intent SVG bubble chart (Y = avg score, size = count, color = score tier). Top Tools now shows distinct company count per tool.
- `app/api/intelligence/summary/route.ts` — Extended to return `bubbleData` (top 12 tags with avg_score) and `companies` count per tag.
- `app/methodology/page.tsx` — New page: pipeline architecture walkthrough + scoring component reference + recency legend.
- `components/NavLinks.tsx` — Added Methodology nav link.

**Key decisions:**
- Bubble chart uses DB `intent_score` (not computed_score) since it's aggregated server-side
- Dynamic filter counts reflect the currently-loaded result set — user sees "given your other filters, N signals match this"
- Skipped: Gap 6 (historical delta — Companies page already has WeeklyDelta), Gap 8 (ghost signals — DB-level dedup via external_job_id)

**Next step:** Priority 5 — Visualization Improvements (sparklines, velocity badges) — no schema changes needed

---

### [2026-04-15] — Scoring Overhaul v2 + Max Score = 10 — Completed by: 🤖 Claude Code

**What was built:**
- `lib/scoring.ts` — Rewrote all components. Dropped `pain_points` (unreliable with truncated descriptions). Added `recency` (0–2, based on `created_at`). Expanded `IMPL_KEYWORDS` to include transformation/adoption language. Fixed `tool_specificity` from tag-count to specificity (tool in title+stack=3, stack only=2). `implementation_signal` now checks both title and description.
- `lib/types.ts` — `ScoreComponents` updated (pain_points removed, recency added). `ScoringInput` now requires `created_at`.
- `app/api/signals/route.ts` — passes `created_at` to `computeScoreComponents`.
- `components/ScoreBreakdown.tsx`, `IntentScoreBadge.tsx` — thresholds restored to /10 scale (green ≥8, amber ≥5).
- `app/methodology/page.tsx` — updated to reflect 4 components, /10 max.

**Key decisions:**
- Recency added to reach max 10 — fresh leads are genuinely more actionable, scores decay naturally
- `pain_points` dropped — SerpApi truncates descriptions too aggressively
- `implementation_signal` checks description as fallback (+1) when title has no signal

**Next step:** Priority 5 — Visualization Improvements (sparklines, velocity badges). No schema changes needed.

---
*End of CLAUDE.md — SignalPulse AI*
