import { createSupabaseServer } from '@/lib/supabase';
import type { Company, WeeklySnapshot } from '@/lib/types';
import WeeklyDeltaBadge from '@/components/WeeklyDeltaBadge';

// ── Types ─────────────────────────────────────────────────────────────────────
type SnapshotRow = WeeklySnapshot & {
  companies: Company | null;
};

interface CompanyCard {
  company: Company;
  current_count: number;
  previous_count: number;
  delta: number;
  dominant_family: string | null;
  avg_intent_score: number | null;
}

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

  // Group snapshots by company_id, keeping the two most recent weeks
  const byCompany = new Map<string, SnapshotRow[]>();
  for (const row of rows) {
    if (!row.company_id || !row.companies) continue;
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

  // Sort by delta descending — most-accelerating companies first
  return cards.sort((a, b) => b.delta - a.delta);
}

// ── Family badge colors (reuse from TrendChart) ───────────────────────────────
const FAMILY_COLORS: Record<string, string> = {
  Finance:        '#818cf8',
  Infrastructure: '#22d3ee',
  Security:       '#fbbf24',
  Sales:          '#34d399',
  Operations:     '#a78bfa',
  Other:          '#94a3b8',
};

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
        /* Card grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {cards.map((card) => (
            <CompanyCardItem key={card.company.id} card={card} />
          ))}
        </div>
      )}
    </main>
  );
}

// ── Card component (server component — no interactivity needed) ───────────────
function CompanyCardItem({ card }: { card: CompanyCard }) {
  const familyColor = card.dominant_family
    ? (FAMILY_COLORS[card.dominant_family] ?? FAMILY_COLORS.Other)
    : FAMILY_COLORS.Other;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Company name + delta */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}
        >
          {card.company.name}
        </span>
        <WeeklyDeltaBadge delta={card.delta} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: 24,
              fontWeight: 500,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            {card.current_count}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            signals this week
          </span>
        </div>

        {card.previous_count > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: 16,
                color: 'var(--text-secondary)',
                lineHeight: 1,
              }}
            >
              {card.previous_count}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              last week
            </span>
          </div>
        )}
      </div>

      {/* Bottom row: family + avg score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {card.dominant_family ? (
          <span
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: 11,
              color: familyColor,
              background: `${familyColor}1a`,
              padding: '2px 7px',
              borderRadius: 3,
            }}
          >
            {card.dominant_family}
          </span>
        ) : (
          <span />
        )}
        {card.avg_intent_score !== null && (
          <span
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}
          >
            avg {Number(card.avg_intent_score).toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
