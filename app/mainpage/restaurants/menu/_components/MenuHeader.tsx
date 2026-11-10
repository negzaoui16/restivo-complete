"use client";

import { Eye, Plus } from "lucide-react";

export function MenuHeader({
  title,
  isPublished,
  isSaving,
  canAddItem,
  onAddItem,
  onPreview,
  onPreviewAR,
  onTogglePublish,
}: {
  title: string;
  isPublished: boolean;
  isSaving: boolean;
  canAddItem: boolean;
  onAddItem: () => void;
  onPreview: () => void;
  onPreviewAR?: () => void;
  /** Publishes a draft or unpublishes a published menu. */
  onTogglePublish: () => void;
}) {
  return (
    <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
          Menu
        </h1>
        <p className="text-xs sm:text-sm text-[#736D65] mt-1">
          Create, organize and manage everything your customers can order.
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isSaving ? "bg-amber-500" : isPublished ? "bg-emerald-500" : "bg-[#C5BFAD]"
            }`}
          />
          <span
            className={`text-xs font-medium ${
              isSaving
                ? "text-amber-700"
                : isPublished
                ? "text-emerald-700"
                : "text-[#736D65]"
            }`}
          >
            {isSaving ? "Saving…" : isPublished ? `${title} is published` : `${title} is a draft`}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E8E2D7] text-[#1A1A1A] text-sm font-semibold hover:bg-[#FAF7F2] transition-colors shadow-sm"
        >
          <Eye className="w-4 h-4" />
          Preview menu
        </button>
        {onPreviewAR && (
          <button
            type="button"
            onClick={onPreviewAR}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-sm font-semibold hover:bg-purple-100 transition-colors shadow-sm"
          >
            <span>📱</span>
            Aperçu 3D & AR
          </button>
        )}
        <button
          type="button"
          onClick={onAddItem}
          disabled={!canAddItem}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E8E2D7] text-[#1A1A1A] text-sm font-semibold hover:bg-[#FAF7F2] transition-colors shadow-sm disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          Add item
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={isPublished}
          aria-label={isPublished ? "Unpublish menu" : "Publish menu"}
          onClick={onTogglePublish}
          disabled={isSaving}
          className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-[#E8E2D7] text-sm font-semibold text-[#1A1A1A] hover:bg-[#FAF7F2] transition-colors shadow-sm disabled:opacity-50"
        >
          <span
            className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
              isPublished ? "bg-emerald-500" : "bg-[#D4CFC6]"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                isPublished ? "translate-x-[18px]" : "translate-x-0"
              }`}
            />
          </span>
          {isPublished ? "Published" : "Draft"}
          <span className="text-xs font-medium text-[#736D65]">{isPublished ? "- Unpublish" : "- Publish"}</span>
        </button>
      </div>
    </section>
  );
}
