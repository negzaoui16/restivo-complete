"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import type { PublicMenu, PublicPromotion } from "@/lib/menu/types";
import { FORM_INPUT_CLASS } from "../_lib/menu-ui";

type Kind = "PERCENTAGE" | "FIXED_AMOUNT";

export type PromotionFormInput = {
  name: string;
  type: Kind;
  value: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  menuItemIds: string[];
};

const toInput = (date: Date) => date.toISOString().slice(0, 16);

function defaultRange() {
  return { startsAt: toInput(new Date()), endsAt: toInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) };
}

function Field({ error, children }: { error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function PromotionsPanel({
  menu,
  currency,
  disabled,
  serverError,
  onCreate,
  onUpdate,
  onDelete,
}: {
  menu: PublicMenu;
  currency: string;
  disabled?: boolean;
  /** Last server error; shown under the field it names. */
  serverError: { field: string | null; message: string } | null;
  onCreate: (input: PromotionFormInput) => void;
  onUpdate: (id: string, input: PromotionFormInput) => void;
  onDelete: (id: string) => void;
}) {
  const items = useMemo(() => menu.categories.flatMap((category) => category.items), [menu]);
  const range = defaultRange();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<Kind>("PERCENTAGE");
  const [value, setValue] = useState("10");
  const [startsAt, setStartsAt] = useState(range.startsAt);
  const [endsAt, setEndsAt] = useState(range.endsAt);
  const [isActive, setIsActive] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const errorFor = (field: string) =>
    errors[field] ?? (serverError?.field === field && Object.keys(errors).length === 0 ? serverError.message : null);
  const touch = (field: string) =>
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  const unlinked = menu.promotions.filter((promotion) => promotion.menuItemIds.length === 0);

  function reset() {
    const fresh = defaultRange();
    setEditingId(null);
    setName("");
    setType("PERCENTAGE");
    setValue("10");
    setStartsAt(fresh.startsAt);
    setEndsAt(fresh.endsAt);
    setIsActive(true);
    setSelectedIds([]);
    setErrors({});
  }

  function startEditing(promotion: PublicPromotion) {
    setEditingId(promotion.id);
    setName(promotion.name);
    setType(promotion.type);
    setValue(String(promotion.value));
    setStartsAt(promotion.startsAt.slice(0, 16));
    setEndsAt(promotion.endsAt.slice(0, 16));
    setIsActive(promotion.isActive);
    setSelectedIds(promotion.menuItemIds);
    setErrors({});
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Promotion name must have at least 2 characters.";
    const amount = Number(value);
    if (!value.trim() || !Number.isFinite(amount) || amount <= 0) {
      found.value = "Value must be greater than 0.";
    } else if (type === "PERCENTAGE" && amount > 100) {
      found.value = "A percentage cannot exceed 100.";
    }
    if (!startsAt) found.startsAt = "Start date is required.";
    if (!endsAt) found.endsAt = "End date is required.";
    else if (startsAt && endsAt <= startsAt) found.endsAt = "End date must be after the start date.";
    return found;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="flex flex-col gap-2">
        {unlinked.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <p>
              {unlinked.length === 1
                ? `"${unlinked[0].name}" is not linked to any dish, so it changes no price.`
                : `${unlinked.length} promotions are not linked to any dish, so they change no price.`}{" "}
              Edit them to choose dishes.
            </p>
          </div>
        )}
        {menu.promotions.length === 0 && (
          <p className="text-sm text-[#736D65] py-8 text-center">No promotions yet.</p>
        )}
        {menu.promotions.map((promotion) => (
          <PromotionCard
            key={promotion.id}
            promotion={promotion}
            currency={currency}
            disabled={disabled}
            editing={editingId === promotion.id}
            onEdit={() => startEditing(promotion)}
            onDelete={() => {
              if (editingId === promotion.id) reset();
              onDelete(promotion.id);
            }}
          />
        ))}
      </div>

      <form
        noValidate
        className="bg-white border border-[#E8E2D7] rounded-2xl p-4 flex flex-col gap-3 h-fit"
        onSubmit={(event) => {
          event.preventDefault();
          const found = validate();
          setErrors(found);
          if (Object.keys(found).length > 0) return;
          const input: PromotionFormInput = {
            name: name.trim(),
            type,
            value: Number(value),
            startsAt,
            endsAt,
            isActive,
            menuItemIds: selectedIds,
          };
          if (editingId) onUpdate(editingId, input);
          else onCreate(input);
          reset();
        }}
      >
        <h3 className="text-sm font-bold text-[#1A1A1A]">{editingId ? "Edit promotion" : "New promotion"}</h3>
        <Field error={errorFor("name")}>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              touch("name");
            }}
            placeholder="Lunch special"
            aria-label="Promotion name"
            className={FORM_INPUT_CLASS}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as Kind)}
            aria-label="Promotion type"
            className={FORM_INPUT_CLASS}
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed amount</option>
          </select>
          <Field error={errorFor("value")}>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                touch("value");
              }}
              aria-label="Promotion value"
              className={FORM_INPUT_CLASS}
            />
          </Field>
        </div>
        <Field error={errorFor("startsAt")}>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => {
              setStartsAt(e.target.value);
              touch("startsAt");
            }}
            aria-label="Starts at"
            className={FORM_INPUT_CLASS}
          />
        </Field>
        <Field error={errorFor("endsAt")}>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => {
              setEndsAt(e.target.value);
              touch("endsAt");
            }}
            aria-label="Ends at"
            className={FORM_INPUT_CLASS}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-[#1A1A1A]">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active (uncheck to pause)
        </label>
        <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
          {items.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-xs text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={(event) => {
                  setSelectedIds((prev) =>
                    event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                  );
                }}
              />
              {item.name}
            </label>
          ))}
          {items.length === 0 && (
            <p className="text-xs text-[#A39C91]">Add menu items first to attach a promotion.</p>
          )}
        </div>
        {selectedIds.length === 0 && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            No dish selected: this promotion will change no price.
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={disabled}
            className="flex-1 py-2.5 rounded-xl bg-[#B55234] text-white text-sm font-bold disabled:opacity-50"
          >
            {editingId ? "Save changes" : "Create promotion"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="px-4 rounded-xl border border-[#E8E2D7] text-sm font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function PromotionCard({
  promotion,
  currency,
  disabled,
  editing,
  onEdit,
  onDelete,
}: {
  promotion: PublicPromotion;
  currency: string;
  disabled?: boolean;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const unlinked = promotion.menuItemIds.length === 0;
  return (
    <div
      className={`bg-white border rounded-xl px-4 py-3 flex items-start justify-between gap-3 ${
        editing ? "border-[#B55234]" : "border-[#E8E2D7]"
      }`}
    >
      <div>
        <p className="text-sm font-bold text-[#1A1A1A]">{promotion.name}</p>
        <p className="text-xs text-[#736D65] mt-0.5">
          {promotion.type === "PERCENTAGE"
            ? `${promotion.value}% off`
            : `${promotion.value} ${currency} off`}
          {" · "}
          {promotion.menuItemIds.length} items
          {promotion.isLive ? " · live" : promotion.isActive ? " · scheduled" : " · paused"}
        </p>
        {unlinked && (
          <p className="flex items-center gap-1 text-xs font-medium text-amber-700 mt-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Not linked to any dish
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onEdit}
          aria-label={`Edit ${promotion.name}`}
          className="w-8 h-8 rounded-lg hover:bg-[#F5F0E8] flex items-center justify-center text-[#736D65]"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          aria-label={`Delete ${promotion.name}`}
          className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-600"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
