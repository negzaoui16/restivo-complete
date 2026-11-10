"use client";

import {
  ChevronDown,
  Copy,
  Edit2,
  Minus,
  Plus,
  Square,
  Target,
  Trash2,
  Undo,
  Redo,
  Users,
  ZoomIn,
} from "lucide-react";
import { FLOOR_PREVIEW_IMAGE, STATUS_LEGEND, VIEW_MODES, type ViewMode } from "../_lib/tables-ui";

export function FloorCanvas({
  viewMode,
  onViewModeChange,
}: {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex-1 bg-[#F5F2EB] rounded-2xl border border-[#E5DFD3] relative overflow-hidden flex flex-col min-w-0">
      <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-[#E5DFD3] px-3 py-1.5 h-10">
            <ZoomIn className="w-4 h-4 text-[#6B665E] mr-2" />
            <span className="text-[13px] font-semibold mr-1">100%</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6B665E]" />
          </div>
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-[#E5DFD3] h-10">
            <button
              type="button"
              className="px-3 h-full border-r border-[#E5DFD3] hover:bg-[#F5F2EC] rounded-l-xl flex items-center justify-center"
            >
              <Undo className="w-4 h-4 text-[#6B665E]" />
            </button>
            <button
              type="button"
              className="px-3 h-full hover:bg-[#F5F2EC] rounded-r-xl flex items-center justify-center"
            >
              <Redo className="w-4 h-4 text-[#6B665E]" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center p-1 bg-white rounded-xl shadow-sm border border-[#E5DFD3]">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onViewModeChange(mode)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
                  viewMode === mode
                    ? "bg-[#B8573A] text-white"
                    : "text-[#6B665E] hover:bg-[#F5F2EC]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-[#E5DFD3] px-4 h-10 text-[13px] font-semibold hover:bg-[#F5F2EC]"
          >
            Floor Grid
            <Edit2 className="w-3.5 h-3.5 text-[#6B665E]" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 w-full h-full relative"
        style={{
          backgroundImage: `url("${FLOOR_PREVIEW_IMAGE}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.9,
        }}
      >
        <div
          className="absolute inset-0 bg-white/40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-lg shadow-lg border border-[#B8573A] ring-4 ring-[#B8573A]/20">
          <div className="w-16 h-10 bg-[#E8D9C8] rounded-md flex items-center justify-center font-bold text-[#8B6B4D]">
            03
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 bg-white rounded-xl shadow-xl border border-[#E5DFD3] p-3 w-48 z-20">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-[14px]">Table 03</span>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[#6B665E] mb-3">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> 4 seats
              </span>
              <span className="flex items-center gap-1">
                <Square className="w-3 h-3" /> Square
              </span>
            </div>
            <div className="flex justify-between border-t border-[#E5DFD3] pt-2">
              <button type="button" className="p-1.5 hover:bg-[#F5F2EC] rounded-md text-[#6B665E]">
                <Edit2 className="w-4 h-4" />
              </button>
              <button type="button" className="p-1.5 hover:bg-[#F5F2EC] rounded-md text-[#6B665E]">
                <Copy className="w-4 h-4" />
              </button>
              <button type="button" className="p-1.5 hover:bg-[#FFF0F0] rounded-md text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[1px] border-8 border-transparent border-t-white" />
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-[#E5DFD3] -z-10 mt-[1px]" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-[#E5DFD3] shadow-sm pointer-events-auto">
          {STATUS_LEGEND.map((status) => (
            <div key={status.name} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
              <span className="text-[12px] font-medium text-[#6B665E]">{status.name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            className="w-10 h-10 bg-white rounded-xl shadow-sm border border-[#E5DFD3] flex items-center justify-center hover:bg-[#F5F2EC]"
          >
            <Target className="w-4 h-4 text-[#6B665E]" />
          </button>
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-[#E5DFD3] h-10">
            <button
              type="button"
              className="w-10 h-full border-r border-[#E5DFD3] hover:bg-[#F5F2EC] rounded-l-xl flex items-center justify-center"
            >
              <Plus className="w-4 h-4 text-[#6B665E]" />
            </button>
            <button
              type="button"
              className="w-10 h-full hover:bg-[#F5F2EC] rounded-r-xl flex items-center justify-center"
            >
              <Minus className="w-4 h-4 text-[#6B665E]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
