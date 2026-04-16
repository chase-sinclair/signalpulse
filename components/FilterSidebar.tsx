'use client';

import { useEffect, useRef, useState } from 'react';
import type { DashboardFilters, JobFamily, JobSignal } from '@/lib/types';

const ALL_FAMILIES: JobFamily[] = [
  'Finance',
  'Infrastructure',
  'Security',
  'Sales',
  'Operations',
  'Other',
];

export const DEFAULT_FILTERS: DashboardFilters = {
  job_families: [],
  min_intent_score: 1,
  tags: [],
  hot_leads_only: false,
  search: '',
};

interface Props {
  filters: DashboardFilters;
  onChange: (f: DashboardFilters) => void;
  availableTags: string[];
  // Current signals — used to compute how many results each filter option yields
  signals: JobSignal[];
}

export default function FilterSidebar({ filters, onChange, availableTags, signals }: Props) {
  // Compute how many of the currently-loaded signals have each family or tag.
  // This gives the user context: "given your other filters, N results also match this."
  const familyCounts = Object.fromEntries(
    ALL_FAMILIES.map((f) => [f, signals.filter((s) => s.job_family === f).length])
  );
  const tagCounts = Object.fromEntries(
    availableTags.map((t) => [t, signals.filter((s) => s.tech_stack.includes(t)).length])
  );
  // Local search state — debounced 300ms before propagating upward
  const [localSearch, setLocalSearch] = useState(filters.search);
  // Tech stack pill filter — narrows the visible tag list without affecting active selections
  const [tagSearch, setTagSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: localSearch });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Only re-run when localSearch changes — intentionally omitting filters to avoid loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  function toggleFamily(family: JobFamily) {
    const next = filters.job_families.includes(family)
      ? filters.job_families.filter((f) => f !== family)
      : [...filters.job_families, family];
    onChange({ ...filters, job_families: next });
  }

  function toggleTag(tag: string) {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags: next });
  }

  function reset() {
    setLocalSearch('');
    onChange(DEFAULT_FILTERS);
  }

  // Count how many filter dimensions are non-default so we can badge the header
  const activeFilterCount = [
    filters.job_families.length > 0,
    filters.min_intent_score > 1,
    filters.tags.length > 0,
    filters.hot_leads_only,
    filters.search.trim() !== '',
  ].filter(Boolean).length;

  const sectionLabel: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 8,
    display: 'block',
  };

  const divider: React.CSSProperties = {
    borderTop: '1px solid var(--border)',
    margin: '16px 0',
  };

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Sidebar header — shows active filter count and a clear link when anything is set */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                color: 'var(--text-muted)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 500,
              }}
            >
              Filters
            </span>
            {activeFilterCount > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 10,
                  background: 'rgba(99,102,241,0.15)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(99,102,241,0.25)',
                }}
              >
                {activeFilterCount} active
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={reset}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 11,
                color: 'var(--text-muted)',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Search */}
        <span style={sectionLabel}>Search</span>
        <input
          type="text"
          placeholder="Company name…"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: 13,
            padding: '7px 10px',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />

        <div style={divider} />

        {/* Hot Leads Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Hot Leads Only</span>
          <button
            onClick={() => onChange({ ...filters, hot_leads_only: !filters.hot_leads_only })}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              border: 'none',
              background: filters.hot_leads_only ? 'var(--accent-hot)' : 'var(--border)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 150ms',
              flexShrink: 0,
            }}
            aria-pressed={filters.hot_leads_only}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: filters.hot_leads_only ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 150ms',
              }}
            />
          </button>
        </div>

        <div style={divider} />

        {/* Intent Score */}
        <span style={sectionLabel}>Min Intent Score</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="range"
            min={1}
            max={10}
            value={filters.min_intent_score}
            onChange={(e) =>
              onChange({ ...filters, min_intent_score: parseInt(e.target.value) })
            }
            style={{ flex: 1 }}
          />
          <span
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: 14,
              color: 'var(--accent)',
              minWidth: 16,
              textAlign: 'right',
            }}
          >
            {filters.min_intent_score}
          </span>
        </div>

        <div style={divider} />

        {/* Job Family */}
        <span style={sectionLabel}>Job Family</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ALL_FAMILIES.map((family) => {
            const count = familyCounts[family] ?? 0;
            const active = filters.job_families.includes(family);
            return (
              <label
                key={family}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  cursor: 'pointer',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 13,
                  opacity: count === 0 && !active ? 0.4 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleFamily(family)}
                    style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
                  />
                  {family}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: 10,
                    color: count === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {count}
                </span>
              </label>
            );
          })}
        </div>

        <div style={divider} />

        {/* Tags — data-driven from DB */}
        <span style={sectionLabel}>Tech Stack</span>
        {availableTags.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading tags…</span>
        ) : (
          <>
            {/* Tag search — always show active tags regardless of query */}
            <input
              type="text"
              placeholder="Search tools…"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 12,
                padding: '5px 9px',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                marginBottom: 8,
              }}
            />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableTags
              .filter((tag) =>
                // Always show active tags so selections don't disappear while searching
                filters.tags.includes(tag) ||
                tag.toLowerCase().includes(tagSearch.toLowerCase())
              )
              .map((tag) => {
              const active = filters.tags.includes(tag);
              const count = tagCounts[tag] ?? 0;
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  title={`${count} signal${count !== 1 ? 's' : ''} match`}
                  style={{
                    fontFamily: 'var(--font-dm-mono), monospace',
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: active ? 'var(--accent)' : count === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    opacity: count === 0 && !active ? 0.4 : 1,
                  }}
                >
                  {tag}
                  {count > 0 && (
                    <span style={{ marginLeft: 4, color: active ? 'rgba(99,102,241,0.7)' : 'var(--text-muted)' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          </>
        )}

        <div style={divider} />

        {/* Reset */}
        <button
          onClick={reset}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-secondary)',
            fontSize: 12,
            padding: '7px 12px',
            cursor: 'pointer',
            transition: 'border-color 150ms, color 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-muted)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Reset Filters
        </button>

      </div>
    </aside>
  );
}
