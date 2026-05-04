'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Company } from '@/lib/types';
import WeeklyDeltaBadge from '@/components/WeeklyDeltaBadge';
import CompanyBarChart from '@/components/CompanyBarChart';

// Mirrors the shape built by getCompanyCards() in app/companies/page.tsx
export interface CompanyCardData {
  company: Company;
  current_count: number;
  previous_count: number;
  delta: number;
  dominant_family: string | null;
  avg_intent_score: number | null;
}

const FAMILY_COLORS: Record<string, string> = {
  Finance:        '#818cf8',
  Infrastructure: '#22d3ee',
  Security:       '#fbbf24',
  Sales:          '#34d399',
  Operations:     '#a78bfa',
  Other:          '#94a3b8',
};

interface Props {
  cards: CompanyCardData[];
}

export default function CompanyCardGrid({ cards }: Props) {
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('All');
  const router = useRouter();

  const familyFiltered = familyFilter === 'All'
    ? cards
    : cards.filter((c) => c.dominant_family === familyFilter);

  const filtered = search.trim()
    ? familyFiltered.filter((c) =>
        c.company.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : familyFiltered;

  return (
    <>
      {/* Ranked bar chart — family filter is shared with card grid below */}
      <CompanyBarChart
        cards={cards}
        familyFilter={familyFilter}
        onFamilyChange={setFamilyFilter}
      />

      {/* Search bar */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 13,
            padding: '8px 12px',
            outline: 'none',
            width: '100%',
            maxWidth: 320,
            boxSizing: 'border-box',
          }}
        />
        {(search || familyFilter !== 'All') && (
          <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} of {cards.length} companies
          </span>
        )}
      </div>

      {/* Empty state for search */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: '48px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          No companies match &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((card) => (
            <CompanyCard
              key={card.company.id}
              card={card}
              onClick={() =>
                router.push(`/?search=${encodeURIComponent(card.company.name)}`)
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

// ── Card component ────────────────────────────────────────────────────────────
function CompanyCard({ card, onClick }: { card: CompanyCardData; onClick: () => void }) {
  const familyColor = card.dominant_family
    ? (FAMILY_COLORS[card.dominant_family] ?? FAMILY_COLORS.Other)
    : FAMILY_COLORS.Other;

  return (
    <div
      onClick={onClick}
      title={`View ${card.company.name} signals on Leads page`}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'pointer',
        transition: 'border-color 150ms, background 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.background = 'var(--bg-elevated)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.background = 'var(--bg-surface)';
      }}
    >
      {/* Company name + delta */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>
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

      {/* Bottom row: family + avg score + drill-through hint */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {card.avg_intent_score !== null && (
            <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 11, color: 'var(--text-muted)' }}>
              avg {Number(card.avg_intent_score).toFixed(1)}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>View leads →</span>
        </div>
      </div>
    </div>
  );
}
