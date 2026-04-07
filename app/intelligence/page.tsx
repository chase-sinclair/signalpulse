'use client';

import { useEffect, useState } from 'react';
import KpiCard from '@/components/KpiCard';
import TrendChart from '@/components/TrendChart';
import IntentScoreBadge from '@/components/IntentScoreBadge';
import type { VelocityCompany } from '@/app/api/intelligence/velocity/route';

// ── Types matching the summary API response ───────────────────────────────────
interface SummaryData {
  kpi: {
    totalSignals: number;
    familiesActive: number;
    mostActiveTool: string | null;
    hottestSector: string | null;
  };
  familyBreakdown: { family: string; count: number }[];
  topTags: { tag: string; mentions: number }[];
}

interface VelocityData {
  companies: VelocityCompany[];
}

// ── KPI icons ─────────────────────────────────────────────────────────────────
const IconSignals = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <polyline points="1,8 4,8 5.5,3 7.5,13 9.5,5 11,8 15,8"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconFamilies = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 2v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconTool = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 2a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-3.46-2H2V6h4.54A4 4 0 0110 2z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="6" r="1.5" fill="currentColor"/>
  </svg>
);
const IconSector = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 14V8l4-4 4 4 4-4v10" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── Family color palette — same as TrendChart ─────────────────────────────────
const FAMILY_COLORS: Record<string, string> = {
  Finance:        '#6366f1',
  Infrastructure: '#06b6d4',
  Security:       '#f59e0b',
  Sales:          '#10b981',
  Operations:     '#8b5cf6',
  Other:          '#475569',
};

// ── Loading skeleton ───────────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 16 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: 'var(--bg-elevated)',
        animation: 'kpi-pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

// ── Top Tools ranked list ──────────────────────────────────────────────────────
function TopToolsList({ tags, loading }: { tags: { tag: string; mentions: number }[]; loading: boolean }) {
  const maxMentions = tags[0]?.mentions ?? 1;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        flex: '0 0 260px',
      }}
    >
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 14,
        }}
      >
        Top Tools
      </p>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skeleton width={90} height={11} />
              <Skeleton width={`${70 - i * 8}%`} height={6} />
              <Skeleton width={20} height={11} />
            </div>
          ))}
        </div>
      ) : tags.length === 0 ? (
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No tags yet</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tags.map((t, i) => (
            <div key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Rank */}
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  width: 14,
                  flexShrink: 0,
                  textAlign: 'right',
                }}
              >
                {i + 1}
              </span>
              {/* Tag name */}
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  width: 110,
                  flexShrink: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.tag}
              </span>
              {/* Bar */}
              <div
                style={{
                  flex: 1,
                  height: 5,
                  background: 'var(--bg-elevated)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${(t.mentions / maxMentions) * 100}%`,
                    background: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                    borderRadius: 3,
                    transition: 'width 400ms ease',
                  }}
                />
              </div>
              {/* Count */}
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                  width: 20,
                  textAlign: 'right',
                }}
              >
                {t.mentions}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Velocity alert card ────────────────────────────────────────────────────────
function VelocityCard({ company }: { company: VelocityCompany }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Company name + signal count */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}
        >
          {company.company_name}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--accent)',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {company.signal_count}
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 3 }}>signals</span>
        </span>
      </div>

      {/* Family pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {company.families.map((f) => (
          <span
            key={f}
            style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${FAMILY_COLORS[f] ?? FAMILY_COLORS.Other}18`,
              color: FAMILY_COLORS[f] ?? FAMILY_COLORS.Other,
              border: `1px solid ${FAMILY_COLORS[f] ?? FAMILY_COLORS.Other}30`,
              fontWeight: 500,
            }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Peak score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Peak score</span>
        <IntentScoreBadge score={company.peak_score} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function IntelligencePage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [velocity, setVelocity] = useState<VelocityData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [velocityLoading, setVelocityLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [velocityError, setVelocityError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/intelligence/summary')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SummaryData>;
      })
      .then(setSummary)
      .catch((err: Error) => {
        console.error('[intelligence] summary fetch failed:', err.message);
        setSummaryError(err.message);
      })
      .finally(() => setSummaryLoading(false));

    fetch('/api/intelligence/velocity')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<VelocityData>;
      })
      .then(setVelocity)
      .catch((err: Error) => {
        console.error('[intelligence] velocity fetch failed:', err.message);
        setVelocityError(err.message);
      })
      .finally(() => setVelocityLoading(false));
  }, []);

  const kpi = summary?.kpi;

  return (
    <>
      <style>{`@keyframes kpi-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* ── Page header ────────────────────────────────────────────────── */}
        <div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Market Intelligence
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Aggregate view of hiring signals across all tracked companies and tool categories.
          </p>
        </div>

        {/* ── KPI row ────────────────────────────────────────────────────── */}
        <div className="kpi-grid">
          {summaryLoading ? (
            <>
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
                  <Skeleton width={80} height={10} />
                  <Skeleton width={60} height={28} />
                </div>
              ))}
            </>
          ) : summaryError ? (
            <div style={{ color: '#fca5a5', fontSize: 13 }}>⚠ {summaryError}</div>
          ) : (
            <>
              <KpiCard
                label="Total Signals"
                value={kpi?.totalSignals ?? 0}
                icon={<IconSignals />}
                delay={0}
              />
              <KpiCard
                label="Families Active"
                value={kpi?.familiesActive ?? 0}
                icon={<IconFamilies />}
                delay={100}
              />
              <KpiCard
                label="Most Active Tool"
                value={kpi?.mostActiveTool ?? '—'}
                icon={<IconTool />}
                delay={200}
              />
              <KpiCard
                label="Hottest Sector"
                value={kpi?.hottestSector ?? '—'}
                icon={<IconSector />}
                delay={300}
              />
            </>
          )}
        </div>

        {/* ── Top Tools + Family chart ────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <TopToolsList
            tags={summary?.topTags ?? []}
            loading={summaryLoading}
          />
          <div style={{ flex: 1, minWidth: 280 }}>
            <TrendChart data={summary?.familyBreakdown ?? []} />
          </div>
        </div>

        {/* ── Hiring Velocity Alerts ──────────────────────────────────────── */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              Hiring Velocity Alerts
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Companies with 2+ signals in the last 7 days — highest-urgency prospects.
            </p>
          </div>

          {velocityLoading ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    animation: `kpi-pulse 1.5s ease-in-out ${i * 150}ms infinite`,
                  }}
                >
                  <Skeleton width="60%" height={14} />
                  <Skeleton width="40%" height={10} />
                  <Skeleton width="80%" height={6} />
                </div>
              ))}
            </div>
          ) : velocityError ? (
            <div style={{ color: '#fca5a5', fontSize: 13 }}>⚠ {velocityError}</div>
          ) : (velocity?.companies ?? []).length === 0 ? (
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '32px 24px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 13,
              }}
            >
              No companies with multiple signals yet — check back as the pipeline accumulates data.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {velocity!.companies.map((company) => (
                <VelocityCard key={company.company_name} company={company} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
