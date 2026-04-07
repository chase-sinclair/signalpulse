# CLAUDE.md — SignalPulse AI
> Version 1.8 | Stack: Next.js · Supabase · n8n · OpenAI gpt-4o-mini · SerpApi · Docker
> This file is the single source of truth for this project. Claude Code reads it automatically at the start of every session.

---

## SECTION 0: HOW CLAUDE CODE MUST BEHAVE IN THIS PROJECT

These rules apply to every session, every phase, without exception.

### 0.1 Session Start Protocol

At the start of **every** Claude Code session, before writing a single line of code:

1. Read this entire `CLAUDE.md` file
2. Read the `## MEMORY LOG` section at the bottom to understand what has already been built
3. Read the ownership table in Section 0.7 — confirm which phases are human-owned and which are Claude-owned
4. State out loud: what phase was last completed, what is next, and any unresolved issues noted in the log
5. Ask the user to confirm which phase to work on before proceeding

**Never assume continuity from a previous session. Always re-orient from the memory log.**

### 0.2 Memory Log Protocol (CRITICAL)

After completing any phase or meaningful unit of work, Claude Code **must** append an entry to the `## MEMORY LOG` section at the bottom of this file. This is non-negotiable — it is how state persists across sessions.

**Log entry format:**
```
### [DATE] — Phase X Complete: [Phase Name] — Completed by: [Human | Claude Code]
**What was built:**
- [bullet list of files created or modified, or Supabase objects created]

**Key decisions made:**
- [any architectural choices, deviations from the plan, or tradeoffs]

**Known issues / watch out for:**
- [anything the next session should be aware of]

**Handoff notes (if human → Claude handoff):**
- [exact sample data or schema output provided by the human, if applicable]

**Next step:**
- [exactly what to do next, and who owns it]
```

Do not summarize vaguely. Be specific about file names, function names, and any gotchas discovered.

### 0.3 Coding Standards

- **Language:** TypeScript everywhere in Next.js. No `any` types — use the interfaces in `lib/types.ts`.
- **Imports:** Use `@/` path aliases throughout. Never use relative `../` imports except inside the same directory.
- **Components:** Functional components only. No class components.
- **Error handling:** Every async function must have a try/catch. Never let a promise reject silently.
- **Environment variables:** Never hardcode secrets. If a required env var is missing, throw a descriptive error at startup, not at runtime.
- **Comments:** Comment the *why*, not the *what*. Don't comment `// increment i` — do comment `// SerpApi paginates at 10 results; start param increments by 10`.
- **Console logs:** Use `console.error` for errors, `console.warn` for degraded states, `console.log` only during development. Remove debug logs before marking a phase complete.

### 0.4 File Safety Rules

- **Never delete files** without explicit user confirmation.
- **Never modify `supabase/schema.sql`** after Phase 1 is marked complete in the memory log. Schema changes require a new migration file: `supabase/migrations/YYYYMMDD_description.sql`.
- **Never commit secrets.** Before any `git add`, verify `.gitignore` includes `.env`, `.env.local`, and all secret files.
- **Always read a file before editing it.** Never overwrite blindly.
- **Never build a Claude-owned phase based on an assumed schema.** If Phase 1 (human-owned) is not marked complete in the Memory Log with a verified schema sample, stop and ask the user to complete it first.

### 0.5 When You're Uncertain

If requirements are ambiguous, **stop and ask** rather than guess. One clarifying question saves more time than a wrong implementation. Phrase it as: "Before I build X, I want to confirm: [specific question]."

### 0.6 Testing Before Marking Complete

A phase is not complete until it is verified. Minimum verification per phase type:
- **SQL:** Execute in Supabase SQL Editor. Confirm no errors. Run a SELECT to verify data.
- **TypeScript/API:** Run `npm run build` with zero errors. Test the route with curl or the browser.
- **UI Components:** Render with seed data. Verify all conditional states (empty, loading, error).
- **n8n Workflow:** Execute manually once with test data. Check execution log for errors.

### 0.7 Ownership Split — Who Builds What

This project uses a deliberate split: the human owns the data layer and automation engine to maximize hands-on learning; Claude Code owns the Next.js frontend and supporting infrastructure.

| Phase | Owner | Reason |
|---|---|---|
| **Phase 1** — Supabase Schema + Seed | 👤 **Human** | Learn Postgres views, stored procedures, and FK relationships by running the SQL yourself |
| **Phase 2** — TypeScript Types + Supabase Client | 🤖 **Claude Code** | Mechanical work; depends on verified schema from Phase 1 |
| **Phase 3** — Next.js API Route | 🤖 **Claude Code** | Depends on verified schema + sample n8n output |
| **Phase 4** — UI Components | 🤖 **Claude Code** | High-effort UI work; lower learning value for this project's goals |
| **Phase 5** — Dashboard Pages | 🤖 **Claude Code** | Wires components to the API; depends on Phase 4 |
| **Phase 6** — n8n Workflow | 👤 **Human** | The core of the project — build all 16 nodes manually from Section 10 as a blueprint |
| **Phase 7** — Docker + Deployment | 🤖 **Claude Code** | Claude generates `docker-compose.yml` and `setup.sh`; human runs the commands |
| **Phase 8** — Polish | 🤖 **Claude Code** | Loading states, error boundaries, mobile responsiveness |

**Claude Code must never attempt to build a human-owned phase.** If the user asks Claude to do Phase 1 or Phase 6, Claude should decline and redirect: "This phase is designed for you to build manually — it's where the core learning happens. I can answer specific questions or help you debug, but I shouldn't build it for you."

The one exception: if the user explicitly says "I'm stuck and need you to build this for me," Claude Code may assist but must note in the Memory Log that the phase was completed with Claude's help rather than independently.

### 0.8 The Handoff Protocol

When the human completes a human-owned phase and is ready to hand off to Claude Code, they must provide all three of the following. Claude Code must **refuse to start the next phase** if any item is missing.

**Required handoff items after Phase 1 (Supabase):**

1. **Schema confirmation message.** The human states: *"Phase 1 is complete. The schema in Section 4 is live in Supabase. The view `signals_with_tags` is confirmed working."*

2. **Live view sample.** The human runs this query in the Supabase SQL Editor and pastes the result:
   ```sql
   SELECT * FROM signals_with_tags LIMIT 1;
   ```
   This confirms the view works AND shows Claude the exact data shape — including whether `tech_stack` returns as a proper array `["NetSuite", "AWS"]` or as a stringified array `"{NetSuite,AWS}"`. This is a known Supabase client gotcha that will break the TypeScript types if not caught here.

3. **Connection strings.** The human provides:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Confirms: *"I have added `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` — you do not need to see it."*

**Required handoff items after Phase 6 (n8n):**

1. **Workflow confirmation message.** The human states: *"Phase 6 is complete. The n8n workflow has run at least once successfully and inserted at least one hot lead into the database."*

2. **Final node output sample.** The human copies the JSON output from the last Supabase upsert node in n8n and pastes it. This is the exact shape of data flowing into the database — Claude Code needs this to ensure the API route handles every field correctly.

3. **Hot lead confirmation.** The human runs this query and confirms it returns at least one row:
   ```sql
   SELECT company_name, job_title, intent_score, is_hot_lead, tech_stack
   FROM signals_with_tags
   WHERE is_hot_lead = TRUE
   LIMIT 3;
   ```

**Why these specific items:** The TypeScript types and API route are written from the schema definition, but real-world pipelines sometimes produce subtle differences — a null where you expected a string, a missing field, a timestamp in an unexpected format. Seeing actual live data before writing the frontend code eliminates an entire class of bugs.

---

## SECTION 1: PROJECT CONTEXT

### What This Is

