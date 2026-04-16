# ui_updates.md - SignalPulse

I need you to analyze these issues claude agent found when testing the web app and apply the necessary updates/fixes. After each fix is applied, create a "FIXED" section noting what issue was fixed and jot down any memory notes you may need if you need to go back and fix it again. 

## Critical Bugs (Break Core Functionality)

1. The leads table only shows ~2 rows at a time.

This is the single biggest issue. The main Leads view has the table squeezed into a tiny scrollable area, with the "Signals by Job Family" chart permanently occupying the bottom third of the screen. With 200 leads, a sales rep would have to scroll through 100 "pages" of 2 leads each. The chart should be collapsible, move below the table, or live on its own tab. The table should get at least 8–10 rows of visible height.

2. The KPI numbers are wrong and contradictory across pages.

On the Leads page: Total Signals = 200
On the Intelligence page: Total Signals = 339

These numbers don't match. Pick one source of truth and explain what each number represents. Right now it looks like a data integrity error.

3. "HOT LEADS" KPI counter is broken when filters are applied.

Default state: Total = 200, Hot Leads = 108 ✅
Toggle "Hot Leads Only" ON: Total = 200, Hot Leads = 200 ❌ (should drop to 108)
Set Min Intent Score to 7: Hot Leads = 171 ❌ (went up, not down)

"Hot Leads" appears to be re-labeling itself as "signals matching current filter" rather than consistently measuring the hot lead flag. This will completely destroy trust with a sales manager reviewing the dashboard. The KPI cards need to either (a) always reflect the unfiltered global state, or (b) clearly label themselves as "Filtered Results."

---

## FIXED — Critical Bugs [2026-04-16] by Claude Code

### Bug 1: Table only shows ~2 rows
**Root cause:** `app/page.tsx` uses `main` as a flex column with `overflowY: auto`. Flex items default to `flex-shrink: 1`, so they compressed to fit the container instead of triggering scroll. The TrendChart and LeadsTable both shrank. Result: the chart squeezed the table to near-nothing and the outer scroll never fired.

**Fix:**
- `app/page.tsx`: Wrapped `<LeadsTable>` and `<TrendChart>` in `<div style={{ flexShrink: 0 }}>`. Added `flexShrink: 0` to the KPI grid div. Now children don't shrink — main scrolls instead.
- `LeadsTable.tsx`: Changed inner scroll wrapper from `maxHeight: calc(100vh - 280px)` to `height: calc(100vh - 250px)` with `minHeight: 320px`. Uses `height` (not maxHeight) so the table is always tall — chart scrolls below fold.

**If this regresses:** Look for any flex parent in the layout chain that's missing `overflow: auto` or that re-introduces `flex-shrink: 1` on the table wrapper. The key invariant is: `main` must scroll, not its children.

---

### Bug 2: KPI numbers mismatch (Leads: 200, Intelligence: 339)
**Root cause:** `/api/signals/route.ts` had `.limit(200)` — hard cap on returned rows. The Intelligence summary route queries `job_signals` table directly with no limit. Both labelled themselves "Total Signals" but measured different things.

**Fix:**
- `app/api/signals/route.ts`: Removed `.limit(200)`. Both pages now source from the same full dataset. Updated stale comment referencing the old limit.

**If this regresses:** If the dataset grows large (>5k rows), re-add pagination and update both the Leads page and Intelligence page to show consistent totals with a note like "showing page 1 of N."

---

### Bug 3: Hot Leads KPI wrong when filters applied
**Root cause:** `kpi.hotLeads` in `app/page.tsx` was computed as `signals.filter(s => s.is_hot_lead).length` — a count of hot leads within the *filtered* signal array. When hot-only filter is on, all returned signals are hot, so Hot Leads = Total. When min score is raised, a different slice of hot leads comes back, making the count jump non-intuitively.

**Fix:**
- `app/api/signals/route.ts`: Added a parallel Supabase count query (`select('*', { count: 'exact', head: true }).eq('is_hot_lead', true)`). Returned as `hot_leads_total` in every API response. This is a DB-level count unaffected by any filter.
- `app/page.tsx`: Added `globalHotLeads` state. The Hot Leads KPI now reads from `globalHotLeads` (stable, global) rather than from the filtered array. Other KPIs (Total, Avg Score, Companies) remain filter-reactive since those are contextually useful.

**If this regresses:** The `hot_leads_total` field must always come from an unfiltered DB query. If the route is refactored, confirm the parallel count query is not accidentally scoped by the filter params.

---

## Major UX Problems

1. The "SR" badge is unexplained.

A teal "SR" badge appears on many leads in the Title column. There's no legend, no tooltip on hover, and no explanation anywhere in the UI. Based on context I'd guess it means "Senior Role" — but a user should never have to guess. The Methodology page explains the green/amber/gray dots beautifully but doesn't mention SR.

2. No "Clear All Filters" button.

Once you've applied tech stack + job family + intent score filters, there's no reset. You have to manually un-check each filter, drag the slider back, and clear the search box. A "Clear filters" or "Reset" link is a baseline requirement.

3. The Companies page shows PwC twice with different signal counts.

PwC appears at the top with 7 signals and again lower in the list with 1 signal. Same for likely other companies. This is a data deduplication problem — the weekly snapshots aren't merging companies properly. It makes the data look unreliable.

4. "Line of Service:Advisory" is not a company.

This appears as a company card on the Companies page. It looks like a sub-department label (from PwC/EY) that got ingested as a company name. This kind of noise seriously degrades trust in the dataset — if a sales rep sees this, they'll question every other company name.

5. The X-axis labels on the Tool × Intent Score bubble chart overlap completely.

"SalesforcNetSuite", "WorkdaySnowflake", "StripeKubernetes" — the tool names are mashed together into unreadable strings. We need a better chart here. Think about this one yourself and replace the current.

## Product/Strategy Issues (Missing Value or Confusing Positioning)

1. No "last updated" timestamp anywhere.

The core value prop is daily signal freshness. The entire product depends on data being current. Yet there's nowhere on the dashboard that tells a user "Last refreshed: today at 6:04 AM." Without this, a sales rep has no way to know if they're looking at fresh signals or week-old ones. This should be in the top navbar or the KPI row.

2. The Companies page has no filters, no search, and no way to drill into a company.

You get 50+ cards, all showing "Finance" as the job family, with no way to find a specific company, no filter by industry or signal count, and the cards aren't clickable. For a page that's supposed to show "which companies should I call first," it's surprisingly passive. Each card should link to a filtered Leads view for that company.

3. The "HOT LEADS" definition is opaque.

108 out of 200 signals are "hot leads" — that's 54%. That number seems high. What makes something a "hot lead" — an intent score ≥ 7? ≥ 8? This should be defined somewhere (Methodology page covers scoring but never defines the hot lead threshold). If the threshold is too low, the "hot" designation loses meaning.

4. The Tech Stack List should have a search button tool

The current tech stack list is extreemly large as it lists out all tools. Having the ability to search for a tool is necessary.

