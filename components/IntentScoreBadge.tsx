'use client';

interface Props {
  score: number | null;
  onClick?: () => void;
  isExpanded?: boolean;
}

export default function IntentScoreBadge({ score, onClick, isExpanded }: Props) {
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

  // Thresholds calibrated to the 10-point scale (max score = 10)
  const color =
    score >= 8
      ? 'var(--score-high)'
      : score >= 5
      ? 'var(--score-mid)'
      : 'var(--score-low)';

  const inner = (
    <>
      <span style={{ fontSize: 8 }}>⬤</span>
      {score}
      {onClick && (
        <span
          style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            marginLeft: 2,
            // Rotate chevron to indicate expanded/collapsed state
            display: 'inline-block',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          ▾
        </span>
      )}
    </>
  );

  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--font-dm-mono), monospace',
    color,
    fontSize: 13,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontWeight: 500,
  };

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{
          ...baseStyle,
          background: 'none',
          border: 'none',
          padding: '2px 4px',
          borderRadius: 4,
          cursor: 'pointer',
          outline: 'none',
          // Subtle hover ring handled via onMouseEnter/Leave to stay inline
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1px ${color}44`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }}
        aria-label={`Intent score ${score}. Click to ${isExpanded ? 'collapse' : 'expand'} breakdown.`}
      >
        {inner}
      </button>
    );
  }

  return (
    <span style={baseStyle}>
      {inner}
    </span>
  );
}
