'use client';

import { type ReactNode, useEffect, useState } from 'react';

interface Props {
  label: string;
  value: string | number;
  icon: ReactNode;
  delay: number;
  subtitle?: string; // optional definition note shown below the value
}

export default function KpiCard({ label, value, icon, delay, subtitle }: Props) {
  const [visible, setVisible] = useState(false);

  // Staggered fade + translate-up on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: 1,
        minWidth: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 300ms ease, transform 300ms ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ color: 'var(--accent)', opacity: 0.8 }}>{icon}</span>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-dm-mono), monospace',
          fontSize: 28,
          fontWeight: 500,
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      {subtitle && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.02em',
            marginTop: 2,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
