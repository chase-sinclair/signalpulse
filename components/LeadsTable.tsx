'use client';

import { Fragment, useState } from 'react';
import type { JobSignal, ScoreComponents } from '@/lib/types';
import { truncate, companyInitials } from '@/lib/utils';
import IntentScoreBadge from './IntentScoreBadge';
import ScoreBreakdown from './ScoreBreakdown';

// ── Family pill colors ───────────────────────────────────────────────────────
const FAMILY_STYLES: Record<string, { bg: string; color: string }> = {
  Finance:        { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8' },
  Infrastructure: { bg: 'rgba(6,182,212,0.12)',   color: '#22d3ee' },
  Security:       { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
  Sales:          { bg: 'rgba(16,185,129,0.12)',  color: '#34d399' },
  Operations:     { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa' },
  Other:          { bg: 'rgba(71,85,105,0.2)',    color: '#94a3b8' },
};

type SortField = 'intent_score' | 'created_at';
type SortDir = 'asc' | 'desc';

interface Props {
  signals: JobSignal[];
  loading: boolean;
  onReset?: () => void;
}

// ── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[24, 140, 160, 80, 180, 60, 180, 80].map((w, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div
            style={{
              height: 14,
              width: w,
              borderRadius: 4,
              background: 'var(--bg-elevated)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Company avatar (initials fallback — domain not on JobSignal) ──────────────
function CompanyAvatar({ name }: { name: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 4,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        fontFamily: 'var(--font-dm-mono), monospace',
        fontSize: 9,
        color: 'var(--text-secondary)',
        flexShrink: 0,
      }}
    >
      {companyInitials(name)}
    </span>
  );
}

// ── Tech stack chips ─────────────────────────────────────────────────────────
function TechChips({ tags }: { tags: string[] }) {
  const visible = tags.slice(0, 3);
  const overflow = tags.length - 3;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {visible.map((tag) => (
        <span
          key={tag}
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 3,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ── Recency indicator — traffic light for signal freshness ────────────────────
function recencyInfo(createdAt: string): { color: string; label: string } {
  const ageHours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (ageHours < 48)  return { color: '#10b981', label: 'Prime outreach window (< 48h)' };
  if (ageHours < 168) return { color: '#f59e0b', label: 'Follow-up window (3–7 days)' };
  return { color: '#475569', label: 'Potentially stale (7+ days)' };
}

// ── Reasoning blurb — why this signal was flagged ─────────────────────────────
// Summarises the non-zero score components so sales reps know exactly what
// triggered this lead without relying on volatile AI-generated hook text.
function buildReasoningBlurb(components: ScoreComponents | null | undefined): string {
  if (!components) return '—';
  const parts: string[] = [];
  if (components.implementation_signal.score > 0) parts.push(components.implementation_signal.reason);
  if (components.tool_specificity.score > 0)      parts.push(components.tool_specificity.reason);
  if (components.buying_window.score > 0)          parts.push(components.buying_window.reason);
  // Recency already shown via the traffic-light dot on the Added column
  return parts.length > 0 ? parts.join(' · ') : 'No strong signals — review score breakdown';
}

// ── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>↕</span>;
  return (
    <span style={{ color: 'var(--accent)', marginLeft: 4 }}>
      {dir === 'desc' ? '↓' : '↑'}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LeadsTable({ signals, loading, onReset }: Props) {
  const [sortField, setSortField] = useState<SortField>('intent_score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  const sorted = [...signals].sort((a, b) => {
    if (sortField === 'intent_score') {
      // Sort by computed_score — the deterministic display source of truth
      const aVal = a.computed_score ?? a.intent_score ?? 0;
      const bVal = b.computed_score ?? b.intent_score ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    }
    // created_at — lexicographic sort works on ISO strings
    return sortDir === 'desc'
      ? b.created_at.localeCompare(a.created_at)
      : a.created_at.localeCompare(b.created_at);
  });

  const thStyle: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    fontWeight: 500,
    userSelect: 'none',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  };

  return (
    <>
      {/* Keyframe for skeleton pulse — injected inline */}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto', overflowY: 'auto', height: 'calc(100vh - 250px)', minHeight: 320 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 2 }}>
                {/* Hot lead indicator */}
                <th style={{ ...thStyle, width: 28, textAlign: 'center' }}>🔥</th>
                {/* Company */}
                <th style={thStyle}>Company</th>
                {/* Job Title */}
                <th style={thStyle}>Title</th>
                {/* Family */}
                <th style={thStyle}>Family</th>
                {/* Tech Stack */}
                <th style={thStyle}>Tech Stack</th>
                {/* Intent — sortable */}
                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => toggleSort('intent_score')}
                >
                  Intent
                  <SortIcon field="intent_score" current={sortField} dir={sortDir} />
                </th>
                {/* Reasoning */}
                <th style={thStyle}>Reasoning</th>
                {/* Posted — sortable */}
                <th
                  style={{ ...thStyle, cursor: 'pointer' }}
                  onClick={() => toggleSort('created_at')}
                >
                  Added
                  <SortIcon field="created_at" current={sortField} dir={sortDir} />
                </th>
                {/* Actions */}
                <th style={{ ...thStyle, width: 96 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '48px 20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 32 }}>🔍</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        No signals match your filters
                      </span>
                      {onReset && (
                        <button
                          onClick={onReset}
                          style={{
                            marginTop: 4,
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            color: 'var(--text-secondary)',
                            fontSize: 12,
                            padding: '6px 14px',
                            cursor: 'pointer',
                          }}
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((signal, idx) => {
                  const familyStyle = signal.job_family
                    ? (FAMILY_STYLES[signal.job_family] ?? FAMILY_STYLES.Other)
                    : FAMILY_STYLES.Other;
                  const isExpanded = expandedId === signal.id;

                  function toggleExpanded() {
                    setExpandedId(isExpanded ? null : signal.id);
                  }

                  return (
                    <Fragment key={signal.id}>
                    <tr
                      style={{
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(26,26,36,0.3)',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--bg-elevated)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          isExpanded ? 'var(--bg-elevated)' :
                          idx % 2 === 0 ? 'transparent' : 'rgba(26,26,36,0.3)';
                      }}
                    >
                      {/* Hot lead dot */}
                      <td style={{ ...tdStyle, textAlign: 'center', width: 28 }}>
                        {signal.is_hot_lead && (
                          <span
                            style={{
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: 'var(--accent-hot)',
                              boxShadow: '0 0 6px var(--accent-hot)',
                            }}
                            title="Hot Lead"
                          />
                        )}
                      </td>

                      {/* Company */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                          <CompanyAvatar name={signal.company_name} />
                          <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>
                            {signal.company_name}
                          </span>
                        </div>
                      </td>

                      {/* Job Title + seniority label */}
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', maxWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{truncate(signal.job_title, 38)}</span>
                          {signal.seniority_label && (
                            <span
                              style={{
                                fontFamily: 'var(--font-dm-mono), monospace',
                                fontSize: 9,
                                padding: '2px 5px',
                                borderRadius: 3,
                                background: 'rgba(99,102,241,0.1)',
                                color: '#818cf8',
                                border: '1px solid rgba(99,102,241,0.2)',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                              title={
                                signal.seniority_label === 'EXEC'
                                  ? 'EXEC — VP / Director / Head of / C-suite'
                                  : signal.seniority_label === 'SR'
                                  ? 'SR — Senior / Manager / Lead / Principal'
                                  : 'IC — Analyst / Coordinator / Associate / Junior'
                              }
                            >
                              {signal.seniority_label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Family pill */}
                      <td style={tdStyle}>
                        {signal.job_family ? (
                          <span
                            style={{
                              fontFamily: 'var(--font-dm-mono), monospace',
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: familyStyle.bg,
                              color: familyStyle.color,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {signal.job_family}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Tech Stack chips */}
                      <td style={{ ...tdStyle, minWidth: 160 }}>
                        {signal.tech_stack.length > 0 ? (
                          <TechChips tags={signal.tech_stack} />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Intent Score — clickable to expand breakdown */}
                      <td style={tdStyle}>
                        <IntentScoreBadge
                          score={signal.computed_score ?? signal.intent_score}
                          onClick={toggleExpanded}
                          isExpanded={isExpanded}
                        />
                      </td>

                      {/* Reasoning — why this signal was flagged */}
                      <td style={{ ...tdStyle, maxWidth: 260 }}>
                        {(() => {
                          const blurb = buildReasoningBlurb(signal.score_components);
                          return (
                            <div className="tooltip-parent" style={{ cursor: 'default' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.4 }}>
                                {truncate(blurb, 72)}
                              </span>
                              {blurb.length > 72 && (
                                <span className="tooltip-text">{blurb}</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Added — with recency traffic-light dot */}
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {(() => {
                            const r = recencyInfo(signal.created_at);
                            return (
                              <span
                                title={r.label}
                                style={{
                                  display: 'inline-block',
                                  width: 7,
                                  height: 7,
                                  borderRadius: '50%',
                                  background: r.color,
                                  flexShrink: 0,
                                  boxShadow: r.color === '#10b981' ? `0 0 5px ${r.color}` : 'none',
                                }}
                              />
                            );
                          })()}
                          <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 11 }}>
                            {signal.posted_at ?? '—'}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Score breakdown — full-width row, visible only when expanded */}
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={9}
                          style={{ padding: 0, borderBottom: '1px solid var(--border)' }}
                        >
                          <ScoreBreakdown
                            components={signal.score_components ?? null}
                            computedScore={signal.computed_score ?? 0}
                          />
                        </td>
                      </tr>
                    )}
                      {/* Actions — Copy Hook, LinkedIn, Source */}
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          {/* LinkedIn — find decision makers */}
                          <a
                            href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(signal.company_name + ' Hiring Manager')}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Find decision makers on LinkedIn"
                            style={{
                              fontFamily: 'var(--font-dm-mono), monospace',
                              fontSize: 10,
                              padding: '3px 7px',
                              borderRadius: 4,
                              border: '1px solid var(--border)',
                              background: 'transparent',
                              color: 'var(--text-secondary)',
                              textDecoration: 'none',
                              flexShrink: 0,
                              transition: 'color 150ms, border-color 150ms',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#818cf8';
                              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-secondary)';
                              e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                          >
                            in
                          </a>

                          {/* Source — original job posting */}
                          {signal.job_url && (
                            <a
                              href={signal.job_url}
                              target="_blank"
                              rel="noreferrer"
                              title="View original job posting"
                              style={{
                                fontFamily: 'var(--font-dm-mono), monospace',
                                fontSize: 10,
                                padding: '3px 7px',
                                borderRadius: 4,
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                textDecoration: 'none',
                                flexShrink: 0,
                                transition: 'color 150ms',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      </td>

                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Row count footer */}
        {!loading && sorted.length > 0 && (
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: 11,
              fontFamily: 'var(--font-dm-mono), monospace',
            }}
          >
            {sorted.length} signal{sorted.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </>
  );
}
