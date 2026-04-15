import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';
import type { JobFamily } from '@/lib/types';
import { computeScoreComponents, computeIntentScore, computeSeniorityLabel } from '@/lib/scoring';

export const dynamic = 'force-dynamic'; // Never cache — data updates daily

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(request.url);

    // Parse filters from query string
    const minScore = Math.max(1, Math.min(10,
      parseInt(searchParams.get('min_score') ?? '1')
    ));
    const families = searchParams.getAll('family') as JobFamily[];
    const hotOnly  = searchParams.get('hot') === 'true';
    const search   = searchParams.get('search')?.trim() ?? '';
    const tags     = searchParams.getAll('tag');

    // Build query against the view (includes tech_stack array)
    let query = supabase
      .from('signals_with_tags')
      .select('*')
      .gte('intent_score', minScore)
      .order('created_at', { ascending: false })
      .limit(200);

    if (families.length > 0) query = query.in('job_family', families);
    if (hotOnly)              query = query.eq('is_hot_lead', true);
    if (search)               query = query.ilike('company_name', `%${search}%`);

    const { data, error } = await query;

    if (error) {
      console.error('[signals/route] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Tag filter: Supabase doesn't support array overlap in .filter() easily,
    // so we post-filter in JS. At 200 row limit this is negligible overhead.
    const filtered = tags.length > 0
      ? (data ?? []).filter(row =>
          tags.some(t => (row.tech_stack as string[])?.includes(t))
        )
      : (data ?? []);

    // Enrich each signal with deterministic score components.
    // computed_score replaces intent_score as the display source of truth.
    const enriched = filtered.map(signal => {
      const components = computeScoreComponents({
        job_title:       signal.job_title,
        raw_description: signal.raw_description,
        tech_stack:      signal.tech_stack as string[],
        created_at:      signal.created_at,
      });
      return {
        ...signal,
        score_components: components,
        computed_score:   computeIntentScore(components),
        seniority_label:  computeSeniorityLabel(signal.job_title),
      };
    });

    return NextResponse.json({
      signals: enriched,
      count: enriched.length,
    });

  } catch (err) {
    console.error('[signals/route] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
