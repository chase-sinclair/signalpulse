// ─── Scoring types ──────────────────────────────────────────────────────────
export interface ScoreComponent {
  score: number;
  max: number;
  reason: string;
}

export interface ScoreComponents {
  implementation_signal: ScoreComponent;
  tool_specificity:      ScoreComponent;
  buying_window:         ScoreComponent;
  recency:               ScoreComponent;
}

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
  score_components?: ScoreComponents | null; // Computed by API route — not stored in DB
  computed_score?: number;                    // Sum of score_components — display source of truth
  seniority_label?: 'EXEC' | 'SR' | 'IC' | null; // Computed for UI enrichment — not part of score
  sales_hook: string | null;
  is_hot_lead: boolean;
  posted_at: string | null;   // TEXT in DB — SerpApi relative strings e.g. "4 days ago"
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
