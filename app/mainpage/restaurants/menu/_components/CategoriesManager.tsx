"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import type { PublicMenuCategory } from "@/lib/menu/types";
import { FORM_INPUT_CLASS } from "../_lib/menu-ui";

type FieldError = { field: string | null; message: string } | null;

function nameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Category name must have at least 2 characters.";
  if (trimmed.length > 60) return "Category name must have at most 60 characters.";
  return null;
}

export function CategoriesManager({
  categories,
  disabled,
  serverError,
  onAdd,
  onRename,
  onDelete,
  onMove,
}: {
  categories: PublicMenuCategory[];
  disabled?: boolean;
  /** Last server error; shown under the name field when it names `name`. */
  serverError: FieldError;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<{ scope: string; message: string } | null>(null);

  const serverNameError = serverError?.field === "name" ? serverError.message : null;
  const errorFor = (scope: string) =>
    localError
      ? localError.scope === scope
        ? localError.message
        : null
      : scope === (renamingId ?? "new")
        ? serverNameError
        : null;

  return (
    <div className="flex flex-col gap-3 max-w-xl">
      <form
        className="flex flex-col gap-1.5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const problem = nameProblem(newName);
          if (problem) return setLocalError({ scope: "new", message: problem });
          setLocalError(null);
          onAdd(newName.trim());
          setNewName("");
        }}
      >
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setLocalError(null);
            }}
            placeholder="New category name"
            aria-label="New category name"
            aria-invalid={errorFor("new") ? true : undefined}
            className={FORM_INPUT_CLASS}
          />
          <button
            type="submit"
            disabled={disabled}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 rounded-xl bg-[#B55234] text-white text-sm font-bold disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        {errorFor("new") && <p className="text-xs font-medium text-red-600">{errorFor("new")}</p>}
      </form>

      {categories.length === 0 && (
        <p className="text-sm text-[#736D65] py-8 text-center">No categories yet. Add the first one above.</p>
      )}

      {categories.map((category, index) => (
        <div key={category.id} className="bg-white border border-[#E8E2D7] rounded-xl px-3 py-3">
          {renamingId === category.id ? (
            <form
              className="flex flex-col gap-1.5"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                const problem = nameProblem(renameValue);
                if (problem) return setLocalError({ scope: category.id, message: problem });
                setLocalError(null);
                setRenamingId(null);
                if (renameValue.trim() !== category.name) onRename(category.id, renameValue.trim());
              }}
            >
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    setLocalError(null);
                  }}
                  aria-label={`Rename ${category.name}`}
                  className={FORM_INPUT_CLASS}
                />
                <button type="submit" disabled={disabled} className="px-3 rounded-xl bg-[#B55234] text-white text-xs font-bold">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenamingId(null);
                    setLocalError(null);
                  }}
                  className="px-3 rounded-xl border border-[#E8E2D7] text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
              {errorFor(category.id) && (
                <p className="text-xs font-medium text-red-600">{errorFor(category.id)}</p>
              )}
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#1A1A1A] truncate">{category.name}</p>
                <p className="text-xs text-[#A39C91]">{category.itemCount} items</p>
              </div>
              <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => onMove(category.id, "up")}
                aria-label={`Move ${category.name} up`}
                className="w-8 h-8 rounded-lg hover:bg-[#F5F0E8] flex items-center justify-center text-[#736D65] disabled:opacity-30"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={disabled || index === categories.length - 1}
                onClick={() => onMove(category.id, "down")}
                aria-label={`Move ${category.name} down`}
                className="w-8 h-8 rounded-lg hover:bg-[#F5F0E8] flex items-center justify-center text-[#736D65] disabled:opacity-30"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setRenamingId(category.id);
                  setRenameValue(category.name);
                  setDeletingId(null);
                  setLocalError(null);
                }}
                aria-label={`Rename ${category.name}`}
                className="w-8 h-8 rounded-lg hover:bg-[#F5F0E8] flex items-center justify-center text-[#736D65]"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setDeletingId(category.id)}
                aria-label={`Delete ${category.name}`}
                className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {deletingId === category.id && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
              <p className="text-xs font-medium text-red-700">
                {category.itemCount === 0
                  ? `Delete "${category.name}"? It has no dishes.`
                  : `Delete "${category.name}"? ${category.itemCount} ${
                      category.itemCount === 1 ? "dish" : "dishes"
                    } will be deleted with it.`}
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setDeletingId(null);
                    onDelete(category.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E2D7] bg-white text-xs font-semibold"
                >
                  Keep
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
