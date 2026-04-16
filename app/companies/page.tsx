import { createSupabaseServer } from '@/lib/supabase';
import type { Company, WeeklySnapshot } from '@/lib/types';
import CompanyCardGrid from '@/components/CompanyCardGrid';
import type { CompanyCardData } from '@/components/CompanyCardGrid';

// ── Types ─────────────────────────────────────────────────────────────────────
type SnapshotRow = WeeklySnapshot & {
  companies: Company | null;
};

// Re-use the shape exported by CompanyCardGrid so both stay in sync
type CompanyCard = CompanyCardData;

// ── Data fetching ─────────────────────────────────────────────────────────────
async function getCompanyCards(): Promise<CompanyCard[]> {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from('weekly_snapshots')
    .select(`
      id, company_id, week_start, signal_count, avg_intent_score, dominant_family,
      companies ( id, name, domain, industry, employee_range, created_at )
    `)
    .order('week_start', { ascending: false })
    .limit(200); // plenty for grouping

  if (error) {
    console.error('[companies/page] Supabase error:', error.message);
    return [];
  }

  // Supabase infers join relations as arrays without generated types.
  // At runtime, a many-to-one FK join returns a single object — cast via unknown.
  const rows = (data ?? []) as unknown as SnapshotRow[];

  // Group snapshots by company_id, keeping the two most recent weeks.
  // Skip rows where the company name contains ":" — these are department labels
  // (e.g. "Line of Service:Advisory") that got ingested as company records by n8n.
  const byCompany = new Map<string, SnapshotRow[]>();
  for (const row of rows) {
    if (!row.company_id || !row.companies) continue;
    if (row.companies.name.includes(':')) continue;
    const existing = byCompany.get(row.company_id) ?? [];
    if (existing.length < 2) {
      byCompany.set(row.company_id, [...existing, row]);
    }
  }

  const cards: CompanyCard[] = [];
  for (const [, snapshots] of byCompany) {
    const company = snapshots[0].companies!;
    const current  = snapshots[0]; // most recent (ordered desc)
    const previous = snapshots[1]; // week before, if it exists

    cards.push({
      company,
      current_count:   current.signal_count,
      previous_count:  previous?.signal_count ?? 0,
      delta:           current.signal_count - (previous?.signal_count ?? 0),
      dominant_family: current.dominant_family,
      avg_intent_score: current.avg_intent_score,
    });
  }

  // Deduplicate by normalized company name — n8n can create multiple company rows
  // for the same real-world company (e.g. "PwC" and "PwC " with trailing space).
  // When duplicates are found, merge their signal counts into the first occurrence.
  const dedupedMap = new Map<string, CompanyCard>();
  for (const card of cards) {
    const key = card.company.name.trim().toLowerCase();
    if (dedupedMap.has(key)) {
      const existing = dedupedMap.get(key)!;
      existing.current_count  += card.current_count;
      existing.previous_count += card.previous_count;
      existing.delta = existing.current_count - existing.previous_count;
    } else {
      dedupedMap.set(key, { ...card });
    }
  }

  // Sort by delta descending — most-accelerating companies first
  return Array.from(dedupedMap.values()).sort((a, b) => b.delta - a.delta);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function CompaniesPage() {
  const cards = await getCompanyCards();

  return (
    <main style={{ padding: '24px', flex: 1 }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 18,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          Company Trends
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Weekly signal velocity — sorted by acceleration (most active first).
          Snapshots refresh every Sunday at 23:00.
        </p>
      </div>

      {/* Empty state */}
      {cards.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '80px 20px',
            color: 'var(--text-secondary)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 40 }}>📅</span>
          <p style={{ fontSize: 15, fontWeight: 500 }}>No weekly snapshots yet</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360 }}>
            The n8n snapshot workflow runs every Sunday at 23:00 and calls{' '}
            <code
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                background: 'var(--bg-elevated)',
                padding: '1px 5px',
                borderRadius: 3,
                fontSize: 12,
              }}
            >
              refresh_weekly_snapshots()
            </code>
            . Check back after the first Sunday run.
          </p>
        </div>
      ) : (
        /* Client component — owns search state and clickable drill-through */
        <CompanyCardGrid cards={cards} />
      )}
    </main>
  );
}

