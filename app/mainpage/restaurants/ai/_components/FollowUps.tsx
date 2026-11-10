"use client";

import { useState } from "react";
import { followUpText } from "@/lib/ai/follow-ups";
import type { FollowUp } from "@/lib/ai/types";

export function FollowUps({
  items,
  disabled,
  onAsk,
}: {
  items: FollowUp[];
  disabled: boolean;
  onAsk: (prompt: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  if (items.length === 0) return null;

  const open = items.find((item) => item.id === openId);

  const openChip = (item: FollowUp) => {
    if (item.kind === "ask") {
      onAsk(item.prompt);
      return;
    }
    setText("");
    setOpenId(openId === item.id ? null : item.id);
  };

  const choose = (prompt: string, option: string) => {
    const next = followUpText(prompt, option);
    if (!next) return;
    setOpenId(null);
    onAsk(next);
  };

  return (
    <div className="mt-2 text-left">
      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-[#A39C91] uppercase">Ask next</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item) =>
          item.kind === "write" && open?.id === item.id ? (
            <WriteChip
              key={item.id}
              item={item}
              text={text}
              disabled={disabled}
              onText={setText}
              onAsk={(prompt) => {
                setText("");
                setOpenId(null);
                onAsk(prompt);
              }}
            />
          ) : (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => openChip(item)}
              className={chipClass(openId === item.id)}
            >
              {item.label}
            </button>
          )
        )}
      </div>
      {open?.kind === "pick" ? (
        <ul className="mt-1.5 max-w-xs overflow-hidden rounded-xl border border-[#E5DFD3] bg-white">
          {open.options?.map((option) => (
            <li key={option} className="border-t border-[#F0EBE3] first:border-t-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => choose(open.prompt, option)}
                className="w-full px-3 py-2 text-left text-[12px] text-[#1A1A1A] hover:bg-[#FAF7F2] disabled:opacity-40"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function WriteChip({
  item,
  text,
  disabled,
  onText,
  onAsk,
}: {
  item: FollowUp;
  text: string;
  disabled: boolean;
  onText: (value: string) => void;
  onAsk: (prompt: string) => void;
}) {
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const prompt = followUpText(item.prompt, text);
        if (prompt) onAsk(prompt);
      }}
    >
      <input
        value={text}
        autoFocus
        maxLength={80}
        disabled={disabled}
        placeholder={item.placeholder}
        onChange={(event) => onText(event.target.value)}
        className="w-36 rounded-full border border-[#E5DFD3] bg-white px-3 py-1.5 text-[12px] text-[#1A1A1A] outline-none placeholder:text-[#A39C91] focus:border-[#B55234]"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-full bg-[#B55234] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#9E4328] disabled:opacity-40"
      >
        Ask
      </button>
    </form>
  );
}

function chipClass(active: boolean): string {
  const base = "rounded-full border px-3 py-1.5 text-[12px] font-medium disabled:opacity-40";
  return active
    ? `${base} border-[#B55234] bg-[#FAF0EA] text-[#B55234]`
    : `${base} border-[#E5DFD3] bg-white text-[#3A3530] hover:border-[#B55234] hover:text-[#B55234]`;
}
