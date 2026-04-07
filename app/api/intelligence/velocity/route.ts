import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export interface VelocityCompany {
  company_name: string;
  signal_count: number;
  families: string[];
  peak_score: number | null;
  first_seen: string;
  last_seen: string;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // Fetch signals from the last 7 days — matches Section 16 velocity SQL
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('job_signals')
      .select('company_name, job_family, intent_score, created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[intelligence/velocity] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate per company — mirrors the GROUP BY + HAVING COUNT(*) >= 2 in Section 16
    const companyMap = new Map<string, {
      signal_count: number;
      families: Set<string>;
      peak_score: number | null;
      first_seen: string;
      last_seen: string;
    }>();

    for (const row of data ?? []) {
      const key = row.company_name;
      if (!companyMap.has(key)) {
        companyMap.set(key, {
          signal_count: 0,
          families: new Set(),
          peak_score: null,
          first_seen: row.created_at,
          last_seen: row.created_at,
        });
      }
      const entry = companyMap.get(key)!;
      entry.signal_count += 1;
      if (row.job_family) entry.families.add(row.job_family);
      if (row.intent_score !== null) {
        entry.peak_score = entry.peak_score === null
          ? row.intent_score
          : Math.max(entry.peak_score, row.intent_score);
      }
      // created_at rows come back descending, so last_seen = first row seen per company
      if (row.created_at > entry.last_seen) entry.last_seen = row.created_at;
      if (row.created_at < entry.first_seen) entry.first_seen = row.created_at;
    }

    // Apply HAVING COUNT(*) >= 2 and sort by signal_count DESC
    const velocityCompanies: VelocityCompany[] = Array.from(companyMap.entries())
      .filter(([, v]) => v.signal_count >= 2)
      .map(([company_name, v]) => ({
        company_name,
        signal_count: v.signal_count,
        families: Array.from(v.families).sort(),
        peak_score: v.peak_score,
        first_seen: v.first_seen,
        last_seen: v.last_seen,
      }))
      .sort((a, b) => b.signal_count - a.signal_count);

    return NextResponse.json({ companies: velocityCompanies });

  } catch (err) {
    console.error('[intelligence/velocity] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
