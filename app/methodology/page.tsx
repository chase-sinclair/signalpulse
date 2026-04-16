'use client';

// ── Methodology page — explains the architecture and scoring logic ─────────────
// Aimed at recruiters and technical users who want to understand how the system works.

const SCORE_COMPONENTS = [
  {
    name: 'Implementation Signal',
    max: 3,
    color: '#6366f1',
    description: 'Checks both the job title and description for named tools + implementation/transformation keywords. Transformation and adoption language is treated as equally strong as explicit "implementation" — it signals a company actively changing systems.',
    rules: [
      { score: 3, label: 'Named tool + impl/transform keyword in title', example: '"NetSuite Implementation Manager"' },
      { score: 2, label: 'Impl/transform keyword in title only', example: '"ERP Transformation Lead", "Digital Adoption Manager"' },
      { score: 1, label: 'Named tool in title, or impl/transform keyword in description', example: '"Salesforce Administrator" or description mentions "go-live"' },
      { score: 0, label: 'No implementation or transformation signal', example: '"Business Analyst"' },
    ],
  },
  {
    name: 'Tool Specificity',
    max: 3,
    color: '#06b6d4',
    description: 'Measures how specifically this role maps to a known tool. A dedicated role with the tool in both the title and the OpenAI-extracted tech stack is the strongest signal.',
    rules: [
      { score: 3, label: 'Named tool in both title and tech stack', example: '"NetSuite Implementation Manager" + tech_stack: [netsuite]' },
      { score: 2, label: 'Named tool in tech stack but not in title', example: 'Title: "Systems Analyst", tech_stack: [salesforce]' },
      { score: 1, label: 'Tech stack has tools but none are tracked', example: 'tech_stack: [power automate]' },
      { score: 0, label: 'No tools identified', example: '—' },
    ],
  },
  {
    name: 'Buying Window',
    max: 2,
    color: '#f59e0b',
    description: 'Scans the description for replacement signals, urgency language, and new-role indicators. Maintenance/BAU roles are explicitly zeroed out.',
    rules: [
      { score: 2, label: '2+ buying signals in description', example: '"replacing legacy ERP", "greenfield implementation"' },
      { score: 1, label: '1 buying signal', example: '"newly created role"' },
      { score: 0, label: 'No signals, or maintenance language found', example: '"support existing Salesforce", "ongoing BAU"' },
    ],
  },
  {
    name: 'Recency',
    max: 2,
    color: '#10b981',
    description: 'A lead posted yesterday is more actionable than one from three weeks ago. Scores decay as time passes — always computed from the date the signal was added to the DB.',
    rules: [
      { score: 2, label: 'Added < 3 days ago', example: 'Prime outreach window' },
      { score: 1, label: 'Added 3–14 days ago', example: 'Follow-up window' },
      { score: 0, label: 'Added 14+ days ago', example: 'Potentially stale' },
    ],
  },
];

const PIPELINE_STEPS = [
  { label: 'SerpApi', sublabel: 'Google Jobs', description: '12 job queries run daily at 6AM. Returns raw job listings with title, company, description, and URL.' },
  { label: 'n8n', sublabel: 'Automation', description: 'Orchestrates the pipeline. Deduplicates by external_job_id, filters by score ≥ 7, and writes clean rows to Supabase.' },
  { label: 'GPT-4o-mini', sublabel: 'OpenAI', description: 'Extracts: intent score (0-10), reason, tech_stack[], and job_family from raw descriptions. Returns structured JSON.' },
  { label: 'Supabase', sublabel: 'Postgres', description: 'Stores companies, job_signals, signal_tags, and weekly_snapshots. The signals_with_tags view aggregates tags per signal.' },
  { label: 'Next.js', sublabel: 'API + UI', description: 'API routes enrich each signal with deterministic computed_score and seniority_label. Dashboard renders Leads, Companies, and Intelligence views.' },
];

function PipelineStep({ step, index, total }: { step: typeof PIPELINE_STEPS[0]; index: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
      {/* Step node */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--accent)',
          }}
        >
          {index + 1}
        </div>
        {index < total - 1 && (
          <div style={{ width: 1, height: 32, background: 'var(--border)', margin: '4px 0' }} />
        )}
      </div>

      {/* Step content */}
      <div style={{ marginLeft: 16, paddingBottom: index < total - 1 ? 0 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{step.label}</span>
          <span
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 3,
              background: 'rgba(99,102,241,0.1)',
              color: '#818cf8',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            {step.sublabel}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, paddingBottom: 24 }}>
          {step.description}
        </p>
      </div>
    </div>
  );
}

