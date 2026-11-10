"use client";

import { profileInitials } from "../../../_lib/profile";
import { sentLabel } from "../_lib/roster";
import type { RosterRequest } from "@/lib/staff/types";

export function RequestList({
  requests,
  empty,
  pendingId,
  onAccept,
  onDecline,
}: {
  requests: RosterRequest[];
  empty: string;
  pendingId: string | null;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E5DFD3] bg-white shadow-sm">
      <header className="border-b border-[#E5DFD3] px-5 py-4">
        <h2 className="text-[15px] font-semibold">Want to join</h2>
        <p className="text-[13px] text-[#8C877D]">
          {requests.length === 0 ? "No open requests" : `${requests.length} asked to join`}
        </p>
      </header>
      {requests.length === 0 ? (
        <p className="px-5 py-10 text-sm text-[#736D65]">{empty}</p>
      ) : (
        <ul>
          {requests.map((request) => {
            const busy = pendingId === request.id;
            return (
              <li
                key={request.id}
                className="flex flex-col gap-3 border-b border-[#E5DFD3] px-5 py-4 last:border-0 sm:flex-row sm:items-center"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F4EE] text-[11px] font-bold text-[#6B665E]">
                  {profileInitials(null, null, request.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">{request.name}</p>
                  <p className="mt-1 text-[13px] text-[#736D65]">{request.message || "No note"}</p>
                  <p className="mt-1 text-[12px] text-[#A39C91]">{sentLabel(request.sentAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pendingId !== null}
                    onClick={() => onDecline(request.id)}
                    className="rounded-lg border border-[#E5DFD3] px-3 py-1.5 text-[13px] font-semibold text-[#6B665E] hover:bg-[#F5F2EC] disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Decline"}
                  </button>
                  <button
                    type="button"
                    disabled={pendingId !== null}
                    onClick={() => onAccept(request.id)}
                    className="rounded-lg bg-[#B55234] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[#9E4328] disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Accept"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
