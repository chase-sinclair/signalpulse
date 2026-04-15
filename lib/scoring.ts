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
  'go-live', 'go live', 'migration', 'cutover', 'starting now',
  'new implementation', 'phase 1', 'rollout', 'launch', 'replacing',
  'immediately', 'urgent', 'as soon as possible', 'asap',
];

// Private — used only within this module
const IMPL_KEYWORDS    = ['implementation', 'migration', 'rollout'];
const SENIORITY_HIGH   = ['vp', 'director', 'head of', 'chief', 'cfo', 'cto', 'cio', 'controller', 'president'];
const SENIORITY_MID    = ['manager', 'senior', 'sr.', 'lead', 'principal'];
const SENIORITY_LOW    = ['analyst', 'coordinator', 'associate', 'intern', 'junior'];
const MAINTENANCE_TERMS = ['maintain', 'support existing', 'ongoing support'];

// ── Input shape ───────────────────────────────────────────────────────────────
type ScoringInput = {
  job_title: string;
  raw_description: string | null;
  tech_stack: string[];
};

// ── computeScoreComponents ────────────────────────────────────────────────────
export function computeScoreComponents(signal: ScoringInput): ScoreComponents {
  const title = signal.job_title.toLowerCase();
  const desc  = (signal.raw_description ?? '').toLowerCase();

  // title_match: does the job title signal an active implementation?
  const titleHasTool = NAMED_TOOLS.some(t => title.includes(t));
  const titleHasImpl = IMPL_KEYWORDS.some(k => title.includes(k));
  let titleScore: number;
  let titleReason: string;
  if (titleHasTool && titleHasImpl) {
    titleScore  = 3;
    titleReason = 'Named tool + implementation keyword in title';
  } else if (titleHasImpl) {
    titleScore  = 2;
    titleReason = 'Implementation keyword in title, no named tool';
  } else if (titleHasTool) {
    titleScore  = 1;
    titleReason = 'Named tool in title, no implementation keyword';
  } else {
    titleScore  = 0;
    titleReason = 'No named tool or implementation keyword';
  }

  // stack_match: how many named tools appear in the job description?
  const toolsInDesc = NAMED_TOOLS.filter(t => desc.includes(t));
  const stackScore  = Math.min(3, toolsInDesc.length) as 0 | 1 | 2 | 3;
  const stackReason = toolsInDesc.length === 0
    ? 'No named tools in description'
    : `${toolsInDesc.length} tool${toolsInDesc.length > 1 ? 's' : ''} mentioned: ${toolsInDesc.slice(0, 3).join(', ')}`;

  // seniority: budget authority correlates with title level
  let seniorityScore: number;
  let seniorityReason: string;
  if (SENIORITY_HIGH.some(k => title.includes(k))) {
    seniorityScore  = 2;
    seniorityReason = 'Executive or director-level title';
  } else if (SENIORITY_MID.some(k => title.includes(k))) {
    seniorityScore  = 1;
    seniorityReason = 'Manager or senior-level title';
  } else if (SENIORITY_LOW.some(k => title.includes(k))) {
    seniorityScore  = 0;
    seniorityReason = 'Analyst or junior-level title';
  } else {
    seniorityScore  = 0;
    seniorityReason = 'No seniority signal in title';
  }

  // urgency: maintenance roles are not buying signals; active deployments are
  const hasMaintenance  = MAINTENANCE_TERMS.some(t => desc.includes(t));
  const urgencyMatches  = URGENCY_TERMS.filter(t => desc.includes(t));
  let urgencyScore: number;
  let urgencyReason: string;
  if (hasMaintenance) {
    urgencyScore  = 0;
    urgencyReason = 'Maintenance/support role — not a buying signal';
  } else if (urgencyMatches.length >= 2) {
    urgencyScore  = 2;
    urgencyReason = `${urgencyMatches.length} urgency signals: ${urgencyMatches.slice(0, 2).join(', ')}`;
  } else if (urgencyMatches.length === 1) {
    urgencyScore  = 1;
    urgencyReason = `1 urgency signal: ${urgencyMatches[0]}`;
  } else {
    urgencyScore  = 0;
    urgencyReason = 'No urgency terms found';
  }

  return {
    title_match: { score: titleScore,     max: 3, reason: titleReason },
    stack_match: { score: stackScore,     max: 3, reason: stackReason },
    seniority:   { score: seniorityScore, max: 2, reason: seniorityReason },
    urgency:     { score: urgencyScore,   max: 2, reason: urgencyReason },
  };
}

// ── computeIntentScore ────────────────────────────────────────────────────────
export function computeIntentScore(components: ScoreComponents): number {
  return (
    components.title_match.score +
    components.stack_match.score +
    components.seniority.score +
    components.urgency.score
  );
}
