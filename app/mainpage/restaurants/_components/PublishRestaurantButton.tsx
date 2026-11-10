"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth, ApiError } from "@/contexts/AuthContext";
import { apiSetRestaurantStatus } from "@/lib/restaurants/client";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";

type Notice = { kind: "ok" | "error"; text: string };

/**
 * Lets an owner or manager make the current restaurant visible to customers.
 * The server decides whether the restaurant is ready (active floor with at
 * least one table) and the reason is shown here when it is not.
 */
export function PublishRestaurantButton() {
  const { currentRestaurant, updateRestaurantProfile } = useRestaurantManager();
  const { getFreshAccessToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  if (!currentRestaurant) return null;

  const { id, dbStatus } = currentRestaurant;

  if (dbStatus !== "ACTIVE" && dbStatus !== "DRAFT") {
    return (
      <span className="rounded-full border border-[#E8E2D7] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#736D65]">
        {dbStatus === "SUSPENDED" ? "Suspended" : "Archived"}
      </span>
    );
  }

  const published = dbStatus === "ACTIVE";

  async function change(next: "ACTIVE" | "DRAFT") {
    setBusy(true);
    setNotice(null);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new ApiError("MISSING_TOKEN", "Please sign in again.", 401);
      const result = await apiSetRestaurantStatus(token, id, next);
      updateRestaurantProfile(id, {
        dbStatus: result.status,
        status: result.status === "ACTIVE" ? "Open" : "Closed",
      });
      setNotice({
        kind: "ok",
        text:
          result.status === "ACTIVE"
            ? "Published. Customers can now find your restaurant."
            : "Back to draft. Customers can no longer see your restaurant.",
      });
    } catch (err) {
      setNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not update the restaurant.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {published ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3E8] px-3 py-1.5 text-xs font-bold text-[#2E7D32]">
            <Eye className="h-3.5 w-3.5" />
            Published
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Hide this restaurant from customers? Existing reservations are kept.")) {
                void change("DRAFT");
              }
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-[#DFD8CC] bg-white px-3 py-2 text-xs font-semibold text-[#1A1A1A] transition-all hover:bg-[#FAF7F2] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            Unpublish
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void change("ACTIVE")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#B55234] bg-white px-3.5 py-2 text-xs font-bold text-[#B55234] transition-all hover:bg-[#FAF0EA] active:scale-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          Publish restaurant
        </button>
      )}
      {notice ? (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`max-w-xs text-xs font-medium ${notice.kind === "error" ? "text-[#B55234]" : "text-[#2E7D32]"}`}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
