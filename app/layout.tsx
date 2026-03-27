import type { Metadata } from 'next';
import { Geist, Geist_Mono, DM_Mono } from 'next/font/google';
import NavLinks from '@/components/NavLinks';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'SignalPulse AI — B2B Sales Intelligence',
  description:
    'Monitor job postings to identify buying windows — moments when hiring patterns signal a company is about to invest in new software.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* ── Global header ────────────────────────────────────────────── */}
        <header
          style={{
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            padding: '0 24px',
            height: 52,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          {/* Logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Pulse icon */}
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="22" height="22" rx="6" fill="#6366f1" fillOpacity="0.15"/>
              <polyline
                points="3,11 7,11 9,6 11,16 13,8 15,11 19,11"
                stroke="#6366f1"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                SignalPulse AI
              </span>
              <span className="header-subtitle" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                B2B Sales Intelligence
              </span>
            </div>
          </div>

          {/* Nav */}
          <NavLinks />
        </header>

        {/* ── Page content ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
