"use client";

import { FLOOR_OBJECT_CATALOG, objectCapacity } from "./floor-object";
import { useFloorEditorContext } from "./editor/context";

export function PropertiesPanel() {
  const editor = useFloorEditorContext();
  const object = editor.selected;

  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[#E5DFD3] bg-white">
      <div className="border-b border-[#E5DFD3] px-4 py-3">
        <h3 className="text-[15px] font-semibold">{object ? titleOf(object) : "Properties"}</h3>
      </div>
      {object ? <ObjectFields /> : <p className="p-4 text-[13px] text-[#6B665E]">Select an object on the floor.</p>}
    </aside>
  );
}

function ObjectFields() {
  const editor = useFloorEditorContext();
  const object = editor.selected;
  if (!object) return null;

  const definition = FLOOR_OBJECT_CATALOG[object.type];
  const capacity = objectCapacity(object);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <Readout label="Type" value={definition.label} />
      {capacity != null ? (
        <NumberField
          label="Capacity"
          value={capacity}
          suffix=""
          onCommit={(value) => editor.setCapacity(object.id, value)}
        />
      ) : null}
      <NumberField label="Width" value={object.width} suffix="m" onCommit={(width) => editor.update(object.id, { width })} />
      <NumberField label="Height" value={object.height} suffix="m" onCommit={(height) => editor.update(object.id, { height })} />
      <NumberField label="X" value={object.x} suffix="m" onCommit={(x) => editor.update(object.id, { x })} />
      <NumberField label="Y" value={object.y} suffix="m" onCommit={(y) => editor.update(object.id, { y })} />
      <NumberField
        label="Rotation"
        value={object.rotation}
        suffix="°"
        onCommit={(rotation) => editor.update(object.id, { rotation })}
      />
      <button
        type="button"
        onClick={() => editor.remove(object.id)}
        className="mt-2 rounded-xl border border-[#F1D8CF] py-2.5 text-[14px] font-bold text-[#B55234] hover:bg-[#FFF8F5]"
      >
        Delete
      </button>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1 block text-[13px] font-semibold text-[#1A1A1A]">{label}</span>
      <p className="text-[14px] text-[#3A3530]">{value}</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onCommit,
}: {
  label: string;
  value: number;
  suffix: string;
  onCommit: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold text-[#1A1A1A]">{label}</span>
      <span className="relative block">
        <input
          key={value}
          defaultValue={formatNumber(value)}
          inputMode="decimal"
          onBlur={(event) => commitField(event.currentTarget.value, value, onCommit)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="w-full rounded-xl border border-[#E5DFD3] px-3 py-2 pr-9 text-[14px] outline-none focus:border-[#B55234]"
        />
        {suffix ? (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-[#8C877D]">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function titleOf(object: NonNullable<ReturnType<typeof useFloorEditorContext>["selected"]>) {
  const label = object.metadata?.label;
  if (typeof label === "string" && label.trim()) return label;
  return FLOOR_OBJECT_CATALOG[object.type].label;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function commitField(text: string, current: number, onCommit: (value: number) => void) {
  const next = Number(text);
  if (Number.isFinite(next) && next !== current) onCommit(next);
}
