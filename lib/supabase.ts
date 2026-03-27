import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ── Validate env at module load time ────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_ANON_KEY');

// ── Browser client (Client Components only) ──────────────────────────────────
// Uses anon key. Respects Row Level Security.
export const supabaseBrowser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Server client (Server Components + Route Handlers) ──────────────────────
// Uses anon key + cookie-based auth context.
// Next.js 15+ requires cookies() to be awaited.
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Route Handlers can set cookies; Server Components cannot.
        // Errors here are safe to ignore — auth cookies simply won't persist.
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Intentionally swallowed — called from a read-only context (Server Component)
        }
      },
    },
  });
}

// ── Admin client (Server-only — n8n callbacks, service writes) ───────────────
// Uses service role key. BYPASSES Row Level Security.
// Never import this in client components or pages.
export function createSupabaseAdmin() {
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY — admin client unavailable');
  }
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY);
}
