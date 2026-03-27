'use client';

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[error boundary]', error);
  }, [error]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '40px 48px',
          textAlign: 'center',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 36 }}>⚠</span>
        <h2
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          An unexpected error occurred. This is likely a temporary issue — try
          again or refresh the page.
        </p>
        {error.digest && (
          <code
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: 10,
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            {error.digest}
          </code>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 4,
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 7,
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            padding: '9px 20px',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
