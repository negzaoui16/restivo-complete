export function matchesRoster(text: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle.length === 0 || text.toLowerCase().includes(needle);
}

export function sinceLabel(iso: string | null): string {
  if (!iso) return "Today";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Today";
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export function sentLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
