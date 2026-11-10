"use client";

import { useState } from "react";
import type { PublicMenu } from "@/lib/menu/types";
import { FORM_INPUT_CLASS } from "../_lib/menu-ui";

export function MenuSettingsPanel({
  menu,
  disabled,
  onSave,
}: {
  menu: PublicMenu;
  disabled?: boolean;
  onSave: (input: { name: string; description?: string; isPublished: boolean }) => void;
}) {
  const [name, setName] = useState(menu.name);
  const [description, setDescription] = useState(menu.description ?? "");
  const [isPublished, setIsPublished] = useState(menu.isPublished);

  return (
    <form
      className="max-w-lg flex flex-col gap-4 bg-white border border-[#E8E2D7] rounded-2xl p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublished,
        });
      }}
    >
      <div>
        <label className="text-[11px] font-semibold text-[#A39C91] uppercase tracking-wider mb-1.5 block">
          Menu name
        </label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={FORM_INPUT_CLASS} />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-[#A39C91] uppercase tracking-wider mb-1.5 block">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`${FORM_INPUT_CLASS} resize-none`}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium text-[#1A1A1A]">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        Published and visible to guests
      </label>
      <button
        type="submit"
        disabled={disabled || !name.trim()}
        className="py-2.5 rounded-xl bg-[#B55234] text-white text-sm font-bold disabled:opacity-50"
      >
        Save settings
      </button>
    </form>
  );
}
