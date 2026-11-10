"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Layers, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiListFloors } from "@/lib/floors/client";
import { apiLiveState } from "@/lib/live/client";
import { liveDisplay, slotTimer, type LiveDisplayKind } from "@/lib/live/state";
import type { LiveAction, LiveState, LiveTable } from "@/lib/live/types";
import { apiSetReservationStatus } from "@/lib/manager/client";
import { formatSlotTime } from "@/lib/reservations/format";
import { availableReservationActions } from "@/lib/reservations/transitions";
import { FloorPlanReadOnly, type LiveTone } from "../../../_components/FloorPlanReadOnly";
import { FloorPlanReadOnly3D } from "../../../_components/floor-3d/FloorPlanReadOnly3D";
import { RESERVATION_ACTION_LABEL } from "../../_lib/status";
import { useManagerQuery } from "../../_lib/use-manager-query";
import { ActionButtons } from "../manage/ActionButtons";

const LIVE_POLL_MS = 20_000;
const FLOORS_POLL_MS = 10 * 60_000;

const TONE: Record<LiveDisplayKind, LiveTone> = {
  FREE: { color: "#2E7D32", label: "Free" },
  RESERVED_SOON: { color: "#C98A00", label: "Reserved soon" },
  WAITING: { color: "#6B4FBB", label: "Waiting" },
  OCCUPIED: { color: "#B55234", label: "Occupied" },
  OVERDUE: { color: "#C62828", label: "Overdue" },
};
const STATES: LiveDisplayKind[] = ["FREE", "RESERVED_SOON", "WAITING", "OCCUPIED", "OVERDUE"];

/** The colour and the wording of a table on the screen, from the server clock. */
function displayOf(table: LiveTable, nowMs: number) {
  const shown = liveDisplay(
    table.state,
    table.current ? { status: table.current.status, startsAtMs: Date.parse(table.current.startsAt) } : null,
    nowMs,
  );
  return { color: TONE[shown.kind].color, label: shown.label };
}

