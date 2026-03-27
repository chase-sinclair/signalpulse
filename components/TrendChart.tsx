'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

interface DataPoint {
  family: string;
  count: number;
}

interface Props {
  data: DataPoint[];
}

// One distinct muted color per job family — matches the pill colors in LeadsTable
const FAMILY_COLORS: Record<string, string> = {
  Finance:        '#6366f1', // indigo — hero family for this product
  Infrastructure: '#06b6d4', // cyan
  Security:       '#f59e0b', // amber
  Sales:          '#10b981', // green
  Operations:     '#8b5cf6', // violet
  Other:          '#475569', // slate
};

export default function TrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div
        style={{
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
        }}
      >
        No data yet
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '16px 8px 8px',
      }}
    >
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          paddingLeft: 16,
          marginBottom: 12,
        }}
      >
        Signals by Job Family
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis
            dataKey="family"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={24}
            allowDecimals={false}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.family}
                fill={FAMILY_COLORS[entry.family] ?? FAMILY_COLORS.Other}
              />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              style={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
