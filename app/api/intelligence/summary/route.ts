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

    // Fetch tags joined with signal info — company name for breadth + intent_score for bubble chart
    const { data: tagRows, error: tagError } = await supabase
      .from('signal_tags')
      .select('tag, job_signals(company_name, intent_score)');

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

    // Aggregate top tags with mention count, distinct company count, and avg intent score
    const tagStats: Record<string, { mentions: number; companies: Set<string>; scores: number[] }> = {};
    for (const row of tagRows ?? []) {
      if (!row.tag) continue;
      if (!tagStats[row.tag]) tagStats[row.tag] = { mentions: 0, companies: new Set(), scores: [] };
      tagStats[row.tag].mentions += 1;
      // Supabase returns FK joins as arrays — take first element
      const signalArr = row.job_signals as { company_name: string; intent_score: number | null }[] | null;
      const signal = Array.isArray(signalArr) ? signalArr[0] : (signalArr as unknown as { company_name: string; intent_score: number | null } | null);
      if (signal?.company_name) tagStats[row.tag].companies.add(signal.company_name);
      if (signal?.intent_score != null) tagStats[row.tag].scores.push(signal.intent_score);
    }
    const allTagsSorted = Object.entries(tagStats)
      .map(([tag, s]) => ({
        tag,
        mentions: s.mentions,
        companies: s.companies.size,
        avg_score: s.scores.length > 0
          ? Math.round((s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 10) / 10
          : null,
      }))
      .sort((a, b) => b.mentions - a.mentions);

    const topTags = allTagsSorted.slice(0, 10);
    // Bubble chart uses top 12 by mention count (for visual richness)
    const bubbleData = allTagsSorted.slice(0, 12);

    // Derive KPI values from the aggregated data
    const totalSignals      = familyRows?.length ?? 0;
    const familiesActive    = familyBreakdown.length;
    const mostActiveTool    = topTags[0]?.tag ?? null;
    const hottestSector     = familyBreakdown[0]?.family ?? null;

    return NextResponse.json({
      kpi: { totalSignals, familiesActive, mostActiveTool, hottestSector },
      familyBreakdown,
      topTags,
      bubbleData,
    });

  } catch (err) {
    console.error('[intelligence/summary] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
