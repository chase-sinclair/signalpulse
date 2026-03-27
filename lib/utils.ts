// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * Formats an ISO timestamp string as a human-readable relative time.
 * Used for the `created_at` field (which IS a real timestamp).
 * Do NOT use for `posted_at` — that is a raw TEXT string from SerpApi.
 */
export function relativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Formats an ISO date string as a short date label.
 * Used for week_start dates on the Companies page.
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── String helpers ──────────────────────────────────────────────────────────

/**
 * Truncates a string to maxLength characters, appending "…" if cut.
 */
export function truncate(str: string | null | undefined, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

/**
 * Returns 1-2 uppercase initials from a company name.
 * Used as a favicon fallback when domain is null.
 */
export function companyInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// ─── Number helpers ──────────────────────────────────────────────────────────

/**
 * Computes the mean of an array of numbers, ignoring nulls.
 * Returns 0 if the array is empty or all values are null.
 */
export function mean(values: (number | null)[]): number {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

/**
 * Formats a delta value as "+3" or "-2" with sign prefix.
 * Used alongside WeeklyDeltaBadge for accessible titles.
 */
export function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}
