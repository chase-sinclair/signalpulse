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
