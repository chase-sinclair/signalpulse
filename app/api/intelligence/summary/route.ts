import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    // Fetch all non-null job_families for breakdown
    const { data: familyRows, error: familyError } = await supabase
      .from('job_signals')
      .select('job_family')
      .not('job_family', 'is', null);

    if (familyError) {
      console.error('[intelligence/summary] family query error:', familyError.message);
      return NextResponse.json({ error: familyError.message }, { status: 500 });
    }

    // Fetch all tags for ranking
    const { data: tagRows, error: tagError } = await supabase
      .from('signal_tags')
      .select('tag');

    if (tagError) {
      console.error('[intelligence/summary] tag query error:', tagError.message);
      return NextResponse.json({ error: tagError.message }, { status: 500 });
    }

    // Aggregate family breakdown — matches Section 16 SQL exactly
    const familyCounts: Record<string, number> = {};
    for (const row of familyRows ?? []) {
      if (row.job_family) {
        familyCounts[row.job_family] = (familyCounts[row.job_family] ?? 0) + 1;
      }
    }
    const familyBreakdown = Object.entries(familyCounts)
      .map(([family, count]) => ({ family, count }))
      .sort((a, b) => b.count - a.count);

    // Aggregate top 10 tags — matches Section 16 SQL exactly
    const tagCounts: Record<string, number> = {};
    for (const row of tagRows ?? []) {
      if (row.tag) {
        tagCounts[row.tag] = (tagCounts[row.tag] ?? 0) + 1;
      }
    }
    const topTags = Object.entries(tagCounts)
      .map(([tag, mentions]) => ({ tag, mentions }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);

    // Derive KPI values from the aggregated data
    const totalSignals      = familyRows?.length ?? 0;
    const familiesActive    = familyBreakdown.length;
    const mostActiveTool    = topTags[0]?.tag ?? null;
    const hottestSector     = familyBreakdown[0]?.family ?? null;

    return NextResponse.json({
      kpi: { totalSignals, familiesActive, mostActiveTool, hottestSector },
      familyBreakdown,
      topTags,
    });

  } catch (err) {
    console.error('[intelligence/summary] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
