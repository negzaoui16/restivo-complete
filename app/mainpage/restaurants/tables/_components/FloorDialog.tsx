"use client";

import { useState } from "react";

export function FloorDialog({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: { name: string; width: number; height: number };
  onClose: () => void;
  onSubmit: (value: { name: string; width: number; height: number }) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [width, setWidth] = useState(String(initial.width));
  const [height, setHeight] = useState(String(initial.height));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const next = { name: name.trim(), width: Number(width), height: Number(height) };
    if (!next.name) {
      setError("Name this floor.");
      return;
    }
    if (next.width < 4 || next.height < 4 || next.width > 80 || next.height > 80) {
      setError("Use a size between 4 m and 80 m.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(next);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this floor.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1A1A1A]/30 p-4">
      <form
        className="w-full max-w-sm rounded-2xl border border-[#E5DFD3] bg-white p-5 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="text-[18px] font-semibold">{title}</h2>
        <label className="mt-4 block text-[13px] font-semibold">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[#E5DFD3] px-3 py-2 font-normal outline-none focus:border-[#B55234]"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MeterField label="Width" value={width} onChange={setWidth} />
          <MeterField label="Height" value={height} onChange={setHeight} />
        </div>
        {error ? <p className="mt-3 text-[13px] text-[#B55234]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-[13px] font-semibold text-[#6B665E]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#B55234] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#9E4328] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save floor"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MeterField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-[13px] font-semibold">
      {label}
      <span className="relative mt-1 block">
        <input
          value={value}
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-[#E5DFD3] px-3 py-2 pr-8 font-normal outline-none focus:border-[#B55234]"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#8C877D]">m</span>
      </span>
    </label>
  );
}
