"use client";

import { useState } from "react";
import { NEEDS_CONFIRMATION } from "../../_lib/status";

type Action = { status: string; label: string };

/**
 * One button per allowed move. Cancel and No-show first ask for a confirmation
 * inside the page (no window.confirm), saying what else will change.
 */
export function ActionButtons({
  actions,
  busy,
  confirmText,
  onRun,
}: {
  actions: Action[];
  busy: boolean;
  /** What the confirmation says for a destructive move. */
  confirmText: (status: string) => string;
  onRun: (status: string) => void;
}) {
  const [asking, setAsking] = useState<Action | null>(null);

  if (actions.length === 0) return null;

  if (asking) {
    return (
      <div className="w-full rounded-lg border border-red-100 bg-red-50 px-3 py-2.5" role="alert">
        <p className="text-xs font-medium text-red-700">{confirmText(asking.status)}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onRun(asking.status);
              setAsking(null);
            }}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            {asking.label}
          </button>
          <button
            type="button"
            onClick={() => setAsking(null)}
            className="rounded-lg border border-[#E8E2D7] bg-white px-3 py-1.5 text-xs font-semibold"
          >
            Keep
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const destructive = NEEDS_CONFIRMATION.includes(action.status);
        return (
          <button
            key={action.status}
            type="button"
            disabled={busy}
            onClick={() => (destructive ? setAsking(action) : onRun(action.status))}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${
              destructive
                ? "border border-red-200 bg-white text-red-600 hover:bg-red-50"
                : "bg-[#B55234] text-white hover:bg-[#9E4328]"
            }`}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
