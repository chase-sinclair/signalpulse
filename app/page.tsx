'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DashboardFilters, JobSignal } from '@/lib/types';
import { mean } from '@/lib/utils';
import FilterSidebar, { DEFAULT_FILTERS } from '@/components/FilterSidebar';
import LeadsTable from '@/components/LeadsTable';
import TrendChart from '@/components/TrendChart';
import KpiCard from '@/components/KpiCard';

// ── Query string builder ──────────────────────────────────────────────────────
function buildQueryString(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  params.set('min_score', String(filters.min_intent_score));
  if (filters.hot_leads_only) params.set('hot', 'true');
  if (filters.search) params.set('search', filters.search);
  filters.job_families.forEach((f) => params.append('family', f));
  filters.tags.forEach((t) => params.append('tag', t));
  return params.toString();
}

// ── KPI skeleton ──────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <>
      <style>{`@keyframes kpi-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animation: `kpi-pulse 1.5s ease-in-out ${i * 100}ms infinite`,
          }}
        >
          <div style={{ height: 10, width: 80, borderRadius: 4, background: 'var(--bg-elevated)' }} />
          <div style={{ height: 28, width: 60, borderRadius: 4, background: 'var(--bg-elevated)' }} />
        </div>
      ))}
    </>
  );
}

// ── Error card ────────────────────────────────────────────────────────────────
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span style={{ color: '#fca5a5', fontSize: 13 }}>
        ⚠ Failed to load signals — {message}
      </span>
      <button
        onClick={onRetry}
        style={{
          background: 'transparent',
          border: '1px solid rgba(239,68,68,0.4)',
          borderRadius: 6,
          color: '#fca5a5',
          fontSize: 12,
          padding: '5px 12px',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ── KPI icons (inline SVG) ────────────────────────────────────────────────────
const IconSignals = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <polyline points="1,8 4,8 5.5,3 7.5,13 9.5,5 11,8 15,8"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconHot = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 14s-5-3-5-7a5 5 0 0110 0c0 4-5 7-5 7z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="7" r="1.5" fill="currentColor"/>
  </svg>
);
const IconScore = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <polygon points="8,2 10,6 14,6.5 11,9.5 11.8,13.5 8,11.5 4.2,13.5 5,9.5 2,6.5 6,6"
      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);
const IconCompanies = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="7" width="5" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9" y="3" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="6" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [signals, setSignals] = useState<JobSignal[]>([]);
  // Global hot-lead count from DB — stays constant regardless of active filters
  const [globalHotLeads, setGlobalHotLeads] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  // Sidebar closed by default on mobile; open on desktop
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Detect mobile on mount and close sidebar by default
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // Fetch distinct tags once on mount — not filter-dependent
  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then((d: { tags?: string[] }) => setAvailableTags(d.tags ?? []))
      .catch((err) => console.error('Failed to fetch tags:', err));
  }, []);

  // Fetch signals whenever filters change
  const fetchSignals = useCallback(async (f: DashboardFilters) => {
    setLoading(true);
    setFetchError(null);
    try {
      const qs = buildQueryString(f);
      const res = await fetch(`/api/signals?${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { signals: JobSignal[]; count: number; hot_leads_total: number };
      setSignals(data.signals ?? []);
      // hot_leads_total is a separate DB count query unaffected by filters —
      // always reflects the true global hot-lead count.
      setGlobalHotLeads(data.hot_leads_total ?? 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to fetch signals:', msg);
      setFetchError(msg);
      setSignals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals(filters);
  }, [filters, fetchSignals]);

  // ── KPI values (computed client-side, no extra fetch) ──────────────────────
  const kpi = useMemo(() => ({
    total:        signals.length,
    // Use global DB count so this KPI doesn't fluctuate when filters are applied.
    // A sales manager expects "Hot Leads" to be a stable baseline, not a filtered subset.
    hotLeads:     globalHotLeads ?? signals.filter((s) => s.is_hot_lead).length,
    avgScore:     mean(signals.map((s) => s.computed_score ?? s.intent_score)),
    companies:    new Set(signals.map((s) => s.company_name)).size,
    // Most-recent created_at — signals are already ordered DESC from the API
    lastRefreshed: signals[0]?.created_at ?? null,
  }), [signals, globalHotLeads]);

  // ── TrendChart data ────────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const counts: Record<string, number> = {};
    signals.forEach((s) => {
      if (s.job_family) counts[s.job_family] = (counts[s.job_family] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count);
  }, [signals]);

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

      {/* ── Mobile overlay — closes sidebar when tapping outside ─────────── */}
      <div
        className={`mobile-overlay${sidebarOpen ? ' is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Filter sidebar ─────────────────────────────────────────────────
          On mobile: fixed-position overlay controlled by sidebarOpen.
          On desktop: always visible in flow. ─────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 40,
          transition: 'transform 200ms ease',
        }}
        // Mobile: slide sidebar in/out. Desktop: no transform needed.
        // We handle visibility via the FilterSidebar's own width on desktop
        // and via fixed positioning on mobile (handled by CSS class below).
      >
        <div
          className={sidebarOpen ? 'sidebar-visible' : 'sidebar-hidden'}
          style={{ height: '100%' }}
        >
          <FilterSidebar
            filters={filters}
            onChange={(f) => {
              setFilters(f);
              // Auto-close sidebar on mobile after a filter change
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            availableTags={availableTags}
            signals={signals}
          />
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          minWidth: 0,
        }}
      >
        {/* Mobile: filter toggle button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle filters"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <line x1="1" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="3" y1="6.5" x2="10" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="5" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Filters
          </button>
        </div>

        {/* KPI row — 4-across desktop, 2×2 mobile */}
        <div className="kpi-grid" style={{ flexShrink: 0 }}>
          {loading ? (
            <KpiSkeleton />
          ) : (
            <>
              <KpiCard label="Total Signals"    value={kpi.total}               icon={<IconSignals />}   delay={0}   />
              <KpiCard label="Hot Leads"        value={kpi.hotLeads}            icon={<IconHot />}       delay={100} subtitle="intent score ≥ 9" />
              <KpiCard label="Avg Intent Score" value={kpi.avgScore.toFixed(1)} icon={<IconScore />}     delay={200} />
              <KpiCard label="Companies"        value={kpi.companies}           icon={<IconCompanies />} delay={300} />
            </>
          )}
        </div>

        {/* Last-refreshed status — tells sales reps the data is current */}
        {!loading && kpi.lastRefreshed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: -8, // tuck closer under KPI cards
            }}
          >
            <span style={{ color: '#10b981', fontSize: 8 }}>●</span>
            <span>
              Last signal:{' '}
              <span style={{ fontFamily: 'var(--font-dm-mono), monospace', color: 'var(--text-secondary)' }}>
                {new Date(kpi.lastRefreshed).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                })}{' '}
                at{' '}
                {new Date(kpi.lastRefreshed).toLocaleTimeString('en-US', {
                  hour: 'numeric', minute: '2-digit', hour12: true,
                })}
              </span>
              {' '}· Refreshes daily at 6:00 AM
            </span>
          </div>
        )}

        {/* Error banner */}
        {fetchError && (
          <ErrorBanner message={fetchError} onRetry={() => fetchSignals(filters)} />
        )}

        {/* Leads table — flexShrink:0 prevents the flex parent from squishing
            the table to fit the chart; main scrolls instead */}
        <div style={{ flexShrink: 0 }}>
          <LeadsTable signals={signals} loading={loading} onReset={handleReset} />
        </div>

        {/* Trend chart — below the fold; scroll down to see it */}
        <div style={{ flexShrink: 0 }}>
          <TrendChart data={trendData} />
        </div>
      </main>
    </div>
  );
}
