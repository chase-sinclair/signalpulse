'use client';

interface Props {
  delta: number;
}

export default function WeeklyDeltaBadge({ delta }: Props) {
  if (delta === 0) {
    return (
      <span
        style={{
          fontFamily: 'var(--font-dm-mono), monospace',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        —
      </span>
    );
  }

  const isPositive = delta > 0;
  const color = isPositive ? 'var(--score-high)' : 'var(--score-low)';
  const arrow = isPositive ? '↑' : '↓';
  const sign = isPositive ? '+' : '';

  return (
    <span
      style={{
        fontFamily: 'var(--font-dm-mono), monospace',
        color,
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      {sign}{delta} {arrow}
    </span>
  );
}
