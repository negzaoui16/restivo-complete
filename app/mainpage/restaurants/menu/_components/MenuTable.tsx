"use client";

import React from "react";
import { ArrowDown, ArrowUp, Box, Copy, Eye, EyeOff, MoreVertical, Pencil, Search, Trash2 } from "lucide-react";
import type { PublicMenuItem } from "@/lib/menu/types";
import { STATUS_STYLES } from "../_lib/menu-ui";
import { parseDescriptionTags, getTagById } from "@/lib/menu/tags";

function ActionMenuItem({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
        destructive ? "text-red-600 hover:bg-red-50" : "text-[#1A1A1A] hover:bg-[#FAF7F2]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MenuItemRow({
  item,
  index,
  currency,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleAvailability,
  isActionOpen,
  onToggleAction,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  item: PublicMenuItem;
  index: number;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleAvailability: () => void;
  isActionOpen: boolean;
  onToggleAction: () => void;
  /** Undefined when reordering is off (other sort, or all categories shown). */
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMove?: (direction: "up" | "down") => void;
}) {
  const status = item.isAvailable ? STATUS_STYLES.available : STATUS_STYLES.unavailable;

  return (
    <div
      className="group grid grid-cols-1 sm:grid-cols-[1fr_90px_100px_100px_70px] gap-3 px-4 py-3 items-center hover:bg-[#FAF7F2]/60 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onMove && (
          <div className="flex flex-col shrink-0">
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={() => onMove("up")}
              aria-label={`Move ${item.name} up`}
              className="w-6 h-5 rounded hover:bg-[#E8E2D7] flex items-center justify-center text-[#736D65] disabled:opacity-25"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={() => onMove("down")}
              aria-label={`Move ${item.name} down`}
              className="w-6 h-5 rounded hover:bg-[#E8E2D7] flex items-center justify-center text-[#736D65] disabled:opacity-25"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-[#F5F0E8] ring-1 ring-[#E8E2D7]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#B55234] text-xs font-bold">
              {item.name.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-bold text-[#1A1A1A] truncate">{item.name}</p>
            {item.model3dUrl && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold shrink-0">
                <Box className="w-2.5 h-2.5" />
                3D
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#A39C91] truncate">{item.categoryName}</p>
          {(() => {
            const { text: cleanDescription, tags } = parseDescriptionTags(item.description, item.name);
            return (
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {tags.map((tagId) => {
                  const def = getTagById(tagId);
                  if (!def) return null;
                  return (
                    <span
                      key={tagId}
                      className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-semibold border ${def.colorClass}`}
                    >
                      <span>{def.icon}</span>
                      <span>{def.label}</span>
                    </span>
                  );
                })}
                {cleanDescription ? (
                  <p className="text-[11px] text-[#A39C91] truncate hidden sm:block">{cleanDescription}</p>
                ) : null}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="text-right text-sm font-bold text-[#1A1A1A] whitespace-nowrap">
        {item.price} {currency}
      </div>

      <div className="flex items-center justify-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${status.dot}`} />
        <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
      </div>

      <div className="flex items-center justify-center">
        {item.promotionLabel ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FAF0EA] text-[#B55234] text-xs font-bold">
            {item.promotionLabel}
          </span>
        ) : (
          <span className="text-xs text-[#C5BFAD]">—</span>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 relative">
        <button
          type="button"
          onClick={onEdit}
          className="w-7 h-7 rounded-lg hover:bg-[#E8E2D7] flex items-center justify-center text-[#736D65] transition-colors"
          title="Edit item"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggleAction}
          className="w-7 h-7 rounded-lg hover:bg-[#E8E2D7] flex items-center justify-center text-[#736D65] transition-colors"
          title="More actions"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        {isActionOpen && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E8E2D7] rounded-xl shadow-lg py-1 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
            <ActionMenuItem icon={<Pencil className="w-3.5 h-3.5" />} label="Edit" onClick={onEdit} />
            <ActionMenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicate" onClick={onDuplicate} />
            <ActionMenuItem
              icon={item.isAvailable ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              label={item.isAvailable ? "Mark unavailable" : "Mark available"}
              onClick={onToggleAvailability}
            />
            <div className="my-1 border-t border-[#F0ECE4]" />
            <ActionMenuItem
              icon={<Trash2 className="w-3.5 h-3.5" />}
              label="Delete"
              onClick={onDelete}
              destructive
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function MenuTable({
  items,
  currency,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleAvailability,
  actionMenuId,
  setActionMenuId,
  onMove,
}: {
  /** When set, rows get up/down buttons; `items` must then be one category in menu order. */
  onMove?: (id: string, direction: "up" | "down") => void;
  items: PublicMenuItem[];
  currency: string;
  onEdit: (item: PublicMenuItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: PublicMenuItem) => void;
  onToggleAvailability: (id: string) => void;
  actionMenuId: string | null;
  setActionMenuId: (id: string | null) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#F5F0E8] flex items-center justify-center mb-3">
          <Search className="w-6 h-6 text-[#A39C91]" />
        </div>
        <p className="text-sm font-semibold text-[#1A1A1A]">No items yet</p>
        <p className="text-xs text-[#A39C91] mt-1">Add a category, then add your first dish.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#E8E2D7] rounded-xl overflow-hidden bg-white">
      <div className="hidden sm:grid grid-cols-[1fr_90px_100px_100px_70px] gap-3 px-4 py-2.5 bg-[#FAF7F2] border-b border-[#E8E2D7] text-xs font-bold text-[#A39C91] uppercase tracking-wider">
        <span>Item</span>
        <span className="text-right">Price</span>
        <span className="text-center">Status</span>
        <span className="text-center">Promotion</span>
        <span className="text-center">Actions</span>
      </div>
      <div className="divide-y divide-[#F0ECE4]">
        {items.map((item, index) => (
          <MenuItemRow
            key={item.id}
            item={item}
            index={index}
            currency={currency}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item.id)}
            onDuplicate={() => onDuplicate(item)}
            onToggleAvailability={() => onToggleAvailability(item.id)}
            isActionOpen={actionMenuId === item.id}
            onToggleAction={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
            onMove={onMove ? (direction) => onMove(item.id, direction) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
