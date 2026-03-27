import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from('signal_tags')
      .select('tag')
      .order('tag');

    if (error) {
      console.error('[tags/route] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Deduplicate — signal_tags has one row per (signal_id, tag) pair
    const tags = [...new Set((data ?? []).map((row) => row.tag))].sort();

    return NextResponse.json({ tags });
  } catch (err) {
    console.error('[tags/route] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
