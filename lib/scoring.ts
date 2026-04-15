// Pure scoring functions — no side effects, no Next.js imports.
// These run in the API route to enrich each signal before returning to the client.
import type { ScoreComponents } from '@/lib/types';

// ── Keyword lists ─────────────────────────────────────────────────────────────
export const NAMED_TOOLS = [
  'netsuite', 'workday', 'salesforce', 'hubspot', 'okta', 'crowdstrike',
  'snowflake', 'databricks', 'rippling', 'sap', 'oracle', 'sage intacct',
  'quickbooks', 'dynamics', 'servicenow', 'coupa', 'concur', 'blackline',
  'brex', 'ramp', 'stripe', 'adp', 'kronos', 'workato', 'mulesoft',
  'dbt', 'fivetran', 'looker', 'tableau', 'power bi',
];

export const URGENCY_TERMS = [
  'go-live', 'go live', 'cutover', 'starting now', 'phase 1',
  'immediately', 'urgent', 'as soon as possible', 'asap',
];

export const REPLACEMENT_SIGNALS = [
  'replacing', 'migrate from', 'migrating from', 'transition from',
  'moving away from', 'new role', 'newly created', 'first dedicated',
  'greenfield', 'build from scratch', 'new implementation', 'rollout', 'launch',
];

export const PAIN_POINT_TERMS = [
  'manual', 'spreadsheet', 'excel', 'siloed', 'disconnected',
  'no visibility', 'lack of visibility', 'inefficient', 'error-prone',
  'time-consuming', 'no single source', 'outdated', 'legacy',
  'fragmented', 'inconsistent', 'duplicated', 'ad hoc',
];

// Private — used for seniority label only, not scoring
const SENIORITY_HIGH = ['vp', 'director', 'head of', 'chief', 'cfo', 'cto', 'cio', 'controller', 'president'];
const SENIORITY_MID  = ['manager', 'senior', 'sr.', 'lead', 'principal'];
const SENIORITY_LOW  = ['analyst', 'coordinator', 'associate', 'intern', 'junior'];

const IMPL_KEYWORDS     = ['implementation', 'migration', 'rollout'];
const MAINTENANCE_TERMS = ['maintain', 'support existing', 'ongoing support'];

// ── Input shape ───────────────────────────────────────────────────────────────
type ScoringInput = {
  job_title:       string;
  raw_description: string | null;
  tech_stack:      string[];
};

// ── computeSeniorityLabel ─────────────────────────────────────────────────────
// Not part of the score — surfaced in the UI to enrich the sales hook context.
export function computeSeniorityLabel(job_title: string): 'EXEC' | 'SR' | 'IC' | null {
  const title = job_title.toLowerCase();
  if (SENIORITY_HIGH.some(k => title.includes(k))) return 'EXEC';
  if (SENIORITY_MID.some(k => title.includes(k)))  return 'SR';
  if (SENIORITY_LOW.some(k => title.includes(k)))  return 'IC';
  return null;
}

// ── computeScoreComponents ────────────────────────────────────────────────────
export function computeScoreComponents(signal: ScoringInput): ScoreComponents {
  const title = signal.job_title.toLowerCase();
  const desc  = (signal.raw_description ?? '').toLowerCase();

  // implementation_signal: does the job title signal an active implementation?
  // Named tool in title + implementation keyword = strongest possible title signal.
  const titleHasTool = NAMED_TOOLS.some(t => title.includes(t));
  const titleHasImpl = IMPL_KEYWORDS.some(k => title.includes(k));
  let implScore: number;
  let implReason: string;
  if (titleHasTool && titleHasImpl) {
    implScore  = 3;
    implReason = 'Named tool + implementation keyword in title';
  } else if (titleHasImpl) {
    implScore  = 2;
    implReason = 'Implementation keyword in title, no named tool';
  } else if (titleHasTool) {
    implScore  = 1;
    implReason = 'Named tool in title, no implementation keyword';
  } else {
    implScore  = 0;
    implReason = 'No named tool or implementation keyword in title';
  }

  // tool_specificity: use the curated tech_stack[] extracted by OpenAI — more
  // reliable than scanning raw text, which double-counts repeated mentions.
  const stackScore  = Math.min(3, signal.tech_stack.length) as 0 | 1 | 2 | 3;
  const stackReason = signal.tech_stack.length === 0
    ? 'No tools identified in description'
    : `${signal.tech_stack.length} tool${signal.tech_stack.length > 1 ? 's' : ''} identified: ${signal.tech_stack.slice(0, 3).join(', ')}`;

  // buying_window: active buying signals — timeline commitments, replacement language,
  // and new-role indicators are stronger than vague urgency buzzwords.
  const hasMaintenance  = MAINTENANCE_TERMS.some(t => desc.includes(t));
  const allBuyingTerms  = [...URGENCY_TERMS, ...REPLACEMENT_SIGNALS];
  const buyingMatches   = allBuyingTerms.filter(t => desc.includes(t));
  let windowScore: number;
  let windowReason: string;
  if (hasMaintenance) {
    windowScore  = 0;
    windowReason = 'Maintenance/support role — not a buying signal';
  } else if (buyingMatches.length >= 2) {
    windowScore  = 2;
    windowReason = `${buyingMatches.length} buying signals: ${buyingMatches.slice(0, 2).join(', ')}`;
  } else if (buyingMatches.length === 1) {
    windowScore  = 1;
    windowReason = `1 buying signal: ${buyingMatches[0]}`;
  } else {
    windowScore  = 0;
    windowReason = 'No buying window signals found';
  }

  // pain_points: pre-purchase indicators — language describing problems that
  // software solves. Truncated descriptions will naturally score lower here,
  // but presence is still meaningful.
  const painMatches = PAIN_POINT_TERMS.filter(t => desc.includes(t));
  let painScore: number;
  let painReason: string;
  if (painMatches.length >= 3) {
    painScore  = 2;
    painReason = `${painMatches.length} pain signals: ${painMatches.slice(0, 3).join(', ')}`;
  } else if (painMatches.length > 0) {
    painScore  = 1;
    painReason = `${painMatches.length} pain signal${painMatches.length > 1 ? 's' : ''}: ${painMatches.join(', ')}`;
  } else {
    painScore  = 0;
    painReason = 'No pain point language found';
  }

  return {
    implementation_signal: { score: implScore,   max: 3, reason: implReason },
    tool_specificity:      { score: stackScore,  max: 3, reason: stackReason },
    buying_window:         { score: windowScore, max: 2, reason: windowReason },
    pain_points:           { score: painScore,   max: 2, reason: painReason },
  };
}

// ── computeIntentScore ────────────────────────────────────────────────────────
export function computeIntentScore(components: ScoreComponents): number {
  return (
    components.implementation_signal.score +
    components.tool_specificity.score +
    components.buying_window.score +
    components.pain_points.score
  );
}
