# **Live demo:** https://signalpulse-six.vercel.app

# SignalPulse AI — B2B Sales Intelligence Engine

> SignalPulse AI monitors corporate job postings daily and uses AI to identify "buying window" signals — moments when a company's hiring patterns reveal they are about to invest in new software. A company posting "NetSuite Implementation Manager" is telling Ramp, Brex, and Stripe: come talk to us now. Built as a full-stack data engineering portfolio project: automated ingestion via n8n, structured enrichment via GPT-4o-mini, PostgreSQL storage in Supabase, and a production-grade Next.js 16 dashboard.

---

## What it does

Every morning at 6 AM, an n8n workflow fires three targeted Google Jobs queries via SerpApi, runs each result through a GPT-4o-mini prompt that extracts job family, tech stack mentions, a 1–10 intent score, and a cold-email hook, then upserts everything into Supabase. The Next.js dashboard gives a sales team a live view of who is hiring, what tools they're adopting, and how hot each lead is — updated daily without manual effort.

**Example signal:** A mid-sized manufacturing company posts "ERP Implementation Manager (NetSuite)." SignalPulse scores this a 10/10, marks it a hot lead, and generates a sales hook: *"Your search for a NetSuite Implementation Manager signals a major finance transformation — the right spend management platform could save your team 20+ hours a week."*

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 16 (App Router) | Server components + API routes in one repo; signals React fluency to recruiters |
| **Database** | Supabase (PostgreSQL) | Schema with indexes, views, stored procedures, and FK relationships — not just CRUD |
| **Automation** | n8n (self-hosted via Docker) | Visual workflow builder; the learning goal for this project |
| **AI Enrichment** | OpenAI GPT-4o-mini | Cheapest capable model for structured JSON extraction |
| **Job Data** | SerpApi (Google Jobs) | Per-search pricing — entire ingestion layer runs on the free tier at MVP scale |
| **Deployment** | Vercel + DigitalOcean | Next.js on Vercel; n8n on a $6/mo Droplet via Docker Compose |

---

## Architecture

```
SerpApi (Google Jobs)
       │  3 queries/day via n8n schedule
       ▼
  n8n Workflow (16 nodes)
  ├─ Smart filter: drops recruiters + stale postings before AI
  ├─ Batch of 5 → GPT-4o-mini (structured JSON)
  ├─ Validation: type-checks every AI field before DB write
  └─ Upsert → Supabase (companies → job_signals → signal_tags)
       │
       ▼
  Supabase (PostgreSQL)
  ├─ signals_with_tags view: aggregates tags as array per signal
  └─ refresh_weekly_snapshots(): stored proc, called every Sunday
       │
       ▼
  Next.js Dashboard
  ├─ /api/signals  — filtered, server-side query via Supabase SSR client
  ├─ /api/tags     — distinct tags from signal_tags for sidebar
  ├─ /            — KPI row + filter sidebar + leads table + trend chart
  └─ /companies   — weekly delta cards sorted by signal velocity
```

---

## Technical highlights

**Supabase:** The schema goes beyond basic CRUD. `signal_tags` is a proper junction table (not a TEXT array) enabling indexed tag queries. `signals_with_tags` is a PostgreSQL view that re-aggregates tags per signal using `array_agg`. `refresh_weekly_snapshots()` is a stored procedure called by n8n via Supabase RPC — computes weekly signal counts, avg intent scores, and dominant job family per company, upserted in one transaction.

**n8n workflow (16 nodes):** The pipeline has a pre-AI filter stage that drops recruiter postings and stale results before a single OpenAI token is spent, keeping costs at $0 on the free tier. Results are batched in groups of 5 to respect rate limits. A validation node type-checks every AI-generated field and sanitizes `intent_score` to the 1–10 range before writing to Postgres. A bridge node re-fetches the Supabase-assigned UUID after upsert to correctly populate `company_id` on each signal.

**Next.js 16:** The API route at `/api/signals` uses the `@supabase/ssr` server client (async `cookies()` pattern for Next.js 15+). All filtering — job family, intent score, tech stack tags, hot-lead flag, company search — happens server-side. Client-side tag filtering is the only post-processing step, bounded to 200 rows. KPI values and trend chart data are computed client-side from the fetched array — zero extra network requests.

**SerpApi credit budget:** Three queries per day = 90 credits/month. Free tier is 100 credits/month. The entire ingestion layer runs at $0/month at MVP scale.

---

## Local setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/signalpulse.git
cd signalpulse
npm install

# 2. Environment variables
cp .env.local.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Run the dev server
npm run dev
# → http://localhost:3000
```

The dashboard works immediately against the live Supabase instance. No local database needed.

---

## n8n deployment (DigitalOcean)

```bash
# On a fresh Ubuntu 22.04 Droplet ($6/mo)
bash docker/setup.sh
```

The script installs Docker, clones the repo, prompts for secrets, and starts n8n via Docker Compose. Once running, import `n8n/signalpulse_daily.json` and `n8n/signalpulse_snapshots.json` from the n8n UI, activate both, and the pipeline runs itself.

---

## Vercel deployment

1. Push to GitHub
2. Import the repo in [vercel.com](https://vercel.com)
3. Add environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← server-only, never public
4. Deploy

---

## Database schema (key objects)

| Object | Type | Purpose |
|---|---|---|
| `companies` | Table | One row per tracked company |
| `job_signals` | Table | One row per job posting (deduped on `external_job_id`) |
| `signal_tags` | Table | Junction table — one row per (signal, tool) pair |
| `weekly_snapshots` | Table | Aggregated weekly stats per company |
| `signals_with_tags` | View | Re-aggregates tags as array; queried by the API route |
| `refresh_weekly_snapshots` | Function | Stored proc called by n8n RPC every Sunday |

---

## Project status

| Phase | Status |
|---|---|
| Supabase schema + seed | ✅ |
| n8n daily scraper (16 nodes) | ✅ |
| n8n weekly snapshots | ✅ |
| Next.js API routes | ✅ |
| Dashboard UI | ✅ |
| DigitalOcean n8n deployment | 🔧 In progress |
| Vercel deployment | 🔧 In progress |

---

*Built by a solo developer learning n8n and Supabase. Target audience: hiring teams at Ramp, Stripe, Brex, Snowflake, and AWS.*