/** Server time, ticking every second from the instant the last response carried. */
function useServerNow(live: LiveState | null): number {
  const [local, setLocal] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const serverNow = live?.now;
  useEffect(() => {
    const timer = window.setInterval(() => setLocal(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (serverNow) {
      const measured = Date.parse(serverNow) - Date.now();
      const id = window.setTimeout(() => setOffset(measured), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [serverNow]);
  return local + offset;
}

function minutesText(minutes: number): string {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const rest = Math.abs(minutes) % 60;
  return hours > 0 ? `${hours} h ${String(rest).padStart(2, "0")} min` : `${rest} min`;
}

export function LiveFloorPlan({ restaurantId }: { restaurantId: string }) {
  const { getFreshAccessToken } = useAuth();
  const liveFetcher = useCallback((token: string) => apiLiveState(token, restaurantId), [restaurantId]);
  const floorsFetcher = useCallback((token: string) => apiListFloors(token, restaurantId), [restaurantId]);
  const live = useManagerQuery(liveFetcher, LIVE_POLL_MS);
  const floors = useManagerQuery(floorsFetcher, FLOORS_POLL_MS);

  const [floorChoice, setFloorChoice] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const now = useServerNow(live.data);
  const state = live.data;
  const floorId = floorChoice && state?.floors.some((floor) => floor.id === floorChoice) ? floorChoice : (state?.floors[0]?.id ?? null);
  const layout = floors.data?.find((floor) => floor.id === floorId) ?? null;
  const tablesOnFloor = state?.tables.filter((table) => table.floorId === floorId) ?? [];
  const selected = state?.tables.find((table) => table.id === tableId) ?? null;

  const tones: Record<string, LiveTone> = {};
  for (const table of tablesOnFloor) tones[table.id] = displayOf(table, now);

  async function run(reservationId: string, status: LiveAction) {
    setBusy(true);
    setProblem(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      await apiSetReservationStatus(token, restaurantId, reservationId, status);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Could not update the reservation.");
    } finally {
      setBusy(false);
      live.refresh();
    }
  }

  if (live.error && !state) {
    return (
      <div role="alert" className="rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-4 py-3 text-sm text-[#B55234]">
        {live.error}{" "}
        <button type="button" onClick={live.refresh} className="font-bold underline">
          Try again
        </button>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="flex items-center justify-center gap-2 py-14 text-sm text-[#736D65]" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading the live floor...
      </div>
    );
  }
  if (state.floors.length === 0) {
    return (
      <p className="rounded-xl border border-[#E8E2D7] bg-white px-4 py-6 text-center text-sm text-[#736D65]">
        No active floor with tables yet. Activate a floor in Tables to see it live.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(live.error || problem) && (
        <p role="alert" className="rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-3 py-2 text-xs font-semibold text-[#B55234]">
          {problem ?? `${live.error} Showing the last data.`}{" "}
          <button type="button" onClick={live.refresh} className="font-bold underline">
            Try again
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Floor" className="flex flex-wrap gap-1.5">
          {state.floors.map((floor) => (
            <button
              key={floor.id}
              type="button"
              role="tab"
              aria-selected={floor.id === floorId}
              onClick={() => {
                setFloorChoice(floor.id);
                setTableId(null);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                floor.id === floorId
                  ? "border-[#B55234] bg-[#FAF0EA] text-[#B55234]"
                  : "border-[#E8E2D7] bg-white text-[#524D48] hover:bg-black/5"
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#524D48]" aria-label="Legend">
            {STATES.map((key) => (
              <li key={key} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border-2" style={{ borderColor: TONE[key].color, backgroundColor: `${TONE[key].color}40` }} />
                {TONE[key].label}
              </li>
            ))}
          </ul>

          <div className="inline-flex items-center rounded-lg border border-[#E5DFD3] bg-[#F5F2EB] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "2d" ? "bg-white text-[#B55234] shadow-xs" : "text-[#6B665E] hover:text-[#3A3530]"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              2D
            </button>
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === "3d" ? "bg-white text-[#B55234] shadow-xs" : "text-[#6B665E] hover:text-[#3A3530]"
              }`}
            >
              <Box className="h-3.5 w-3.5" />
              3D
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {layout ? (
          viewMode === "2d" ? (
            <FloorPlanReadOnly
              width={layout.width}
              height={layout.height}
              objects={layout.objects}
              liveTables={tones}
              selectedTableId={tableId}
              onSelectTable={setTableId}
            />
          ) : (
            <FloorPlanReadOnly3D
              width={layout.width}
              height={layout.height}
              objects={layout.objects}
              liveTables={tones}
              selectedTableId={tableId}
              onSelectTable={setTableId}
            />
          )
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-[#E5DFD3] bg-[#F5F2EB] py-20 text-sm text-[#736D65]" role="status">
            {floors.error ? (
              <span role="alert">
                {floors.error}{" "}
                <button type="button" onClick={floors.refresh} className="font-bold underline">
                  Try again
                </button>
              </span>
            ) : (
              "Loading the plan..."
            )}
          </div>
        )}

        <TablePanel table={selected} state={state} now={now} busy={busy} onRun={run} />
      </div>
    </div>
  );
}

function TablePanel({
  table,
  state,
  now,
  busy,
  onRun,
}: {
  table: LiveTable | null;
  state: LiveState;
  now: number;
  busy: boolean;
  onRun: (reservationId: string, status: LiveAction) => void;
}) {
  if (!table) {
    return (
      <aside className="rounded-2xl border border-[#E8E2D7] bg-white p-4 text-sm text-[#736D65]">
        Pick a table on the plan to see its guests, timers and actions.
      </aside>
    );
  }
  const current = table.current;
  const timer = current ? slotTimer(now, Date.parse(current.startsAt), Date.parse(current.endsAt)) : null;
  const shown = displayOf(table, now);
  // Computed on the server clock every second, so No-show appears right at 15 minutes after the start.
  const actions = current
    ? availableReservationActions(current.status, {
        nowMs: now,
        startsAtMs: Date.parse(current.startsAt),
        endsAtMs: Date.parse(current.endsAt),
      }).filter((to): to is LiveAction => to === "SEATED" || to === "COMPLETED" || to === "NO_SHOW")
    : [];
  return (
    <aside className="flex flex-col gap-3 rounded-2xl border border-[#E8E2D7] bg-white p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-[#1A1A1A]">{table.name}</h2>
          <p className="text-xs text-[#736D65]">{table.capacity} seats</p>
        </div>
        <span
          className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ borderColor: shown.color, color: shown.color }}
        >
          {shown.label}
        </span>
      </div>

      {current && timer ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="font-semibold text-[#1A1A1A]">
            {current.customerName} · {current.guestCount} {current.guestCount === 1 ? "guest" : "guests"}
          </p>
          <p className="text-xs text-[#524D48]">
            {formatSlotTime(current.startsAt, state.timezone)}–{formatSlotTime(current.endsAt, state.timezone)} · Code{" "}
            <span className="font-mono font-semibold">{current.code}</span>
          </p>
          {current.status === "SEATED" ? (
            <p className="text-xs text-[#524D48]">
              Seated · {minutesText(timer.elapsedMinutes)} elapsed ·{" "}
              {timer.remainingMinutes >= 0 ? (
                <>{minutesText(timer.remainingMinutes)} left</>
              ) : (
                <span className="font-semibold text-[#C62828]">{minutesText(timer.remainingMinutes)} over</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-[#524D48]">
              {timer.startsInMinutes > 0 ? `Arrives in ${minutesText(timer.startsInMinutes)}` : `Expected ${minutesText(timer.elapsedMinutes)} ago`}
            </p>
          )}
          {current.notes ? <p className="text-xs italic text-[#736D65]">“{current.notes}”</p> : null}
          <ActionButtons
            actions={actions.map((status) => ({ status, label: RESERVATION_ACTION_LABEL[status] ?? status }))}
            busy={busy}
            confirmText={() => "The guests did not show up. The table is released."}
            onRun={(status) => onRun(current.id, status as LiveAction)}
          />
        </div>
      ) : (
        <p className="text-sm text-[#736D65]">No guests right now.</p>
      )}

      {table.next ? (
        <p className="border-t border-[#F0EBDF] pt-2 text-xs text-[#524D48]">
          Next: {formatSlotTime(table.next.startsAt, state.timezone)} · {table.next.customerName} ({table.next.guestCount})
        </p>
      ) : null}
    </aside>
  );
}
