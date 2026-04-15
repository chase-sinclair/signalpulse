'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/',              label: 'Leads'        },
  { href: '/companies',     label: 'Companies'    },
  { href: '/intelligence',  label: 'Intelligence' },
  { href: '/methodology',   label: 'Methodology'  },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', gap: 4 }}>
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            style={{
              fontSize: 13,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
              borderRadius: 6,
              padding: '5px 12px',
              textDecoration: 'none',
              transition: 'color 150ms, background 150ms',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
