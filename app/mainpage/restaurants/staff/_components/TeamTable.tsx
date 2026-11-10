"use client";

import { useState } from "react";
import { profileInitials } from "../../../_lib/profile";
import { sinceLabel } from "../_lib/roster";
import type { RosterMember } from "@/lib/staff/types";

export function TeamTable({
  members,
  empty,
  canManageTeam,
  pendingId,
  onChangeRole,
}: {
  members: RosterMember[];
  empty: string;
  /** Only the owner names or removes managers. */
  canManageTeam: boolean;
  pendingId: string | null;
  onChangeRole: (membershipId: string, role: "MANAGER" | "STAFF") => void;
}) {
  // The member whose role change is waiting for a confirmation in the page.
  const [asking, setAsking] = useState<string | null>(null);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#E5DFD3] bg-white shadow-sm">
      <header className="border-b border-[#E5DFD3] px-5 py-4">
        <h2 className="text-[15px] font-semibold">On the team</h2>
        <p className="text-[13px] text-[#8C877D]">
          {members.length === 0 ? "No staff yet" : `${members.length} working here`}
        </p>
      </header>
      {members.length === 0 ? (
        <p className="px-5 py-10 text-sm text-[#736D65]">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E5DFD3]">
                <Column>Name</Column>
                <Column>Role</Column>
                <Column>Since</Column>
                {canManageTeam ? <Column>Actions</Column> : null}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const manager = member.role === "MANAGER";
                const next = manager ? "STAFF" : "MANAGER";
                const busy = pendingId === member.id;
                return (
                  <tr key={member.id} className="border-b border-[#E5DFD3] last:border-0 hover:bg-[#F9F7F4]">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5">
                        <Initials name={member.name} />
                        <span className="text-[14px] font-semibold">{member.name}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-md px-2 py-1 text-[12px] font-bold ${
                          manager ? "bg-[#E6EEF9] text-[#24508F]" : "bg-[#FAF0EA] text-[#B55234]"
                        }`}
                      >
                        {manager ? "Manager" : "Staff"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[14px] text-[#6B665E]">{sinceLabel(member.since)}</td>
                    {canManageTeam ? (
                      <td className="px-5 py-3">
                        {asking === member.id ? (
                          <div role="alert" className="max-w-xs rounded-lg border border-[#E5DFD3] bg-[#FAF7F2] px-3 py-2">
                            <p className="text-xs font-medium text-[#423E3A]">
                              {manager
                                ? `Take the manager role from ${member.name}? They go back to staff.`
                                : `Make ${member.name} a manager? They will manage reservations, orders, the menu and the floor plan.`}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setAsking(null);
                                  onChangeRole(member.id, next);
                                }}
                                className="rounded-lg bg-[#B55234] px-3 py-1 text-xs font-bold text-white hover:bg-[#9E4328] disabled:opacity-50"
                              >
                                {manager ? "Remove role" : "Make manager"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setAsking(null)}
                                className="rounded-lg border border-[#E5DFD3] bg-white px-3 py-1 text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={busy || pendingId !== null}
                            onClick={() => setAsking(member.id)}
                            className="rounded-lg border border-[#E5DFD3] bg-white px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F5F2EC] disabled:opacity-50"
                          >
                            {busy ? "Saving..." : manager ? "Remove manager role" : "Make manager"}
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Column({ children }: { children: string }) {
  return (
    <th className="px-5 py-3 text-[12px] font-bold tracking-wider text-[#8C877D] uppercase">{children}</th>
  );
}

function Initials({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF0EA] text-[11px] font-bold text-[#B55234]">
      {profileInitials(null, null, name)}
    </span>
  );
}
