"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Armchair, CheckCircle2, Clock, Loader2, Search, UserCheck, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiStaffFloors } from "@/lib/staff/board-client";
import type { StaffReservation } from "@/lib/staff/board-types";

type TableStatus = "OCCUPIED" | "RESERVED" | "AVAILABLE";

interface StaffTableItem {
  id: string;
  name: string;
  capacity: number;
  floorName: string;
  status: TableStatus;
  activeReservation?: StaffReservation;
}

export function StaffTablesView({
  restaurantId,
  reservations,
  search = "",
  onMoveReservation,
  busyId,
}: {
  restaurantId: string;
  reservations: StaffReservation[];
  search?: string;
  onMoveReservation?: (id: string, action: any) => void;
  busyId?: string | null;
}) {
  const { getAccessToken } = useAuth();
  const [floors, setFloors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = getAccessToken();
        if (!token) return;
        const res = await apiStaffFloors(token, restaurantId);
        if (!cancelled && res.ok) {
          setFloors(res.floors || []);
        }
      } catch (e) {
        // Fallback gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, getAccessToken]);

  // Extract all tables across floors
  const allTables = useMemo(() => {
    const list: StaffTableItem[] = [];

    // 1. Tables defined in floor plans
    for (const floor of floors) {
      const objects = floor.objects || [];
      for (const obj of objects) {
        if (
          obj.type === "table" ||
          obj.type === "rect_table" ||
          obj.type === "round_table" ||
          obj.kind === "table" ||
          obj.data?.label
        ) {
          const tableName = obj.data?.label || obj.label || `Table ${list.length + 1}`;
          list.push({
            id: obj.id || `tbl-${list.length + 1}`,
            name: tableName,
            capacity: obj.data?.seats || obj.seats || 4,
            floorName: floor.name || "Salle Principale",
            status: "AVAILABLE",
          });
        }
      }
    }

    // 2. If no floor plan exists yet, infer tables from today's reservations
    if (list.length === 0) {
      const knownNames = new Set<string>();
      for (const r of reservations) {
        if (r.tableName && !knownNames.has(r.tableName.toLowerCase())) {
          knownNames.add(r.tableName.toLowerCase());
          list.push({
            id: `inferred-${r.tableName}`,
            name: r.tableName,
            capacity: r.guestCount || 4,
            floorName: "Salle Principale",
            status: "AVAILABLE",
          });
        }
      }
      // Guarantee at least standard tables if venue is empty
      if (list.length === 0) {
        for (let i = 1; i <= 10; i++) {
          list.push({
            id: `default-${i}`,
            name: `Table ${i}`,
            capacity: i % 2 === 0 ? 4 : 2,
            floorName: "Salle Principale",
            status: "AVAILABLE",
          });
        }
      }
    }

    // Match each table with today's live reservations
    return list.map((tbl) => {
      const activeRes = reservations.find((r) => {
        const matchesTable =
          r.tableName?.trim().toLowerCase() === tbl.name.trim().toLowerCase();
        return matchesTable && (r.status === "SEATED" || r.status === "CONFIRMED" || r.status === "PENDING");
      });

      if (!activeRes) {
        return tbl;
      }

      let status: TableStatus = "AVAILABLE";
      if (activeRes.status === "SEATED") {
        status = "OCCUPIED";
      } else if (activeRes.status === "CONFIRMED" || activeRes.status === "PENDING") {
        status = "RESERVED";
      }

      return {
        ...tbl,
        status,
        activeReservation: activeRes,
      };
    });
  }, [floors, reservations]);

  // Filtered tables
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allTables.filter((tbl) => {
      if (selectedFloor !== "all" && tbl.floorName !== selectedFloor) return false;
      if (statusFilter !== "all" && tbl.status !== statusFilter) return false;
      if (needle) {
        const matchName = tbl.name.toLowerCase().includes(needle);
        const matchGuest = tbl.activeReservation?.customerName.toLowerCase().includes(needle);
        if (!matchName && !matchGuest) return false;
      }
      return true;
    });
  }, [allTables, selectedFloor, statusFilter, search]);

  const counts = useMemo(() => {
    let occupied = 0;
    let reserved = 0;
    let available = 0;
    for (const t of allTables) {
      if (t.status === "OCCUPIED") occupied++;
      else if (t.status === "RESERVED") reserved++;
      else available++;
    }
    return { total: allTables.length, occupied, reserved, available };
  }, [allTables]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#736D65]">
        <Loader2 className="w-4 h-4 animate-spin text-[#B55234]" />
        <span>Chargement des tables du restaurant...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 select-none">
      {/* ─── Metric Pills Banner ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-[#EDE7DC] shadow-xs">
          <p className="text-[11px] font-bold text-[#8C857B] uppercase tracking-wider">Total Tables</p>
          <p className="text-xl font-extrabold text-[#1A1A1A] mt-1">{counts.total}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-[#EDE7DC] shadow-xs">
          <p className="text-[11px] font-bold text-[#15803d] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#15803d] animate-pulse" />
            Occupées (En Service)
          </p>
          <p className="text-xl font-extrabold text-[#15803d] mt-1">{counts.occupied}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-[#EDE7DC] shadow-xs">
          <p className="text-[11px] font-bold text-[#d97706] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#d97706]" />
            Réservées Aujourd&apos;hui
          </p>
          <p className="text-xl font-extrabold text-[#d97706] mt-1">{counts.reserved}</p>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-[#EDE7DC] shadow-xs">
          <p className="text-[11px] font-bold text-[#6B6661] uppercase tracking-wider">Libres / Prêtes</p>
          <p className="text-xl font-extrabold text-[#1A1A1A] mt-1">{counts.available}</p>
        </div>
      </div>

      {/* ─── Filters Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-white border border-[#EDE7DC]">
        {/* Floor Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedFloor("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              selectedFloor === "all"
                ? "bg-[#B55234] text-white shadow-2xs"
                : "text-[#6B6661] hover:bg-[#FAF7F2] hover:text-[#1A1A1A]"
            }`}
          >
            Toutes les salles
          </button>
          {floors.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFloor(f.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedFloor === f.name
                  ? "bg-[#B55234] text-white shadow-2xs"
                  : "text-[#6B6661] hover:bg-[#FAF7F2] hover:text-[#1A1A1A]"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1">
          {[
            { id: "all", label: "Toutes" },
            { id: "OCCUPIED", label: "Occupées" },
            { id: "RESERVED", label: "Réservées" },
            { id: "AVAILABLE", label: "Libres" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === s.id
                  ? "bg-[#FAF0EA] text-[#B55234] border border-[#F0D5C9]"
                  : "text-[#7A746B] hover:text-[#1A1A1A]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Tables Grid ─── */}
      {filtered.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white border border-[#EDE7DC] text-center text-sm text-[#736D65]">
          Aucune table ne correspond à vos filtres.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map((tbl) => {
            const isBusy = busyId === tbl.activeReservation?.id;
            const res = tbl.activeReservation;

            return (
              <div
                key={tbl.id}
                className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                  tbl.status === "OCCUPIED"
                    ? "bg-gradient-to-br from-emerald-50/50 via-white to-white border-emerald-300 shadow-xs ring-1 ring-emerald-400/20"
                    : tbl.status === "RESERVED"
                    ? "bg-gradient-to-br from-amber-50/40 via-white to-white border-amber-300 shadow-xs"
                    : "bg-white border-[#EDE7DC] hover:border-[#D5CEC0]"
                }`}
              >
                <div>
                  {/* Table Header: Name & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tbl.status === "OCCUPIED"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : tbl.status === "RESERVED"
                            ? "bg-amber-500 text-white"
                            : "bg-[#FAF0EA] text-[#B55234]"
                        }`}
                      >
                        <Armchair className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1A1A1A]">{tbl.name}</h4>
                        <p className="text-[11px] text-[#7A746B] flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tbl.capacity} places · {tbl.floorName}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tbl.status === "OCCUPIED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : tbl.status === "RESERVED"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                      }`}
                    >
                      {tbl.status === "OCCUPIED"
                        ? "En Service"
                        : tbl.status === "RESERVED"
                        ? "Réservée"
                        : "Disponible"}
                    </span>
                  </div>

                  {/* Reservation Details if Active */}
                  {res ? (
                    <div className="mt-3 p-2.5 rounded-xl bg-black/[0.02] border border-black/[0.04] space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#1A1A1A]">
                        <span>Client : {res.customerName}</span>
                        <span className="text-[11px] text-[#736D65]">{res.guestCount} pers.</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#736D65]">
                        <Clock className="w-3 h-3" />
                        <span>Créneau : {new Date(res.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {res.notes && (
                        <p className="text-[10px] text-[#A39C91] italic truncate">&ldquo;{res.notes}&rdquo;</p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-3 p-2.5 rounded-xl bg-zinc-50/50 border border-zinc-100 text-center">
                      <span className="text-[11px] text-[#8C857B]">Prête à accueillir des clients</span>
                    </div>
                  )}
                </div>

                {/* Staff Actions */}
                {res && onMoveReservation && (
                  <div className="pt-2 border-t border-[#EDE7DC]/80 flex gap-2">
                    {res.status === "CONFIRMED" || res.status === "PENDING" ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onMoveReservation(res.id, "SEATED")}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Installer (Seat)</span>
                      </button>
                    ) : res.status === "SEATED" ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onMoveReservation(res.id, "COMPLETED")}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B55234] hover:bg-[#9E4328] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Libérer la Table</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
