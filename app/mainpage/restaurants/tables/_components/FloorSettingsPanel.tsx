"use client";

import { ChevronDown, Image as ImageIcon, X } from "lucide-react";
import { FLOOR_THUMB_IMAGE, type FloorName } from "../_lib/tables-ui";

const INPUT_CLASS =
  "w-full px-3 py-2 bg-white border border-[#E5DFD3] rounded-xl text-[14px] focus:outline-none focus:border-[#B8573A] focus:ring-1 focus:ring-[#B8573A]";

export function FloorSettingsPanel({ floorName }: { floorName: FloorName }) {
  return (
    <aside className="w-[320px] flex-shrink-0 bg-white rounded-2xl border border-[#E5DFD3] shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-4 flex justify-between items-center border-b border-[#E5DFD3]">
        <h3 className="font-semibold text-[15px]">Floor settings</h3>
        <button type="button" className="text-[#6B665E] hover:text-[#1A1A1A]" aria-label="Close settings">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        <div className="mb-5 flex gap-4 items-center">
          <div className="w-20 h-20 bg-[#F5F2EC] rounded-lg border border-[#E5DFD3] overflow-hidden flex-shrink-0">
            <img src={FLOOR_THUMB_IMAGE} alt="Floor preview" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="block text-[12px] text-[#6B665E] mb-2 font-medium">Floor image</span>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E5DFD3] text-[13px] font-semibold text-[#1A1A1A] hover:bg-[#F5F2EC]"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Change image
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">
              Floor name <span className="text-red-500">*</span>
            </label>
            <input type="text" defaultValue={floorName} key={floorName} className={INPUT_CLASS} />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">Description</label>
            <textarea
              defaultValue="Main dining area"
              rows={3}
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">Dimensions</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <span className="block text-[11px] text-[#8C877D] mb-1 uppercase tracking-wider font-semibold">
                  Width
                </span>
                <div className="relative">
                  <input type="text" defaultValue="24" className={`${INPUT_CLASS} pr-8`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C877D] text-[13px]">m</span>
                </div>
              </div>
              <div className="flex-1">
                <span className="block text-[11px] text-[#8C877D] mb-1 uppercase tracking-wider font-semibold">
                  Height
                </span>
                <div className="relative">
                  <input type="text" defaultValue="18" className={`${INPUT_CLASS} pr-8`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C877D] text-[13px]">m</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E5DFD3]">
            <label className="block text-[14px] font-bold text-[#1A1A1A] mb-3">Grid settings</label>

            <div className="mb-4">
              <span className="block text-[13px] font-semibold text-[#1A1A1A] mb-1.5">Grid size</span>
              <div className="relative">
                <select className={`${INPUT_CLASS} appearance-none`}>
                  <option>0.5 m</option>
                  <option>1 m</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C877D] pointer-events-none" />
              </div>
            </div>

            <ToggleRow label="Snap to grid" />
            <ToggleRow label="Show grid" />
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#E5DFD3] bg-[#FAFAF9]">
        <button
          type="button"
          className="w-full py-2.5 rounded-xl border-2 border-[#F1D8CF] text-[#B8573A] font-bold text-[14px] hover:bg-[#FFF8F5] transition-colors"
        >
          Save floor settings
        </button>
      </div>
    </aside>
  );
}

function ToggleRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] font-semibold text-[#1A1A1A]">{label}</span>
      <div className="w-10 h-6 bg-[#B8573A] rounded-full relative cursor-pointer">
        <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm" />
      </div>
    </div>
  );
}
