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

// Signals that a company is actively adopting or transforming — checked in both
// title and description. These are the strongest buying window indicators.
export const IMPL_KEYWORDS = [
  // Explicit implementation language
  'implementation', 'implementing', 'migrate', 'migration', 'rollout',
  'deployment', 'deploying',
  // Transformation / adoption language (user-identified as high signal)
  'transformation', 'transform', 'transforming',
  'adoption', 'adopting',
  'new system', 'new platform', 'new solution', 'new erp', 'new crm',
  'go-live', 'go live',
  // Change / modernisation signals
  'overhaul', 'modernization', 'modernisation', 'modernizing',
  'consolidation', 'consolidating',
  'integration project', 'system change', 'system upgrade',
  'phase 1', 'phase one',
];

export const URGENCY_TERMS = [
  'go-live', 'go live', 'cutover', 'starting now',
  'immediately', 'urgent', 'as soon as possible', 'asap',
];

export const REPLACEMENT_SIGNALS = [
  'replacing', 'migrate from', 'migrating from', 'transition from',
  'moving away from', 'new role', 'newly created', 'first dedicated',
  'greenfield', 'build from scratch', 'new implementation', 'launch',
];

// Private — used for seniority label only, not scoring
const SENIORITY_HIGH = ['vp', 'director', 'head of', 'chief', 'cfo', 'cto', 'cio', 'controller', 'president'];
const SENIORITY_MID  = ['manager', 'senior', 'sr.', 'lead', 'principal'];
const SENIORITY_LOW  = ['analyst', 'coordinator', 'associate', 'intern', 'junior'];

const MAINTENANCE_TERMS = ['maintain', 'support existing', 'ongoing support', 'business as usual', 'bau'];

// ── Input shape ───────────────────────────────────────────────────────────────
type ScoringInput = {
  job_title:       string;
  raw_description: string | null;
  tech_stack:      string[];
  created_at:      string;  // ISO string — used for recency scoring
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

  // implementation_signal (0-3):
  // Checks both title and description. Transformation/adoption language is treated
  // as equally strong to traditional implementation keywords — it's a clear signal
  // that the company is actively changing systems.
  const titleHasTool = NAMED_TOOLS.some(t => title.includes(t));
  const titleHasImpl = IMPL_KEYWORDS.some(k => title.includes(k));
  const descHasImpl  = IMPL_KEYWORDS.some(k => desc.includes(k));

  let implScore: number;
  let implReason: string;
  if (titleHasTool && titleHasImpl) {
    implScore  = 3;
    implReason = 'Named tool + transformation/impl keyword in title';
  } else if (titleHasImpl) {
    implScore  = 2;
    implReason = 'Transformation/impl keyword in title';
  } else if (titleHasTool || descHasImpl) {
    // Named tool in title alone, or impl/transform signal found in description
    implScore  = 1;
    implReason = titleHasTool
      ? 'Named tool in title — no impl/transform keyword'
      : 'Transformation/impl keyword in description (not title)';
  } else {
    implScore  = 0;
    implReason = 'No implementation or transformation signal found';
  }

  // tool_specificity (0-3):
  // Measures how specifically this role maps to a known tool.
  // A named tool in BOTH the tech_stack[] AND the title is the strongest signal
  // (dedicated role). Tool in stack only = 2. No tools = 0.
  const namedToolsInStack = signal.tech_stack.filter(t =>
    NAMED_TOOLS.includes(t.toLowerCase())
  );
  const stackToolInTitle = namedToolsInStack.some(t => title.includes(t.toLowerCase()));

  let stackScore: number;
  let stackReason: string;
  if (namedToolsInStack.length > 0 && stackToolInTitle) {
    stackScore  = 3;
    stackReason = `${namedToolsInStack[0]} in both title and tech stack — dedicated role`;
  } else if (namedToolsInStack.length > 0) {
    stackScore  = 2;
    stackReason = `${namedToolsInStack.length} tool${namedToolsInStack.length > 1 ? 's' : ''} in tech stack: ${namedToolsInStack.slice(0, 3).join(', ')}`;
  } else if (signal.tech_stack.length > 0) {
    // Tools found but not in our NAMED_TOOLS list
    stackScore  = 1;
    stackReason = `Tech stack identified but no tracked tools: ${signal.tech_stack.slice(0, 2).join(', ')}`;
  } else {
    stackScore  = 0;
    stackReason = 'No tools identified in tech stack';
  }

  // buying_window (0-2):
  // Maintenance/support roles are explicitly excluded — they're not buying signals.
  // Replacement and urgency language confirms an active project, not just a backfill.
  const hasMaintenance = MAINTENANCE_TERMS.some(t => desc.includes(t));
  const allBuyingTerms = [...URGENCY_TERMS, ...REPLACEMENT_SIGNALS];
  const buyingMatches  = allBuyingTerms.filter(t => desc.includes(t));

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
    windowReason = 'No active buying signals in description';
  }

  // recency (0-2): fresh signals are more actionable — a lead from yesterday
  // is worth more than one from three weeks ago. Always available, no truncation risk.
  const ageHours = (Date.now() - new Date(signal.created_at).getTime()) / 3_600_000;
  let recencyScore: number;
  let recencyReason: string;
  if (ageHours < 72) {
    recencyScore  = 2;
    recencyReason = 'Added < 3 days ago — prime outreach window';
  } else if (ageHours < 336) {
    recencyScore  = 1;
    recencyReason = 'Added 3–14 days ago — follow-up window';
  } else {
    recencyScore  = 0;
    recencyReason = 'Added 14+ days ago — potentially stale';
  }

  return {
    implementation_signal: { score: implScore,     max: 3, reason: implReason },
    tool_specificity:      { score: stackScore,    max: 3, reason: stackReason },
    buying_window:         { score: windowScore,   max: 2, reason: windowReason },
    recency:               { score: recencyScore,  max: 2, reason: recencyReason },
  };
}

// ── computeIntentScore ────────────────────────────────────────────────────────
// Max: 10 (3 + 3 + 2 + 2).
export function computeIntentScore(components: ScoreComponents): number {
  return (
    components.implementation_signal.score +
    components.tool_specificity.score +
    components.buying_window.score +
    components.recency.score
  );
}
