export function profileInitials(
  firstName?: string | null,
  lastName?: string | null,
  displayName?: string | null
): string {
  const first = firstName?.trim().charAt(0);
  const last = lastName?.trim().charAt(0);
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();

  const display = displayName?.trim();
  if (display && display.length >= 2) return display.slice(0, 2).toUpperCase();
  if (display) return display.charAt(0).toUpperCase();
  return "R";
}

export function formatMemberSince(createdAt: unknown): string | null {
  if (!createdAt) return null;

  const iso =
    typeof createdAt === "string"
      ? createdAt
      : typeof createdAt === "object" &&
          createdAt !== null &&
          "toJSON" in createdAt &&
          typeof (createdAt as { toJSON: () => string }).toJSON === "function"
        ? (createdAt as { toJSON: () => string }).toJSON()
        : String(createdAt);

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
