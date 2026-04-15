'use client';

import { Fragment } from 'react';
import type { ScoreComponents } from '@/lib/types';

interface Props {
  components: ScoreComponents | null;
  computedScore: number;
}

const LABELS: Record<keyof ScoreComponents, string> = {
  implementation_signal: 'Impl. Signal',
  tool_specificity:      'Tool Match',
  buying_window:         'Buying Window',
  recency:               'Recency',
};

const ROW_ORDER: Array<keyof ScoreComponents> = [
  'implementation_signal',
  'tool_specificity',
  'buying_window',
  'recency',
];

function dotColor(score: number, max: number): string {
  if (score === 0)   return 'var(--score-low)';
  if (score === max) return 'var(--score-high)';
  return 'var(--score-mid)';
}

function DotDisplay({ score, max }: { score: number; max: number }) {
  const color = dotColor(score, max);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{
            fontSize: 9,
            color: i < score ? color : 'var(--text-muted)',
            lineHeight: 1,
          }}
        >
          {i < score ? '●' : '○'}
        </span>
      ))}
    </div>
  );
}

export default function ScoreBreakdown({ components, computedScore }: Props) {
  // Null-safe: render nothing if components unavailable
  if (!components) return null;

  const totalColor =
    computedScore >= 8
      ? 'var(--score-high)'
      : computedScore >= 5
      ? 'var(--score-mid)'
      : 'var(--score-low)';

  return (
    <div
      style={{
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        padding: '12px 16px 14px',
        animation: 'scoreSlideDown 150ms ease-out',
      }}
    >
      <style>{`
        @keyframes scoreSlideDown {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* 4-column grid: label | dots | fraction | reason */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '100px 72px 36px 1fr',
          rowGap: 8,
          columnGap: 12,
          alignItems: 'center',
        }}
      >
        {ROW_ORDER.map(key => {
          const c = components[key];
          return (
            <Fragment key={key}>
              {/* Label */}
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-geist), sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                {LABELS[key]}
              </span>

              {/* Dot display */}
              <DotDisplay score={c.score} max={c.max} />

              {/* Score fraction */}
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: 11,
                  color: dotColor(c.score, c.max),
                  fontWeight: 500,
                }}
              >
                {c.score}/{c.max}
              </span>

              {/* Reason */}
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-geist), sans-serif',
                }}
              >
                {c.reason}
              </span>
            </Fragment>
          );
        })}
      </div>

      {/* Total row */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-geist), sans-serif',
          }}
        >
          Computed Score
        </span>
        <span
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 13,
            fontWeight: 600,
            color: totalColor,
          }}
        >
          {computedScore}/10
        </span>
      </div>
    </div>
  );
}
