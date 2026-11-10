import { Armchair, Bell, UtensilsCrossed } from "lucide-react";
import type { StaffSectionId } from "../_lib/types";

const COPY: Partial<Record<StaffSectionId, { title: string; body: string }>> = {
  tables: {
    title: "Tables",
    body: "The live state of your tables will be listed here.",
  },
  menu: {
    title: "Menu",
    body: "The dishes you can send from the pass will be listed here.",
  },
  notifications: {
    title: "Notifications",
    body: "You have no notifications yet.",
  },
};

const ICON = { tables: Armchair, notifications: Bell } as const;

export function StaffSection({ section }: { section: StaffSectionId }) {
  const note = COPY[section];
  const Icon = section === "tables" || section === "notifications" ? ICON[section] : UtensilsCrossed;

  return (
    <section className="rounded-2xl border border-[#EDE7DC] bg-white px-6 py-16 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FAF0EA] text-[#B55234]">
        <Icon className="h-5 w-5" />
      </span>
      <h1 className="text-xl font-extrabold">{note?.title ?? "Staff"}</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#736D65]">{note?.body}</p>
    </section>
  );
}
