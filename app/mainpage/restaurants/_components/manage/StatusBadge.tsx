import { STATUS_BADGE } from "../../_lib/status";

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[status] ?? ""}`}
    >
      {label}
    </span>
  );
}
