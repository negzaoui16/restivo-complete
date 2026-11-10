/**
 * Moving a category or a dish one step up or down.
 *
 * Sort orders can have gaps or ties (after deletions), so the list is first
 * put in a stable order, then the two neighbours swap places. Only rows whose
 * order changed are returned, so the caller writes as little as possible.
 */

export type Direction = "up" | "down";
export type Ordered = { id: string; sortOrder: number };

/** Rows in display order: by sortOrder, ties broken by id. */
export function sortedRows<T extends Ordered>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/**
 * New sortOrder (0..n-1) for each row that must change, or null when the row is
 * missing or already at the edge in that direction.
 */
export function moveRow(rows: Ordered[], id: string, direction: Direction): Ordered[] | null {
  const ordered = sortedRows(rows);
  const from = ordered.findIndex((row) => row.id === id);
  if (from === -1) return null;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ordered.length) return null;

  const ids = ordered.map((row) => row.id);
  [ids[from], ids[to]] = [ids[to], ids[from]];
  const before = new Map(rows.map((row) => [row.id, row.sortOrder]));
  return ids
    .map((rowId, index) => ({ id: rowId, sortOrder: index }))
    .filter((row) => before.get(row.id) !== row.sortOrder);
}
