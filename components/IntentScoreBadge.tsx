'use client';

interface Props {
  score: number | null;
}

export default function IntentScoreBadge({ score }: Props) {
  if (score === null) {
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

  const color =
    score >= 8
      ? 'var(--score-high)'
      : score >= 5
      ? 'var(--score-mid)'
      : 'var(--score-low)';

  return (
    <span
      style={{
        fontFamily: 'var(--font-dm-mono), monospace',
        color,
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontWeight: 500,
      }}
    >
      <span style={{ fontSize: 8 }}>⬤</span>
      {score}
    </span>
  );
}
