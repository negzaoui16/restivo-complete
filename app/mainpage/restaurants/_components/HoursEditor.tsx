"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Loader2, Moon } from "lucide-react";
import { ApiError, useAuth } from "@/contexts/AuthContext";
import { apiGetHours, apiUpdateHours } from "@/lib/restaurants/client";
import { closesNextDay, DAY_NAMES, hoursProblem } from "@/lib/restaurants/hours";
import type { PublicHoursDay } from "@/lib/restaurants/service";

/** Monday first, as people read a week; stored days are 0 = Sunday. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIME_INPUT =
  "h-9 rounded-lg border border-[#DFD8CC] bg-white px-2 text-sm text-[#1A1A1A] focus:border-[#B55234] focus:outline-none focus:ring-2 focus:ring-[#B55234]/15 disabled:opacity-50";

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "ready" };

/** Weekly opening hours of one restaurant: loads them, edits them, saves them in one request. */
export function HoursEditor({ restaurantId }: { restaurantId: string }) {
  const { getFreshAccessToken } = useAuth();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [saved, setSaved] = useState<PublicHoursDay[]>([]);
  const [days, setDays] = useState<PublicHoursDay[]>([]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getFreshAccessToken();
        if (!token) throw new Error("Your session expired. Sign in again.");
        const hours = await apiGetHours(token, restaurantId);
        if (cancelled) return;
        setSaved(hours);
        setDays(hours);
        setLoad({ state: "ready" });
      } catch (err) {
        if (!cancelled) setLoad({ state: "error", message: err instanceof Error ? err.message : "Could not load the hours." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, attempt, getFreshAccessToken]);

  const dirty = JSON.stringify(days) !== JSON.stringify(saved);
  const problems = days.map((day) => hoursProblem(day));

  function update(dayOfWeek: number, patch: Partial<PublicHoursDay>) {
    setNotice(false);
    setServerError(null);
    setDays((prev) => prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)));
  }

  async function save() {
    setShowErrors(true);
    if (problems.some(Boolean)) return;
    setSaving(true);
    setServerError(null);
    setNotice(false);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      const hours = await apiUpdateHours(token, restaurantId, days);
      setSaved(hours);
      setDays(hours);
      setShowErrors(false);
      setNotice(true);
    } catch (err) {
      setServerError(err instanceof ApiError || err instanceof Error ? err.message : "Could not save the hours.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 bg-white rounded-2xl border border-[#ECE7DC]">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#8C857B] mb-3">
        <Clock className="w-4 h-4 text-[#B55234]" aria-hidden="true" />
        <span>Weekly service schedule</span>
      </div>

      {load.state === "loading" && (
        <p className="flex items-center gap-2 py-6 text-xs text-[#736D65]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading the hours...
        </p>
      )}

      {load.state === "error" && (
        <p role="alert" className="py-4 text-xs text-[#B55234]">
          {load.message}{" "}
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="font-bold underline">
            Try again
          </button>
        </p>
      )}

      {load.state === "ready" && (
        <>
          <ul className="divide-y divide-[#F4EFEB]">
            {DISPLAY_ORDER.map((dayOfWeek) => {
              const day = days.find((entry) => entry.dayOfWeek === dayOfWeek);
              if (!day) return null;
              const problem = showErrors ? problems[days.indexOf(day)] : null;
              const overnight = !day.isClosed && closesNextDay(day.openTime, day.closeTime);
              return (
                <li key={dayOfWeek} className="py-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <label className="flex w-36 items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                      <input
                        type="checkbox"
                        checked={!day.isClosed}
                        disabled={saving}
                        onChange={(event) =>
                          update(dayOfWeek, {
                            isClosed: !event.target.checked,
                            openTime: event.target.checked ? (day.openTime ?? "11:00") : day.openTime,
                            closeTime: event.target.checked ? (day.closeTime ?? "23:00") : day.closeTime,
                          })
                        }
                        aria-label={`${DAY_NAMES[dayOfWeek]} is open`}
                      />
                      {DAY_NAMES[dayOfWeek]}
                    </label>

                    {day.isClosed ? (
                      <span className="text-xs text-[#736D65]">Closed</span>
                    ) : (
                      <>
                        <input
                          type="time"
                          value={day.openTime ?? ""}
                          disabled={saving}
                          onChange={(event) => update(dayOfWeek, { openTime: event.target.value || null })}
                          aria-label={`${DAY_NAMES[dayOfWeek]} opening time`}
                          aria-invalid={problem?.field === "openTime" ? true : undefined}
                          className={TIME_INPUT}
                        />
                        <span className="text-xs text-[#736D65]">to</span>
                        <input
                          type="time"
                          value={day.closeTime ?? ""}
                          disabled={saving}
                          onChange={(event) => update(dayOfWeek, { closeTime: event.target.value || null })}
                          aria-label={`${DAY_NAMES[dayOfWeek]} closing time`}
                          aria-invalid={problem?.field === "closeTime" ? true : undefined}
                          className={TIME_INPUT}
                        />
                        {overnight && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF1FA] px-2 py-0.5 text-[11px] font-semibold text-[#3A4F8F]">
                            <Moon className="h-3 w-3" aria-hidden="true" />
                            closes the next day
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {problem && <p className="mt-1 text-xs font-medium text-red-600">{problem.message}</p>}
                </li>
              );
            })}
          </ul>

          {serverError && (
            <p role="alert" className="mt-3 rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-3 py-2 text-xs font-semibold text-[#B55234]">
              {serverError}
            </p>
          )}

          <div className="mt-3 flex items-center justify-end gap-3">
            {notice && (
              <span role="status" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Hours saved
              </span>
            )}
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={() => void save()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#B55234] px-4 py-2 text-xs font-bold text-white hover:bg-[#9E4328] disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {saving ? "Saving..." : "Save hours"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
