'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CompanyCardData } from '@/components/CompanyCardGrid';

type SortKey = 'signals' | 'delta' | 'score';

const FAMILY_COLORS: Record<string, string> = {
  Finance:        '#818cf8',
  Infrastructure: '#22d3ee',
  Security:       '#fbbf24',
  Sales:          '#34d399',
  Operations:     '#a78bfa',
  Other:          '#94a3b8',
};

const FAMILIES = ['All', 'Finance', 'Infrastructure', 'Security', 'Sales', 'Operations'];
const SORT_LABELS: Record<SortKey, string> = { signals: 'Signals', delta: 'Δ Week', score: 'Score' };
const MAX_BARS = 20;

interface Props {
  cards: CompanyCardData[];
  familyFilter: string;
  onFamilyChange: (f: string) => void;
}

export default function CompanyBarChart({ cards, familyFilter, onFamilyChange }: Props) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortKey>('signals');

  const familyFiltered = familyFilter === 'All'
    ? cards
    : cards.filter((c) => c.dominant_family === familyFilter);

  const sorted = [...familyFiltered].sort((a, b) => {
    if (sortBy === 'signals') return b.current_count - a.current_count;
    if (sortBy === 'delta')   return b.delta - a.delta;
    return (b.avg_intent_score ?? 0) - (a.avg_intent_score ?? 0);
  });

  const top = sorted.slice(0, MAX_BARS);

  const maxVal = top.length === 0 ? 1 : Math.max(
    sortBy === 'score'
      ? Math.max(...top.map((c) => c.avg_intent_score ?? 0))
      : sortBy === 'delta'
      ? Math.max(...top.map((c) => Math.abs(c.delta)))
      : Math.max(...top.map((c) => c.current_count)),
    1,
  );

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '20px 24px',
        marginBottom: 28,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          Company Rankings
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          top {Math.min(top.length, MAX_BARS)} of {familyFiltered.length}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        {/* Sort pills */}
        <div style={{ display: 'flex', gap: 5 }}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 4,
                border: '1px solid',
                borderColor: sortBy === key ? 'var(--accent)' : 'var(--border)',
                background: sortBy === key ? 'var(--accent)' : 'transparent',
                color: sortBy === key ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'background 150ms, border-color 150ms',
              }}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0 }} />

        {/* Family filter pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {FAMILIES.map((f) => {
            const active = familyFilter === f;
            const color = f === 'All' ? 'var(--accent)' : FAMILY_COLORS[f];
            return (
              <button
                key={f}
                onClick={() => onFamilyChange(f)}
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: active ? color : 'var(--border)',
                  background: active ? (f === 'All' ? 'var(--accent)' : `${color}22`) : 'transparent',
                  color: active ? (f === 'All' ? '#fff' : color) : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  transition: 'background 150ms, border-color 150ms',
                }}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bars */}
      {top.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No companies in this category
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {top.map((card) => {
            const rawVal =
              sortBy === 'signals' ? card.current_count
              : sortBy === 'score'  ? (card.avg_intent_score ?? 0)
              : card.delta;

            const absVal  = Math.abs(rawVal);
            const barPct  = Math.max((absVal / maxVal) * 100, 1.5);
            const isNeg   = rawVal < 0;
            const color   = card.dominant_family
              ? (FAMILY_COLORS[card.dominant_family] ?? FAMILY_COLORS.Other)
              : FAMILY_COLORS.Other;

            const displayVal =
              sortBy === 'score'
                ? (card.avg_intent_score ?? 0).toFixed(1)
                : sortBy === 'delta'
                ? (rawVal > 0 ? `+${rawVal}` : String(rawVal))
                : String(rawVal);

            return (
              <div
                key={card.company.id}
                onClick={() => router.push(`/?search=${encodeURIComponent(card.company.name)}`)}
                title={`View ${card.company.name} signals`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '3px 0' }}
                onMouseEnter={(e) => {
                  const name = e.currentTarget.querySelector<HTMLSpanElement>('[data-name]');
                  if (name) name.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  const name = e.currentTarget.querySelector<HTMLSpanElement>('[data-name]');
                  if (name) name.style.color = 'var(--text-secondary)';
                }}
              >
                {/* Company name */}
                <span
                  data-name
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    width: 140,
                    flexShrink: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 120ms',
                  }}
                >
                  {card.company.name}
                </span>

                {/* Bar track */}
                <div
                  style={{
                    flex: 1,
                    height: 18,
                    background: 'var(--bg-elevated)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: '0 auto 0 0',
                      width: `${barPct}%`,
                      background: isNeg ? '#ef444455' : `${color}bb`,
                      borderRadius: 3,
                      transition: 'width 280ms ease',
                    }}
                  />
                </div>

                {/* Value */}
                <span
                  style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: 12,
                    color: isNeg ? '#ef4444' : 'var(--text-primary)',
                    width: 38,
                    flexShrink: 0,
                    textAlign: 'right',
                  }}
                >
                  {displayVal}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
