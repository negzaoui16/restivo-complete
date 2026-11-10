"use client";

import { useState } from "react";
import { Search, Square, Users } from "lucide-react";
import type { TableRow } from "../_lib/tables-ui";

export function TablesList({ floorName, rows }: { floorName: string | null; rows: TableRow[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((row) => `${row.num} ${row.shape}`.toLowerCase().includes(needle))
    : rows;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E5DFD3] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#E5DFD3] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Tables</h2>
          <p className="text-[13px] text-[#8C877D]">
            {floorName ? `${rows.length} on ${floorName}` : "Choose a floor to see its tables."}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8C877D]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tables"
            className="w-full rounded-lg bg-[#F5F2EC] py-1.5 pr-4 pl-9 text-[13px] focus:ring-1 focus:ring-[#B8573A] focus:outline-none sm:w-64"
          />
        </div>
      </div>
      <TablesTable rows={visible} hasTables={rows.length > 0} />
    </section>
  );
}

function TablesTable({ rows, hasTables }: { rows: TableRow[]; hasTables: boolean }) {
  if (!hasTables) {
    return (
      <p className="px-6 py-10 text-sm text-[#736D65]">
        No tables on this floor yet. Drag one onto the plan, then save.
      </p>
    );
  }

  if (rows.length === 0) {
    return <p className="px-6 py-10 text-sm text-[#736D65]">No tables match that search.</p>;
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-[#E5DFD3]">
          <th className="w-1/3 px-6 py-3 text-[12px] font-bold tracking-wider text-[#8C877D] uppercase">Table</th>
          <th className="w-1/4 px-6 py-3 text-[12px] font-bold tracking-wider text-[#8C877D] uppercase">Capacity</th>
          <th className="w-1/4 px-6 py-3 text-[12px] font-bold tracking-wider text-[#8C877D] uppercase">Shape</th>
          <th className="px-6 py-3 text-[12px] font-bold tracking-wider text-[#8C877D] uppercase">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((table) => (
          <tr key={table.num} className="border-b border-[#E5DFD3] transition-colors last:border-0 hover:bg-[#F9F7F4]">
            <td className="px-6 py-3">
              <span className="text-[14px] font-semibold">{table.num}</span>
            </td>
            <td className="px-6 py-3">
              <span className="flex items-center gap-1.5 text-[14px] text-[#6B665E]">
                <Users className="h-4 w-4" />
                {table.cap}
              </span>
            </td>
            <td className="px-6 py-3">
              <span className="flex items-center gap-1.5 text-[14px] text-[#6B665E]">
                <Square className="h-4 w-4" />
                {table.shape}
              </span>
            </td>
            <td className="px-6 py-3">
              <span className={`rounded-md px-2.5 py-1 text-[12px] font-bold ${table.statusColor}`}>{table.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