function ScoreComponentCard({ component }: { component: typeof SCORE_COMPONENTS[0] }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: component.color, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{component.name}</span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-dm-mono), monospace',
            fontSize: 12,
            color: component.color,
          }}
        >
          0–{component.max} pts
        </span>
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
        {component.description}
      </p>

      {/* Rules table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {component.rules.map((rule) => (
          <div
            key={rule.score}
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 1fr auto',
              gap: 10,
              alignItems: 'start',
              padding: '6px 10px',
              borderRadius: 6,
              background: 'var(--bg-elevated)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: 12,
                fontWeight: 600,
                color: rule.score === component.max ? '#10b981' : rule.score > 0 ? '#f59e0b' : 'var(--text-muted)',
              }}
            >
              +{rule.score}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rule.label}</span>
            <span
              style={{
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: 11,
                color: 'var(--text-muted)',
                textAlign: 'right',
              }}
            >
              {rule.example}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <main
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 24px',
        maxWidth: 860,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 40,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          How SignalPulse Works
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 640 }}>
          SignalPulse identifies "buying windows" — moments when a company's hiring activity
          signals they are actively purchasing or implementing new software. This page explains the
          pipeline architecture and the scoring logic behind every intent score you see.
        </p>
      </div>

      {/* ── Pipeline architecture ───────────────────────────────────────────── */}
      <section>
        <h2
          style={{
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: 24,
            fontWeight: 500,
          }}
        >
          Pipeline Architecture
        </h2>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '24px 28px',
          }}
        >
          {PIPELINE_STEPS.map((step, i) => (
            <PipelineStep key={step.label} step={step} index={i} total={PIPELINE_STEPS.length} />
          ))}
        </div>
      </section>

      {/* ── Intent score ───────────────────────────────────────────────────── */}
      <section>
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            Intent Score (0–10)
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Every signal gets a deterministic score computed from four components (max 10).
            Scores are calculated client-side at query time — not stored — so they always reflect the
            latest keyword lists. Seniority is extracted but <em>not</em> scored: a junior
            implementation hire is equally valid evidence of a buying window as a director-level one.
          </p>
        </div>

        {/* Score bar visual */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '16px 20px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {[
              { max: 3, color: '#6366f1', label: 'Impl.' },
              { max: 3, color: '#06b6d4', label: 'Tools' },
              { max: 2, color: '#f59e0b', label: 'Window' },
              { max: 2, color: '#10b981', label: 'Recency' },
            ].map((c) => (
              <div key={c.label} style={{ flex: c.max, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 6, borderRadius: 3, background: c.color, opacity: 0.7 }} />
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 9, color: 'var(--text-muted)' }}>
                  {c.label} /{c.max}
                </span>
              </div>
            ))}
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
              /10
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
          {SCORE_COMPONENTS.map((component) => (
            <ScoreComponentCard key={component.name} component={component} />
          ))}
        </div>

        {/* Hot Lead threshold callout */}
        <div
          style={{
            marginTop: 16,
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🔥</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
              Hot Lead threshold: intent score ≥ 9
            </span>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The hot lead flag is set by the n8n pipeline when a signal&apos;s AI-generated intent
              score meets or exceeds 9. It is stored as a boolean on the signal record and is{' '}
              <em>not</em> recomputed when the client-side scoring is recalculated. Use the
              computed intent score (shown in the Leads table) for the most up-to-date ranking.
            </p>
          </div>
        </div>
      </section>

      {/* ── Seniority badges ───────────────────────────────────────────────── */}
      <section>
        <h2
          style={{
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: 16,
            fontWeight: 500,
          }}
        >
          Seniority Badges
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
          Each job title is classified into one of three seniority tiers. The badge appears next to
          the title in the Leads table. Seniority is <em>not</em> factored into the intent score —
          a junior implementation hire signals a buying window just as much as a director-level one.
          The badge is purely contextual to help you prioritise outreach.
        </p>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {[
            {
              badge: 'EXEC',
              desc: 'VP, Director, Head of, Chief, Controller, President — budget authority. These hires signal a strategic, top-down initiative.',
            },
            {
              badge: 'SR',
              desc: 'Senior, Manager, Lead, Principal — hands-on ownership. These roles typically own vendor selection and run the project day-to-day.',
            },
            {
              badge: 'IC',
              desc: 'Analyst, Coordinator, Associate, Junior — execution layer. Confirms the buying window is active; less direct buying authority.',
            },
          ].map((item) => (
            <div key={item.badge} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 3,
                  background: 'rgba(99,102,241,0.1)',
                  color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.2)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {item.badge}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {item.desc}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Data freshness ──────────────────────────────────────────────────── */}
      <section>
        <h2
          style={{
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            marginBottom: 16,
            fontWeight: 500,
          }}
        >
          Data Freshness
        </h2>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {[
            { dot: '#10b981', label: 'Green dot on Added column', desc: 'Signal added < 48 hours ago — prime outreach window' },
            { dot: '#f59e0b', label: 'Amber dot', desc: '3–7 days old — still within follow-up window' },
            { dot: '#475569', label: 'Gray dot', desc: '7+ days old — potentially stale, position may be filled' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: item.dot,
                  flexShrink: 0,
                  marginTop: 5,
                  boxShadow: item.dot === '#10b981' ? `0 0 5px ${item.dot}` : 'none',
                }}
              />
              <div>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}> — {item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
