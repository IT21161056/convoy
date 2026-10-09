/** Short relative time: "2 seconds ago", "4 minutes ago", "over an hour ago". */
export function timeAgo(isoOrTs: string | number, now: number = Date.now()): string {
  const then = typeof isoOrTs === "number" ? isoOrTs : new Date(isoOrTs).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hour ago";
  if (diffHr < 24) return `${diffHr} hours ago`;

  return "over a day ago";
}
