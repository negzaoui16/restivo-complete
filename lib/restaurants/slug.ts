const MAX_SLUG_LENGTH = 56;

export function slugifyRestaurantName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH);

  return slug.length > 0 ? slug : "restaurant";
}

export function slugCandidate(base: string, attempt: number): string {
  if (attempt === 0) return base;
  const suffix = attempt < 8 ? String(attempt + 1) : randomSuffix();
  const trimmed = base.slice(0, Math.max(1, MAX_SLUG_LENGTH - suffix.length - 1));
  return `${trimmed}-${suffix}`;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