SignalPulse AI is a B2B Sales Intelligence Engine. It monitors job postings to identify "Buying Windows" — moments when a company's hiring patterns signal they are about to purchase new software.

**Example signal:** A mid-sized manufacturing company posts a job for "NetSuite Implementation Manager." This tells Ramp, Brex, or Stripe: this company is formalizing their finance stack. They are a hot prospect right now.

### Who This Is For

**Built by:** A solo developer learning n8n and Supabase, using this as a portfolio project.

**Target audience for the portfolio:** Recruiters and hiring managers at high-growth B2B SaaS companies — Ramp, Stripe, Brex, Snowflake, AWS.

**Simulated end users (the product's intended customers if it were real):** Sales and RevOps teams at those companies who want to find new customers.

### Why These Tech Choices

| Tool | Why |
|---|---|
| **Next.js 14 (App Router)** | Signals modern React fluency to recruiters. Server components + API routes in one repo. |
| **Supabase** | PostgreSQL with instant REST API, real-time subscriptions, and a visual dashboard — ideal for learning. |
| **n8n** | Visual workflow automation. Learning goal for this project. Handles scheduling, HTTP, and Supabase natively. |
| **OpenAI gpt-4o-mini** | Cheapest capable model for structured JSON extraction. Cost-efficient at scale. |
| **SerpApi (Google Jobs)** | Per-search pricing (not per-record). Free tier = 100 searches/month. 3 daily queries = 90 credits/month = $0. |
| **Docker** | Makes n8n portable and always-on when deployed to DigitalOcean. |

---

## SECTION 2: PROJECT FILE STRUCTURE

```
signalpulse/
├── CLAUDE.md                       ← YOU ARE HERE. Do not move or rename this file.
├── .gitignore                      ← Must include .env, .env.local, node_modules
├── .env.local.example              ← Template only — never the real values
├── package.json
├── tsconfig.json
├── next.config.ts
│
├── app/                            # Next.js 14 App Router
│   ├── layout.tsx                  # Root layout: fonts, global styles, metadata
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard shell: sidebar + header
│   │   ├── page.tsx                # Main leads table view
│   │   └── companies/
│   │       └── page.tsx            # Company trend + Weekly Delta view
│   └── api/
│       └── signals/
│           └── route.ts            # GET handler: fetch + filter job_signals
│
├── components/
│   ├── LeadsTable.tsx              # Main data table with sort + expand
│   ├── TrendChart.tsx              # Recharts bar chart: signals by job_family
│   ├── WeeklyDeltaBadge.tsx        # "+3 ↑" / "-2 ↓" badge component
│   ├── IntentScoreBadge.tsx        # Color-coded 1-10 score pill
│   ├── FilterSidebar.tsx           # Search, family, score, tag, hot-lead filters
│   └── KpiCard.tsx                 # Animated stat card for dashboard header
│
├── lib/
│   ├── types.ts                    # All TypeScript interfaces — source of truth
│   ├── supabase.ts                 # Browser, server, and admin Supabase clients
│   └── utils.ts                   # Shared helpers: formatDate, relativeTime, etc.
│
├── supabase/
│   ├── schema.sql                  # Full DB schema — DO NOT EDIT after Phase 1
│   ├── seed.sql                    # 30+ realistic mock rows for demo/testing
│   └── migrations/                 # Any post-Phase-1 schema changes go here
│
├── n8n/
│   ├── signalpulse_daily.json      # Main daily scraper workflow (importable)
│   └── signalpulse_snapshots.json  # Weekly snapshot workflow (importable)
│
├── docker/
│   ├── docker-compose.yml          # n8n service definition
│   ├── .env.example                # Template for Docker env vars
│   └── setup.sh                   # DigitalOcean droplet bootstrap script
│
└── docs/
    ├── SERPAPI_REFERENCE.md        # Query strategy, field mapping, credit budget
    └── ARCHITECTURE.md             # System diagram and data flow narrative
```

---

## SECTION 3: ENVIRONMENT VARIABLES

### `/.env.local.example` (Next.js — copy to `.env.local` and fill in)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### `/docker/.env.example` (n8n via Docker — copy to `.env` and fill in)
```env
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=changeme_to_something_strong
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678/
GENERIC_TIMEZONE=America/New_York
OPENAI_API_KEY=sk-...
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SERP_API_KEY=your_serpapi_key
```

### Key setup notes

**SerpApi:** Sign up at `serpapi.com`. Free tier = 100 searches/month. With 3 daily queries we consume 90/month — stays free indefinitely at MVP scale. In n8n, store the key under **Settings → Credentials → Header Auth**, name it `SerpApi`. Reference in nodes as `{{ $credentials.SerpApi.value }}`. Never put the raw key in workflow JSON.

**Supabase Service Role Key:** This key bypasses Row Level Security. It is only used in n8n (server-side writes) and Next.js server-side API routes. It must never appear in any client-side code or `NEXT_PUBLIC_` variable.

**Security rule enforced by Claude Code:** Before every `git commit`, run `git diff --staged` and scan for any string matching `sk-`, `eyJ`, or `service_role`. If found, abort and alert the user.

---

## SECTION 4: DATABASE SCHEMA

### Execute in Supabase SQL Editor — `/supabase/schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- COMPANIES
-- One row per target company being tracked.
-- Enables company-level trend analysis and Weekly Delta.
-- ─────────────────────────────────────────────
CREATE TABLE companies (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT UNIQUE NOT NULL,
    domain        TEXT,
    industry      TEXT,
    employee_range TEXT,    -- "51-200", "201-500", etc.
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- JOB SIGNALS
-- One row per unique job posting (deduped on external_job_id).
-- ─────────────────────────────────────────────
CREATE TABLE job_signals (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_job_id  TEXT UNIQUE NOT NULL,   -- SerpApi job_id — dedup key
    company_id       UUID REFERENCES companies(id) ON DELETE SET NULL,
    company_name     TEXT NOT NULL,           -- Denormalized for fast reads
    job_title        TEXT NOT NULL,
    raw_description  TEXT,
    job_url          TEXT,
    job_family       TEXT CHECK (job_family IN (
                       'Finance', 'Infrastructure', 'Security',
                       'Sales', 'Operations', 'Other'
                     )),
    intent_score     INT CHECK (intent_score BETWEEN 1 AND 10),
    sales_hook       TEXT,
    is_hot_lead      BOOLEAN DEFAULT FALSE,
    posted_at        TIMESTAMP WITH TIME ZONE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SIGNAL TAGS
-- Junction table replacing TEXT[] for queryable tag filtering.
-- Each tech tool mention = one row.
-- ─────────────────────────────────────────────
CREATE TABLE signal_tags (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID NOT NULL REFERENCES job_signals(id) ON DELETE CASCADE,
    tag       TEXT NOT NULL,    -- "NetSuite", "AWS", "Salesforce", etc.
    UNIQUE(signal_id, tag)
);

-- ─────────────────────────────────────────────
-- WEEKLY SNAPSHOTS
-- Aggregated per-company, per-week summary.
-- Written by the Sunday n8n workflow via stored procedure.
-- Powers the "Weekly Delta" badges on the Companies page.
-- ─────────────────────────────────────────────
CREATE TABLE weekly_snapshots (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    week_start        DATE NOT NULL,
    signal_count      INT DEFAULT 0,
    avg_intent_score  NUMERIC(4,2),
    dominant_family   TEXT,
    UNIQUE(company_id, week_start)
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX idx_signals_company_id ON job_signals(company_id);
CREATE INDEX idx_signals_family     ON job_signals(job_family);
CREATE INDEX idx_signals_created    ON job_signals(created_at DESC);
CREATE INDEX idx_signals_hot        ON job_signals(is_hot_lead) WHERE is_hot_lead = TRUE;
CREATE INDEX idx_signals_intent     ON job_signals(intent_score DESC);
CREATE INDEX idx_tags_tag           ON signal_tags(tag);
CREATE INDEX idx_snapshots_company  ON weekly_snapshots(company_id, week_start DESC);

-- ─────────────────────────────────────────────
-- VIEW: signals_with_tags
-- Aggregates tags back onto each signal as an array.
-- Used by the Next.js API route — never query the raw tables separately.
-- ─────────────────────────────────────────────
CREATE VIEW signals_with_tags AS
SELECT
    js.*,
    COALESCE(
        array_agg(st.tag ORDER BY st.tag) FILTER (WHERE st.tag IS NOT NULL),
        '{}'::text[]
    ) AS tech_stack
FROM job_signals js
LEFT JOIN signal_tags st ON st.signal_id = js.id
GROUP BY js.id;

-- ─────────────────────────────────────────────
-- STORED PROCEDURE: refresh_weekly_snapshots
-- Called by the Sunday n8n workflow via Supabase RPC.
-- Upserts one row per company for the current week.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_weekly_snapshots()
RETURNS void AS $$
DECLARE
    week_start DATE := date_trunc('week', NOW())::date;
BEGIN
    INSERT INTO weekly_snapshots (
        company_id, week_start, signal_count, avg_intent_score, dominant_family
    )
    SELECT
        js.company_id,
        week_start,
        COUNT(*)                                        AS signal_count,
        ROUND(AVG(js.intent_score)::numeric, 2)        AS avg_intent_score,
        MODE() WITHIN GROUP (ORDER BY js.job_family)   AS dominant_family
    FROM job_signals js
    WHERE js.company_id IS NOT NULL
      AND js.created_at >= week_start
      AND js.created_at < week_start + INTERVAL '7 days'
    GROUP BY js.company_id
    ON CONFLICT (company_id, week_start)
    DO UPDATE SET
        signal_count     = EXCLUDED.signal_count,
        avg_intent_score = EXCLUDED.avg_intent_score,
        dominant_family  = EXCLUDED.dominant_family;
END;
$$ LANGUAGE plpgsql;
```

### Seed Data — `/supabase/seed.sql`

Claude Code must generate the complete INSERT statements (no placeholders). Requirements:

- **Companies:** At least 8 distinct companies across varied industries
- **Job Signals:** 35+ rows spread across the past 3 weeks
- **Weekly Snapshots:** At least 6 companies with snapshot rows for 3 consecutive weeks (required for delta arrows to render with visible trends)
- **Hot leads:** At least 10 rows where `is_hot_lead = TRUE` and `intent_score >= 8`
- **Intent distribution:** Full range 1–10 must be represented
- **Required tags:** `NetSuite`, `Sage Intacct`, `QuickBooks`, `AWS`, `Salesforce`, `Workday`, `SAP`, `Okta`, `Snowflake`, `Stripe`, `Ramp`, `Brex`
- **High-value demo rows:** At least 4 rows with `job_family = 'Finance'` and tags `NetSuite` or `Sage Intacct` — these are the "hero" examples for recruiter demos
- **Realistic companies:** Use plausible-sounding fictional company names (e.g., "Meridian Logistics Group", "Cascade Health Systems") — not "Company A"

---

## SECTION 5: TYPESCRIPT TYPES

### `/lib/types.ts` — Write this file exactly

```typescript
// ─── Primitive types ────────────────────────────────────────────────────────
export type JobFamily =
  | 'Finance'
  | 'Infrastructure'
  | 'Security'
  | 'Sales'
  | 'Operations'
  | 'Other';

// ─── Database row types ─────────────────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  employee_range: string | null;
  created_at: string;
}

export interface JobSignal {
  id: string;
  external_job_id: string;
  company_id: string | null;
  company_name: string;
  job_title: string;
  raw_description: string | null;
  job_url: string | null;
  job_family: JobFamily | null;
  tech_stack: string[];       // Populated by signals_with_tags view
  intent_score: number | null;
  sales_hook: string | null;
  is_hot_lead: boolean;
  posted_at: string | null;
  created_at: string;
}

export interface WeeklySnapshot {
  id: string;
  company_id: string;
  week_start: string;
  signal_count: number;
  avg_intent_score: number | null;
  dominant_family: string | null;
}

// ─── Derived / computed types ────────────────────────────────────────────────
export interface CompanyWithDelta extends Company {
  current_week_count: number;
  previous_week_count: number;
  delta: number;              // current - previous (negative = slowing)
  delta_percent: number | null;
  latest_signals: JobSignal[];
}

// ─── UI / filter types ───────────────────────────────────────────────────────
export interface DashboardFilters {
  job_families: JobFamily[];
  min_intent_score: number;
  tags: string[];
  hot_leads_only: boolean;
  search: string;
}

export interface KpiData {
  total_signals: number;
  hot_leads: number;
  avg_intent_score: number;
  companies_tracked: number;
}
```

---

## SECTION 6: SUPABASE CLIENT

### `/lib/supabase.ts` — Write this file exactly

```typescript
import { createClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ── Validate env at module load time ────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY');

// ── Browser client (Client Components only) ──────────────────────────────────
// Uses anon key. Respects Row Level Security.
export const supabaseBrowser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Server client (Server Components + Route Handlers) ──────────────────────
// Uses anon key + cookie-based auth context.
export function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

// ── Admin client (Server-only — n8n callbacks, service writes) ───────────────
// Uses service role key. BYPASSES Row Level Security.
// Never import this in client components or pages.
export function createSupabaseAdmin() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY — admin client unavailable');
  }
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY);
}
```

---

## SECTION 7: API ROUTE

### `/app/api/signals/route.ts`

This is the single data-fetching endpoint for the dashboard. All filtering happens here — never in client components with raw Supabase queries.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';
import type { JobFamily } from '@/lib/types';

export const dynamic = 'force-dynamic'; // Never cache — data updates daily

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    const { searchParams } = new URL(request.url);

    // Parse filters from query string
    const minScore = Math.max(1, Math.min(10,
      parseInt(searchParams.get('min_score') ?? '1')
    ));
    const families = searchParams.getAll('family') as JobFamily[];
    const hotOnly  = searchParams.get('hot') === 'true';
    const search   = searchParams.get('search')?.trim() ?? '';
    const tags     = searchParams.getAll('tag');

    // Build query against the view (includes tech_stack array)
    let query = supabase
      .from('signals_with_tags')
      .select('*')
      .gte('intent_score', minScore)
      .order('created_at', { ascending: false })
      .limit(200);

    if (families.length > 0) query = query.in('job_family', families);
    if (hotOnly)              query = query.eq('is_hot_lead', true);
    if (search)               query = query.ilike('company_name', `%${search}%`);

    const { data, error } = await query;

    if (error) {
      console.error('[signals/route] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Tag filter: Supabase doesn't support array overlap in .filter() easily,
    // so we post-filter in JS. At 200 row limit this is negligible overhead.
    const filtered = tags.length > 0
      ? (data ?? []).filter(row =>
          tags.some(t => (row.tech_stack as string[])?.includes(t))
        )
      : (data ?? []);

    return NextResponse.json({
      signals: filtered,
      count: filtered.length,
    });

  } catch (err) {
    console.error('[signals/route] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## SECTION 8: FRONTEND COMPONENTS

### Design Direction

The dashboard must look like a **real B2B SaaS product** — dark, data-dense, production-quality. Reference: Linear, Vercel dashboard, Retool.

**Visual specification (Claude Code must follow exactly):**

```css
/* Color palette */
--bg-base:     #0a0a0f;   /* Page background */
--bg-surface:  #111118;   /* Card / panel background */
--bg-elevated: #1a1a24;   /* Hover states, selected rows */
--border:      #1e1e2e;   /* All borders */
--accent:      #6366f1;   /* Indigo — interactive elements, links */
--accent-hot:  #f59e0b;   /* Amber — hot lead indicators */
--text-primary:   #f1f5f9;
--text-secondary: #94a3b8;
--text-muted:     #475569;

/* Intent score colors */
--score-high:   #10b981;  /* 8-10: green */
--score-mid:    #f59e0b;  /* 5-7:  amber */
--score-low:    #ef4444;  /* 1-4:  red */

/* Typography */
font-display: 'DM Mono', monospace;   /* Numbers, scores, tags, IDs */
font-body:    'Geist', sans-serif;    /* All other UI text */

/* Background texture */
background-image: url("data:image/svg+xml,..."); /* Subtle dot grid — see implementation */
```

**Animation rule:** KPI cards animate in on page load with a staggered fade + translate-up (100ms delay between each). All other animations use CSS transitions max 150ms. No gratuitous motion.

---

### Component Specs

#### `KpiCard.tsx`
Props: `{ label: string; value: string | number; icon: ReactNode; delay: number }`
- Renders a stat card with label, large value, and icon
- Animates in on mount: `opacity: 0 → 1`, `translateY: 8px → 0`, delayed by `delay` ms
- No click behavior

#### `IntentScoreBadge.tsx`
Props: `{ score: number | null }`
- Renders a pill: e.g., `⬤ 9`
- Color: green if score >= 8, amber if 5–7, red if <= 4, gray if null
- Font: DM Mono

#### `WeeklyDeltaBadge.tsx`
Props: `{ delta: number }`
- Renders: `+3 ↑` (green) / `-2 ↓` (red) / `—` (gray when delta === 0)
- Font: DM Mono
- No background — inline text badge only

#### `TrendChart.tsx`
Props: `{ data: { family: string; count: number }[] }`
- Recharts `BarChart` inside `ResponsiveContainer`
- One bar per job_family, colored with the accent palette
- X-axis: family name. Y-axis: count. No legend (use bar labels instead).
- Must handle empty data state: render "No data yet" message, not a broken chart

#### `FilterSidebar.tsx`
Props: `{ filters: DashboardFilters; onChange: (f: DashboardFilters) => void }`
- Search input: debounced 300ms via `useEffect` + `setTimeout`
- Job Family: checkbox group (all 6 families)
- Intent Score: range slider, min 1, default 7
- Tags: pill multi-select for the 12 key tags defined in seed data
- "Hot Leads Only": toggle switch
- "Reset Filters": button that restores all defaults
- Width: 280px fixed, scrollable if content overflows

#### `LeadsTable.tsx`
Props: `{ signals: JobSignal[]; loading: boolean }`

Columns (in order):

| # | Column | Content | Notes |
|---|---|---|---|
| 1 | 🔥 | Amber dot if `is_hot_lead` | 24px wide, centered |
| 2 | Company | Name + favicon | `https://www.google.com/s2/favicons?domain={domain}&sz=16` — fallback to initials if domain null |
| 3 | Job Title | Full title | Truncate at 40 chars |
| 4 | Family | Colored label pill | Each family has a distinct muted color |
| 5 | Tech Stack | Tag chips | Show max 3, then "+N more" chip |
| 6 | Intent | `IntentScoreBadge` | — |
| 7 | Sales Hook | Truncated to 80 chars | Full text on row hover via CSS tooltip |
| 8 | Posted | Relative time | "2 days ago", "3 hours ago" — implement in `lib/utils.ts` |

- Sortable by Intent Score (default: desc) and Posted date
- Client-side sort via `useState` — no re-fetch on sort
- Loading state: skeleton rows (6 rows of pulsing gray bars)
- Empty state: centered message "No signals match your filters" with a reset button

---

## SECTION 9: DASHBOARD PAGES

### `/app/(dashboard)/page.tsx` — Main Leads View

Layout:
```
┌─────────────────────────────────────────────────────┐
│  Header: Logo | "SignalPulse AI" | subtitle          │
├──────────────┬──────────────────────────────────────┤
│              │  KPI Row (4 cards)                   │
│  Filter      ├──────────────────────────────────────┤
│  Sidebar     │  LeadsTable (full width)             │
│  (280px)     │                                      │
│              │  TrendChart (below table)            │
└──────────────┴──────────────────────────────────────┘
```

Data fetching: use `useEffect` + `fetch('/api/signals?' + params)` in a client component. Build the query string from `DashboardFilters` state. Re-fetch when filters change (debounced 300ms for search, immediate for all other filters).

KPI values to compute from the fetched signal array (client-side, no extra API call):
- **Total Signals:** `signals.length`
- **Hot Leads:** `signals.filter(s => s.is_hot_lead).length`
- **Avg Intent Score:** `mean(signals.map(s => s.intent_score)).toFixed(1)`
- **Companies Tracked:** `new Set(signals.map(s => s.company_name)).size`

### `/app/(dashboard)/companies/page.tsx` — Company Trend View

Data fetching: fetch `weekly_snapshots` joined with `companies` for the last 2 weeks. Compute delta per company.

Layout: 3-column card grid. Each card shows:
- Company name (large)
- Signals this week (number)
- `WeeklyDeltaBadge`
- Dominant job family (small label)
- Mini sparkline of the last 3 weeks (optional — implement if time allows)

Sort: by delta descending. Most-accelerating companies appear first — this is the "most interesting" sort for a sales rep.

---

## SECTION 10: N8N WORKFLOW — DAILY SCRAPER

### File: `/n8n/signalpulse_daily.json`

Claude Code must produce a complete, importable n8n workflow JSON. Below is the full node specification.

---

#### Node 1 — Schedule Trigger
- Cron: `0 6 * * *` (6:00 AM daily)
- Timezone: set in Docker via `GENERIC_TIMEZONE=America/New_York`

---

#### Node 2 — Query Config (Code Node)
Defines the 3 search queries as a static array. All query configuration lives here — change queries here, nowhere else.

```javascript
return [
  { json: { q: '(CFO OR "Chief Financial Officer") hiring',        label: 'CFO_Signal'     } },
  { json: { q: '(NetSuite OR "Sage Intacct") implementation',      label: 'ERP_Signal'     } },
  { json: { q: '(Payroll OR HRIS) "implementation manager"',       label: 'Payroll_Signal' } },
];
```

---

#### Node 3 — Loop Over Queries (Loop Over Items node)
Iterates over the 3 query objects. All subsequent nodes run once per query.

---

#### Node 4 — HTTP Request: SerpApi
- Method: `GET`
- URL: `https://serpapi.com/search.json`
- Query Parameters:

| Key | Value |
|---|---|
| `engine` | `google_jobs` |
| `q` | `{{ $json.q }}` |
| `location` | `United States` |
| `chips` | `date_posted:today` |
| `api_key` | `{{ $credentials.SerpApi.value }}` |

- **On error:** Continue (log the error, don't fail the whole workflow)

---

#### Node 5 — Split Out Jobs Array
- Field to split: `jobs_results`
- Each output item = one job posting object

---

#### Node 6 — Smart Filter (Code Node)
Runs **before** OpenAI. Items failing any check are marked `_skip: true` and never consume AI credits.

```javascript
const item = $input.item.json;
const desc    = (item.description    || '').toLowerCase();
const company = (item.company_name   || '').toLowerCase();
const posted  = (item.detected_extensions?.posted_at || '').toLowerCase();

// Rule 1: Exclude recruiters / staffing agencies
const recruiterKeywords = [
  'staffing agency', 'recruitment firm', 'third party', 'third-party',
  'on behalf of our client', 'our client is', 'contingency search',
  'executive search firm', 'talent acquisition firm', 'recruiting agency'
];
if (recruiterKeywords.some(kw => desc.includes(kw) || company.includes(kw))) {
  return [{ json: { _skip: true, _reason: 'recruiter', ...item } }];
}

// Rule 2: Freshness (belt-and-suspenders with chips param)
const isFresh = posted.includes('hour') || posted.includes('just posted') ||
                posted === '1 day ago'  || posted.includes('today');
if (!isFresh) {
  return [{ json: { _skip: true, _reason: 'stale', ...item } }];
}

// Rule 3: Minimum description quality
if ((item.description || '').length < 200) {
  return [{ json: { _skip: true, _reason: 'short_description', ...item } }];
}

return [{ json: { _skip: false, ...item } }];
```

---

#### Node 7 — IF: Skip Guard (pre-AI)
- True (`_skip === false`) → Node 8
- False → NoOp (item dropped, no OpenAI credit spent)

---

#### Node 8 — Split In Batches
- Batch size: **5**
- Protects against OpenAI rate limits. Do not remove.

---

#### Node 9 — OpenAI Chat Model
- Model: `gpt-4o-mini`
- User message: `{{ $json.description }}`
- System prompt (exact — Claude Code must not paraphrase or shorten):

```
You are an expert B2B Sales Intelligence Analyst.
Analyze the job description and return ONLY a valid JSON object.
NO markdown. NO backticks. NO explanation. Raw JSON only.

Required structure:
{
  "job_family": "Finance | Infrastructure | Security | Sales | Operations | Other",
  "tech_stack": ["Named", "Software", "Tools", "Only"],
  "intent_score": <integer 1-10>,
  "is_hot_lead": <boolean>,
  "sales_hook": "<one sentence, max 25 words, cold email opener referencing the specific role>"
}

INTENT SCORE GUIDE:
9-10 → First-time CFO/Controller hire; NetSuite/Sage Intacct implementation; explicit "migrating from QuickBooks"
7-8  → Finance/Ops team scaling (5+ person team); mentions spend management, multi-entity accounting
5-6  → General Finance hire with headcount growth signals
3-4  → Generic operational role, limited signals
1-2  → No spend management relevance

RULES:
- tech_stack: named products only ("NetSuite", "Workday"). Never generic terms ("ERP", "accounting software").
- is_hot_lead: true ONLY when intent_score >= 8
- sales_hook: must reference the specific role title, not be a generic opener
```

---

#### Node 10 — JSON Validation + Field Merge (Code Node)
Validates AI output AND merges scraper fields into one flat object for Supabase.

```javascript
// Extract content from various OpenAI response shapes
const raw = $input.item.json.message?.content
  ?? $input.item.json.choices?.[0]?.message?.content
  ?? $input.item.json.text
  ?? '';

// Parse and validate
let parsed;
try {
  const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
  parsed = JSON.parse(cleaned);
} catch (e) {
  return [{ json: {
    _skip: true,
    _error: `JSON parse failed: ${e.message}`,
    _raw: raw.substring(0, 300)
  }}];
}

// Type validation
const checks = [
  ['job_family',   v => typeof v === 'string'],
  ['tech_stack',   v => Array.isArray(v)],
  ['intent_score', v => typeof v === 'number'],
  ['is_hot_lead',  v => typeof v === 'boolean'],
  ['sales_hook',   v => typeof v === 'string'],
];
for (const [field, validator] of checks) {
  if (!validator(parsed[field])) {
    return [{ json: { _skip: true, _error: `Invalid field: ${field}`, _value: parsed[field] } }];
  }
}

// Sanitize
parsed.intent_score = Math.max(1, Math.min(10, Math.round(parsed.intent_score)));
parsed.tech_stack   = parsed.tech_stack.filter(t => typeof t === 'string' && t.length > 0);

// Merge with original scraper data
const src = $input.item.json;
return [{ json: {
  _skip: false,
  // Scraper fields
  external_job_id:  src.job_id,
  company_name:     src.company_name,
  job_title:        src.title,
  raw_description:  src.description,
  job_url:          src.related_links?.[0]?.link ?? null,
  posted_at:        src.detected_extensions?.posted_at ?? null,
  // AI-enriched fields
  job_family:       parsed.job_family,
  tech_stack:       parsed.tech_stack,
  intent_score:     parsed.intent_score,
  is_hot_lead:      parsed.is_hot_lead,
  sales_hook:       parsed.sales_hook,
}}];
```

---

#### Node 11 — IF: Skip Guard (post-validation)
- True → Node 12
- False → NoOp (log validation failures)

---

#### Node 12 — Supabase: Upsert Company
- Table: `companies`
- Operation: Upsert
- Conflict column: `name`
- Fields: `{ "name": "{{ $json.company_name }}" }`

---

#### Node 13 — Supabase: Upsert Job Signal
- Table: `job_signals`
- Operation: Upsert
- Conflict column: `external_job_id`
- Fields:
```json
{
  "external_job_id": "{{ $json.external_job_id }}",
  "company_name":    "{{ $json.company_name }}",
  "job_title":       "{{ $json.job_title }}",
  "raw_description": "{{ $json.raw_description }}",
  "job_url":         "{{ $json.job_url }}",
  "job_family":      "{{ $json.job_family }}",
  "intent_score":    "{{ $json.intent_score }}",
  "is_hot_lead":     "{{ $json.is_hot_lead }}",
  "sales_hook":      "{{ $json.sales_hook }}",
  "posted_at":       "{{ $json.posted_at }}"
}
```

---

#### Node 14 — HTTP Request: Patch company_id FK
After upsert, look up the company by name and patch the signal's `company_id`.
- Method: `GET`
- URL: `{{ $env.SUPABASE_URL }}/rest/v1/companies?name=eq.{{ encodeURIComponent($json.company_name) }}&select=id`
- Headers: `{ "apikey": "{{ $env.SUPABASE_SERVICE_ROLE_KEY }}" }`
- Follow with a PATCH to `job_signals` setting `company_id`

---

#### Node 15 — Split Out tech_stack Array
Split the `tech_stack` array into individual items for tag insertion.

---

#### Node 16 — Supabase: Upsert Tags
- Table: `signal_tags`
- Operation: Upsert
- Conflict: `(signal_id, tag)` → DO NOTHING
- Fields: `{ "signal_id": "{{ $json.signal_id }}", "tag": "{{ $json.tag_item }}" }`

---

### File: `/n8n/signalpulse_snapshots.json`

This is a **separate workflow** — not connected to the daily scraper.

- **Node 1:** Schedule Trigger — `0 23 * * 0` (Sunday 23:00)
- **Node 2:** HTTP Request
  - Method: POST
  - URL: `{{ $env.SUPABASE_URL }}/rest/v1/rpc/refresh_weekly_snapshots`
  - Headers: `{ "apikey": "{{ $env.SUPABASE_SERVICE_ROLE_KEY }}", "Authorization": "Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}", "Content-Type": "application/json" }`
  - Body: `{}`

---

## SECTION 11: DOCKER DEPLOYMENT

### `/docker/docker-compose.yml`

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: signalpulse-n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_BASIC_AUTH_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_AUTH_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=${N8N_PROTOCOL}
      - WEBHOOK_URL=${WEBHOOK_URL}
      - GENERIC_TIMEZONE=America/New_York
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SERP_API_KEY=${SERP_API_KEY}
    volumes:
      - n8n_data:/home/node/.n8n
      - ./n8n-workflows:/home/node/.n8n/workflows

volumes:
  n8n_data:
```

### `/docker/setup.sh` — DigitalOcean Bootstrap Script

Claude Code must generate this script. It must:
1. `apt update && apt install -y docker.io docker-compose`
2. Clone the repo from GitHub
3. `cp docker/.env.example docker/.env`
4. Print instructions to fill in `.env` values before continuing
5. `docker-compose -f docker/docker-compose.yml up -d`
6. Print the n8n URL (`http://<droplet-ip>:5678`) and remind user to log in

---

## SECTION 12: SERPAPI REFERENCE

### Query Strategy

| Label | Search String | Signal Meaning |
|---|---|---|
| `CFO_Signal` | `(CFO OR "Chief Financial Officer") hiring` | First exec finance hire = formalizing spend |
| `ERP_Signal` | `(NetSuite OR "Sage Intacct") implementation` | Migrating off spreadsheets = major budget event |
| `Payroll_Signal` | `(Payroll OR HRIS) "implementation manager"` | Scaling headcount = needs modern spend tooling |

**Future queries (post-free-tier):** `"VP of Finance" Series`, `"Accounts Payable" NetSuite`, `"expense management" OR Concur OR Expensify`

### Response Field Mapping

```
jobs_results[].title                        → job_signals.job_title
jobs_results[].company_name                 → job_signals.company_name
jobs_results[].description                  → job_signals.raw_description + OpenAI input
jobs_results[].job_id                       → job_signals.external_job_id (dedup key)
jobs_results[].related_links[0].link        → job_signals.job_url
jobs_results[].detected_extensions.posted_at → job_signals.posted_at
```

### Credit Budget

| Scenario | Daily Queries | Monthly Credits | Cost |
|---|---|---|---|
| MVP | 3 | 90 | **$0 free tier** |
| Growth | 8 | 240 | ~$50/mo |
| Scale | 20 | 600 | ~$100/mo |

---

## SECTION 13: BUILD ORDER

The sequence below matches the agent's project guide exactly. Note that n8n (previously listed as Phase 6) is moved before the frontend handoff — this is intentional. Claude Code should not build the frontend against a theoretical schema; it should build against real, verified, live data.

> **Phase number note:** The agent's project guide uses its own phase numbers (1–6). This table maps them to the internal phase names used throughout this file. When communicating with Claude Code, always use the phase *names*, not numbers, to avoid ambiguity.

| Agent Phase | Internal Name | Owner | Key Deliverable | Status |
|---|---|---|---|---|
| Phase 1 | Supabase Schema + Seed | 👤 Human | Schema + view live in Supabase; `SELECT * FROM signals_with_tags LIMIT 1` returns a valid row | ✅ |
| Phase 2 | n8n Workflow | 👤 Human | 16-node daily scraper built manually; weekly snapshot workflow built; one hot lead confirmed in DB | ✅ |
| Phase 3 | Handoff | 👤 Human → 🤖 Claude Code | Human provides all 3 items from Section 0.8; Claude confirms receipt before proceeding | ✅ |
| Phase 4a | Types + Supabase Client | 🤖 Claude Code | `lib/types.ts`, `lib/supabase.ts`, `lib/utils.ts` — written from live data sample, not assumed schema | ✅ |
| Phase 4b | API Route | 🤖 Claude Code | `app/api/signals/route.ts` tested with curl against live Supabase, returns real rows | ✅ |
| Phase 5a | UI Components | 🤖 Claude Code | All 6 components render correctly with live seed data; all states verified | ✅ |
| Phase 5b | Dashboard Pages | 🤖 Claude Code | Both pages wired to live API; all filters working end-to-end | ✅ |
| Phase 6a | Docker + n8n Deploy | 👤 Human | DigitalOcean Droplet running; `setup.sh` executed; n8n accessible at public URL | ⬜ Pending |
| Phase 6b | Vercel Deploy + README | 🤖 Claude Code | Next.js live on Vercel; `README.md` generated with recruiter narrative | ✅ |
| Phase 7 | Polish | 🤖 Claude Code | Loading states, error boundaries, empty states, mobile responsiveness | ✅ |

**For human-owned phases:** Use the relevant sections of this file as your blueprint. Section 4 for Supabase. Section 10 for n8n. Ask Claude Code for debugging help freely — just don't ask it to build the phase wholesale.

**For Claude Code phases:** Do not begin until the Memory Log confirms all preceding phases are complete and all handoff items from Section 0.8 have been received and logged.

**The correct handoff prompt (copy this exactly when ready):**
> *"I have built the Supabase schema and the n8n scraper. The Supabase Schema + Seed phase and the n8n Workflow phase are both complete. Here is a sample row from `signals_with_tags`: [paste your query output]. My `NEXT_PUBLIC_SUPABASE_URL` is [url] and my `NEXT_PUBLIC_SUPABASE_ANON_KEY` is [key]. I have added `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` — you do not need to see it. Please initialize the Next.js project and begin the Types + Supabase Client phase."*

---

## SECTION 14: MVP SUCCESS CHECKLIST

- [ ] n8n daily workflow triggers at 6:00 AM without manual intervention
- [ ] All 3 SerpApi queries return results (verify in n8n execution log)
- [ ] Smart Filter drops recruiter postings before OpenAI (verify filtered count in log)
- [ ] AI correctly scores `NetSuite`/`Sage` mentions as `intent_score >= 8` and `is_hot_lead = true`
- [ ] Dashboard loads in under 2 seconds with 200+ rows
- [ ] Weekly Delta badges render correctly on Companies page
- [ ] All filters work simultaneously without page reload
- [ ] No API keys in committed code (`git grep -i "sk-\|service_role"` returns nothing)
- [ ] Seed data makes the dashboard look compelling for a recruiter demo
- [ ] Next.js dashboard deployed and publicly accessible on Vercel
- [ ] n8n running on DigitalOcean — URL documented in README
- [ ] SerpApi usage confirmed at `serpapi.com/dashboard` — within free tier

---

## SECTION 15: README NARRATIVE (for recruiter-facing README.md)

When Claude Code generates `README.md`, use this exact intro paragraph:

> SignalPulse AI monitors corporate job postings daily and uses AI to identify "buying window" signals — moments when a company's hiring patterns reveal they are about to invest in new software. A company posting "NetSuite Implementation Manager" is telling Ramp, Brex, and Stripe: come talk to us now. Built as a full-stack data engineering portfolio project: automated ingestion via n8n, structured enrichment via GPT-4o-mini, PostgreSQL storage in Supabase, and a production-grade Next.js 14 dashboard.

**Technical talking points for the README:**
- Supabase: schema with indexes, views, stored procedures, and FK relationships — not just CRUD
- n8n: 16-node workflow with pre-AI filtering, batching, JSON validation, and graceful error handling
- SerpApi: per-search credit model — entire ingestion layer runs on the free tier at MVP scale
- Next.js 14: App Router, server components, API routes, client-side filtering with zero re-fetch on sort
- Docker Compose: portable, reproducible n8n deployment on $6/mo DigitalOcean Droplet

---

---

# MEMORY LOG

> Claude Code appends to this section after every completed phase.
> Never delete entries. Most recent entry at the top.
> If this section is empty, no phases have been completed yet — start with Phase 1.
> Human-owned phases should also be logged here when complete, either by Claude Code (after receiving handoff items) or by the human directly.

---
### [2026-04-08] — Signal Categories + Pipeline Fixes — Completed by: 👤 Human + 🤖 Claude Code

**What was built:**
- Added 8 new search queries to `Code in JavaScript` node covering Sales, Security, Operations, and Infrastructure families
- Updated OpenAI system prompt to be multi-vertical (removed ERP/Payroll specificity)
- Updated OpenAI user prompt to return `job_family` as part of JSON output
- Updated `Edit Fields` node to read `job_family` dynamically from OpenAI output instead of hardcoded "Finance"
- Added `date_posted:today` chips filter to SerpApi node
- Replaced `dbt analytics engineer` query with `Databricks data engineer` (zero results fix)

**Key fixes made:**
- `external_job_id` null constraint: added title+company_name fallback expression in `Edit Fields`
- `job_family` CHECK constraint violation: OpenAI was returning pipe-separated values ("Finance | Operations") — fixed via prompt update forcing single value
- `job_family` capitalization: added `.charAt(0).toUpperCase()` expression in `Edit Fields`
- `Map Tags to Job ID` company_id: was referencing dead node `$('Postgres')` — fixed to `$('Get a row').item.json.company_id`
- `Create a row` context loss: all field expressions updated to `$node["Edit Fields"].json.*`

**Current query set (Code in JavaScript node):**
- NetSuite Implementation Manager (Finance)
- Head of Finance automation (Finance)
- ERP Project Manager (Finance)
- Business Systems Analyst NetSuite (Finance)
- Snowflake data engineer implementation (Infrastructure)
- Databricks data engineer (Infrastructure)
- Okta implementation engineer (Security)
- CrowdStrike deployment administrator (Security)
- Salesforce implementation administrator (Sales)
- HubSpot CRM implementation (Sales)
- Workday implementation consultant (Operations)
- Rippling HRIS implementation (Operations)

**Current database state:**
- 66 total signals
- Finance: 42, Sales: 11, Operations: 10, Security: 2, Other: 1
- Infrastructure: 0 (Snowflake/Databricks queries not yet returning fresh results)
- Tags missing on some rows inserted before Map Tags fix — self-correcting going forward

**Known issues:**
- Some rows have no tags due to the `Postgres` node reference bug that existed before fix
- Infrastructure family not yet populating — Snowflake/Databricks queries may need refinement
- Companies page all Finance until non-Finance data accumulates over coming days
- `dbt analytics engineer` query returns 0 SerpApi results — replaced with Databricks

**Next step:**
- Let pipeline accumulate data for several days
- Begin Priority 2: Explainable Scoring OR Priority 3: Market Intelligence Tab


### [2026-04-06] — Full Deployment Complete + Feature Roadmap — Completed by: 👤 Human + 🤖 Claude Code

**Current State — Everything Live:**
- Dashboard: https://signalpulse-six.vercel.app
- GitHub: https://github.com/chase-sinclair/signalpulse
- n8n (DigitalOcean): http://159.89.185.13:5678
- Supabase: https://qolusthqrhcontdvfvyx.supabase.co

**DigitalOcean Droplet:**
- IP: `159.89.185.13`
- OS: Ubuntu 22.04 LTS
- Size: $6/mo (1GB RAM / 1 CPU / NYC3)
- n8n running via Docker Compose at `/opt/signalpulse/docker/`
- Both workflows published and active

**n8n Workflows (DO instance):**

Workflow 1: `SignalPulse AI` (daily scraper)
- 3 SerpApi queries: CFO_Signal, ERP_Signal, Payroll_Signal
- Smart Filter drops recruiters + stale postings
- OpenAI gpt-4o-mini extracts job_family, tech_stack, intent_score, sales_hook
- Prompt includes job title inference rule (tags NetSuite from title even if not in description body)
- Postgres node (Session pooler) upserts companies before job_signals
- Get a row node fetches signal UUID after Create a row (Bridge Node fix)
- Map Tags to Job ID passes: tech_stack, id (signal UUID), company_id (company UUID)
- Insert Tags to DB upserts signal_tags
- Schedule: 6 AM daily

Workflow 2: `signalpulse_snapshots`
- Schedule: Sunday 23:00 (`0 23 * * 0`)
- HTTP Request POST to Supabase RPC `refresh_weekly_snapshots`
- Authentication: Predefined Supabase credential

**n8n Credentials (DO instance):**
- SerpApi: Header Auth (All HTTP requests)
- OpenAI: OpenAI API credential
- Supabase: Supabase API credential (for Supabase nodes)
- Postgres account: Session pooler connection
  - Host: `aws-0-us-east-1.pooler.supabase.com`
  - Port: `5432`
  - User: `postgres.qolusthqrhcontdvfvyx`
  - Database: `postgres`
  - NOTE: Use Session pooler (NOT Transaction pooler, NOT Direct connection) — IPv6 issue affects both other methods from DigitalOcean

**Current Database State:**
- 37 job signals
- 46 companies
- 37 signals with company_id populated
- weekly_snapshots populated for week of 2026-03-23
- signal_tags populated with real tool names (NetSuite, Oracle, SAP, Workday, etc.)

**Known Issues / Watch Out For:**
- Local n8n (Windows Docker) kept as backup but workflow may be lost — use DO instance as primary
- `N8N_SECURE_COOKIE=false` must be in docker-compose.yml environment section (not just .env) for local access via HTTP
- The `refresh_weekly_snapshots` stored procedure uses `v_week_start` variable name (not `week_start`) to avoid SQL ambiguity — do not revert this
- Companies page only shows delta when there are 2+ weeks of snapshot data — currently only 1 week populated

**Supabase Schema Modifications (from original Section 4):**
- `posted_at` is TEXT (not TIMESTAMPTZ) — SerpApi returns relative strings
- `is_hot_lead` threshold is >= 9 (not >= 8)
- `signals_with_tags` view uses explicit array_agg with CASCADE
- `refresh_weekly_snapshots` function uses `v_week_start` variable

---

**NEXT PHASE: Feature Development**

The following features have been planned. A new Claude Code session should pick up from here.

**Priority 1 — Signal Categories (High Impact, Low Effort)**
Add 5 new SerpApi query categories to the Code in JavaScript node:
- ERP Migration: `NetSuite OR "Sage Intacct" implementation`
- Payroll Scaling: `HRIS OR Payroll "implementation manager"`
- Data Stack: `Snowflake OR dbt OR "data warehouse" engineer`
- Security Scaling: `CISO OR "SOC 2" OR Okta implementation`
- Sales Infrastructure: `Salesforce OR HubSpot implementation`
- Cloud Migration: `AWS OR Azure "migration architect"`

This fixes the single-bar TrendChart and makes the product multi-vertical.

**Priority 2 — Explainable Scoring (High Resume Value)**
Replace the single `intent_score` with a scoring breakdown object. Each signal should have:
- `score_components` JSONB column in job_signals
- Breakdown: title_match (0-3), tech_stack_match (0-3), seniority_signal (0-2), urgency_signal (0-2)
- Dashboard shows expandable scoring breakdown per lead
- Highlights "feature engineering" for data/RevOps resume targeting

**Priority 3 — Market Intelligence Tab**
New page at `/intelligence`:
- Which industries are seeing most ERP migrations this week
- Which tech tools are most frequently appearing in signals
- Hiring velocity chart: companies posting multiple signals in short windows
- Powered by existing data — pure frontend + SQL aggregation work

**Priority 4 — Visualization Improvements**
- Sparkline per company card showing last 4 weeks of signal count
- Hiring velocity alert: badge when company posts 3+ signals in 7 days
- Better empty states and loading animations

**Priority 5 — Slack/Email Alerts**
- n8n node after Insert Tags: if is_hot_lead = true, send Slack message
- Easy to add, makes product feel like real sales tool

**Priority 6 — Company Enrichment**
- When company inserted, call Clearbit free tier for firmographics
- Add employee_count, funding_stage, industry to companies table
- Enables filter: "Series B, 50-200 employees" — real sales qualification

**Next step for new Claude Code session:**
Begin Priority 1 (Signal Categories) — update the Code in JavaScript node in DO n8n to add 5 new queries, update the job_family CHECK constraint to include new categories, verify TrendChart renders multiple bars.

**What was fixed:**
- **Bridge Node:** Replaced `{{ $('Create a row').item.json.id }}` with a new `Get a row` node that looks up the signal UUID by `external_job_id`. This fixes `signal_id = null` on tag insertion for duplicate signals.
- **OpenAI prompt:** Added instruction to infer software from job title even when not explicitly listed in description body. Tags now correctly extract NetSuite, SAP, Workday from job titles.
- **Workflow order:** `Create a row` → `Get a row` (lookup by external_job_id) → `Map Tags to Job ID` → `Split Tech Stack Tags` → `Insert Tags to DB`

**Verified working:**
```
Crowe LLP             | NetSuite Implementation Manager                      | ["NetSuite"]
Element Solutions Inc | Americas Controller — Finance Automation Leader      | ["NetSuite"]
EY                    | Finance Automation and Tech Implementation Manager   | ["ADP","Concur","Coupa","NetSuite","Workday"]
GE Vernova            | NAM CFO - Grid Automation                            | ["Oracle"]
PwC                   | NetSuite Product Implementation Consultant - Manager | ["BlackLine","OneStream RCM","Oracle ARCS","Tagetik","Trintech"]
```

**Remaining items:**
- Company upsert node still missing — `company_id` null on all signals — fix on DigitalOcean
- DigitalOcean deployment pending — n8n running locally only
- Companies page will populate once company upsert is fixed and snapshot workflow runs

**Next step:**
- Project is complete for portfolio — dashboard live at https://signalpulse-six.vercel.app
- When ready: set up DigitalOcean, add Postgres upsert node for companies table, workflow runs automatically at 6 AM daily

**What was built:**
- `lib/types.ts` — all interfaces written from live data sample, `posted_at` as string, `is_hot_lead` threshold >= 9
- `lib/supabase.ts` — browser, server, and admin clients
- `lib/utils.ts` — relativeTime, truncate, companyInitials, mean, formatDelta
- `app/api/signals/route.ts` — filtered server-side query via Supabase SSR client
- `app/api/tags/route.ts` — distinct tags from signal_tags, data-driven
- 6 UI components: IntentScoreBadge, WeeklyDeltaBadge, KpiCard, TrendChart, FilterSidebar, LeadsTable
- Main dashboard page — KPI row, filter sidebar, leads table, trend chart
- Companies page — weekly delta cards with empty state
- Error boundary, custom 404, mobile responsive sidebar
- `docker/docker-compose.yml`, `docker/setup.sh`, `README.md`, `vercel.json`

**Live URLs:**
- Production dashboard: https://signalpulse-six.vercel.app
- GitHub repo: https://github.com/chase-sinclair/signalpulse

**Known issues resolved during deployment:**
- `vercel.json` had `@secret` references generated by Claude Code — removed env section entirely
- Vercel UI secret-linking bug — worked around using Vercel CLI
- `CLAUDE.md` overwritten by `create-next-app` — restored from session context
- `company_id` null on all signals — backfill SQL run, Postgres node not yet added to n8n workflow (Windows Docker IPv6 networking blocked local testing)
- `signal_tags` signal_id null — Bridge Node expression needs updating to `{{ $('Create a row').item.json.id }}`

**Remaining items (not blockers for portfolio):**
- Phase 6a: DigitalOcean Droplet for always-on n8n — not yet deployed
- n8n Postgres node for company upsert — will work cleanly on Linux (DigitalOcean)
- Companies page will populate automatically once n8n runs on DigitalOcean with fixed workflow
- Weekly snapshot will self-populate every Sunday once pipeline is live

**Next step:**
- Project is complete for portfolio purposes — dashboard is live at https://signalpulse-six.vercel.app
- When ready to finalize: set up DigitalOcean Droplet, run `docker/setup.sh`, fix Bridge Node expression in n8n, add Postgres upsert node for companies table

**What was built:**
- Supabase project live at `https://qolusthqrhcontdvfvyx.supabase.co`
- All tables created: `companies`, `job_signals`, `signal_tags`, `weekly_snapshots`
- `signals_with_tags` view confirmed working — returns `tech_stack` as a proper JSON array `[]`
- `refresh_weekly_snapshots` stored procedure created
- n8n 16-node daily scraper workflow built manually and verified
- n8n weekly snapshot workflow built
- Live data confirmed in DB — hot leads populating correctly

**Schema modifications from Section 4 (IMPORTANT — affects types):**
- `posted_at` column type changed from `TIMESTAMPTZ` → `TEXT` to support SerpApi relative strings (e.g., "4 days ago")
- `is_hot_lead` threshold set to `>= 9` in n8n (not `>= 8` as originally specified)
- `signals_with_tags` view dropped and recreated with explicit `array_agg` CASCADE logic
- `intent_score` constraint confirmed as `1-10`

**Verified live data sample (`SELECT * FROM signals_with_tags LIMIT 1`):**
```json
{
  "id": "025c5f9f-bae0-4e0a-98ee-8a96f16453df",
  "external_job_id": "https://www.google.com/search?ibp=htl;jobs...",
  "company_id": null,
  "company_name": "NetSuite",
  "job_title": "Project Manager - NetSuite, ERP System, Implementation",
  "raw_description": "[Truncated]",
  "job_url": "https://www.google.com/search?ibp=htl;jobs...",
  "job_family": "Finance",
  "intent_score": 10,
  "sales_hook": "The role directly involves managing the delivery of Oracle NetSuite Professional Services implementations...",
  "is_hot_lead": true,
  "posted_at": "7 days ago",
  "created_at": "2026-03-27 18:42:55.729303+00",
  "tech_stack": []
}
```

**Verified 3-row JOIN query confirming tags + companies:**
```
SystemsAccountants     | NetSuite Project Manager                        | 10 | true  | [Epicor, Infor, Microsoft Dynamics, NetSuite, Oracle, SAP]
Element Solutions Inc  | Americas Controller — Finance Automation Leader | 10 | true  | [Order Management, SAP]
Aqua Finance           | Manager, Process & Automation Strategy          | 7  | false | [NetSuite]
```

**Verified n8n final node output (Insert Tags to DB) — sample:**
- `signal_tags` rows populating correctly with `id`, `signal_id`, `tag`
- Multiple tags per signal confirmed (signal `00f08a8e` has 6 tags)
- Tag variety confirmed: NetSuite, Oracle, SAP, Microsoft Dynamics, Celigo, Shopify, Avalara, Epicor, Infor

**Issues resolved during phases 1 & 2:**
- Flag 1 (missing tech_stack): Fixed via Bridge Node in n8n re-attaching AI tags to Supabase UUID after upsert
- Flag 2 (vendor false positives): Fixed via Source Filter layer excluding jobs where company_name matches software vendor names

**Connection strings (public — safe to use in frontend):**
- `NEXT_PUBLIC_SUPABASE_URL`: `https://qolusthqrhcontdvfvyx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvbHVzdGhxcmhjb250ZHZmdnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTQ3NDgsImV4cCI6MjA5MDEzMDc0OH0.ioN5BnJVn_NWl8Y9xfL1WX3KHi93CP6B-A8261tDVZ0`
- `SUPABASE_SERVICE_ROLE_KEY`: Not yet in `.env.local` — Claude Code must scaffold Next.js project first, then prompt user to create `.env.local` and add this key before running build

**Key decisions made:**
- Tag filter sidebar must be data-driven (pull distinct tags from DB) — not hardcoded — because live tags include niche tools like Celigo, Avalara, Epicor not in the original list
- `posted_at` is TEXT, not a parseable date — display as-is, no date math in frontend
- `is_hot_lead` boolean from DB is the source of truth — do not recompute from `intent_score >= 9` client-side

**Next step:**
- Claude Code owns Phase 4a — scaffold Next.js project with `npx create-next-app@latest`, then prompt user to create `.env.local` with all three env vars, then write `lib/types.ts`, `lib/supabase.ts`, `lib/utils.ts` from the verified live data shape above

---
*End of CLAUDE.md — SignalPulse AI v1.3*
