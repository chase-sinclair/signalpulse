import Link from 'next/link';

export default function NotFound() {
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
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 72,
            fontWeight: 500,
            color: 'var(--border)',
            lineHeight: 1,
          }}
        >
          404
        </span>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            margin: 0,
          }}
        >
          This page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          style={{
            marginTop: 4,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            color: 'var(--text-primary)',
            fontSize: 13,
            padding: '8px 20px',
            textDecoration: 'none',
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
