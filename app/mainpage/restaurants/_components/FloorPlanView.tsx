"use client";

import React, { useState } from "react";
import { Maximize2, Compass, Check, Clock, User, AlertCircle } from "lucide-react";

interface FloorPlanViewProps {
  onOpenFullModal: () => void;
}

interface TableItem {
  id: string;
  name: string;
  seats: number;
  status: "Available" | "Reserved" | "Occupied" | "Cleaning";
  guest?: string;
  time?: string;
  x: number; // percentage
  y: number; // percentage
  type: "round" | "rect" | "booth" | "bar";
  width?: number;
  height?: number;
}

export function FloorPlanView({ onOpenFullModal }: FloorPlanViewProps) {
  const [activeFloor, setActiveFloor] = useState<1 | 2>(1);
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null);

  // Floor 1 tables
  const floor1Tables: TableItem[] = [
    // Top Terrace / Patio
    { id: "T01", name: "Table 01", seats: 4, status: "Available", x: 34, y: 22, type: "rect" },
    { id: "T02", name: "Table 02", seats: 4, status: "Available", x: 42, y: 22, type: "rect" },
    { id: "T04", name: "Table 04", seats: 2, status: "Reserved", guest: "Sami Ben Ali", time: "10:30", x: 49, y: 22, type: "round" },

    // Left dining
    { id: "T11", name: "Table 11", seats: 4, status: "Available", x: 23, y: 28, type: "rect" },
    { id: "T12", name: "Table 12", seats: 4, status: "Occupied", guest: "Sarah", time: "12:00", x: 25, y: 44, type: "rect" },
    { id: "T13", name: "Table 13", seats: 4, status: "Available", x: 25, y: 64, type: "rect" },

    // Center Round Tables
    { id: "T06", name: "Table 06", seats: 2, status: "Available", x: 33, y: 46, type: "round" },
    { id: "T07", name: "Table 07", seats: 2, status: "Occupied", guest: "Yasmine", time: "13:30", x: 37, y: 46, type: "round" },
    { id: "T08", name: "Table 08", seats: 2, status: "Reserved", guest: "Karim", time: "20:00", x: 42, y: 46, type: "round" },

    // Middle Booths & Large Tables
    { id: "T14", name: "Table 14", seats: 2, status: "Reserved", guest: "Guest", time: "19:30", x: 33, y: 64, type: "rect" },
    { id: "T15", name: "Table 15", seats: 4, status: "Available", x: 42, y: 64, type: "rect" },
    { id: "T18", name: "Table 18", seats: 4, status: "Occupied", guest: "Family Ben Salah", time: "11:45", x: 48, y: 64, type: "rect" },

    // Right Lounge & Booths
    { id: "T19", name: "Table 19", seats: 6, status: "Reserved", guest: "VIP Delegation", time: "21:00", x: 58, y: 26, type: "booth" },
    { id: "T20", name: "Table 20", seats: 4, status: "Occupied", guest: "Omar & Guests", time: "12:30", x: 57, y: 46, type: "rect" },
    { id: "T03", name: "Table 03", seats: 2, status: "Cleaning", guest: "Just departed", time: "10:32", x: 56, y: 72, type: "round" },
    { id: "T09", name: "Table 09", seats: 2, status: "Occupied", guest: "Nour", time: "13:00", x: 63, y: 68, type: "round" },
  ];

  // Floor 2 tables (Rooftop & Private Rooms)
  const floor2Tables: TableItem[] = [
    { id: "R01", name: "Rooftop 01", seats: 2, status: "Available", x: 28, y: 30, type: "round" },
    { id: "R02", name: "Rooftop 02", seats: 4, status: "Available", x: 40, y: 30, type: "rect" },
    { id: "R03", name: "Rooftop 03", seats: 4, status: "Reserved", guest: "Leila M.", time: "19:00", x: 52, y: 30, type: "rect" },
    { id: "VIP1", name: "Private VIP Suite", seats: 10, status: "Occupied", guest: "Ambassador Dinner", time: "20:00", x: 42, y: 62, type: "booth" },
    { id: "R04", name: "Terrace Bar T1", seats: 2, status: "Cleaning", x: 60, y: 60, type: "round" },
  ];

  const currentTables = activeFloor === 1 ? floor1Tables : floor2Tables;

  const counts = {
    available: currentTables.filter((t) => t.status === "Available").length,
    reserved: currentTables.filter((t) => t.status === "Reserved").length,
    occupied: currentTables.filter((t) => t.status === "Occupied").length,
    cleaning: currentTables.filter((t) => t.status === "Cleaning").length,
  };

  const getStatusColor = (status: TableItem["status"]) => {
    switch (status) {
      case "Available":
        return "#2E7D32"; // green
      case "Reserved":
        return "#D32F2F"; // red
      case "Occupied":
        return "#E65100"; // orange
      case "Cleaning":
        return "#546E7A"; // slate
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DC] p-4 sm:p-5 shadow-2xs flex flex-col">
      {/* Header with Floor switcher & Open floor plan button */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 mb-4">
        <div>
          <h2 className="text-base sm:text-[17px] font-bold text-[#1A1A1A]">
            Restaurant overview
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Floor tabs matching image: Floor 1 active dark terracotta */}
          <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#E8E2D7]">
            <button
              onClick={() => {
                setActiveFloor(1);
                setSelectedTable(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeFloor === 1
                  ? "bg-[#B55234] text-white shadow-xs"
                  : "text-[#736D65] hover:text-[#1A1A1A]"
              }`}
            >
              Floor 1
            </button>
            <button
              onClick={() => {
                setActiveFloor(2);
                setSelectedTable(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeFloor === 2
                  ? "bg-[#B55234] text-white shadow-xs"
                  : "text-[#736D65] hover:text-[#1A1A1A]"
              }`}
            >
              Floor 2
            </button>
          </div>

          {/* Open floor plan CTA */}
          <button
            onClick={onOpenFullModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DFD9CE] hover:border-[#B55234] hover:bg-[#FAF0EA]/60 text-xs font-semibold text-[#3A3530] hover:text-[#B55234] transition-all shadow-2xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open floor plan</span>
            <span className="sm:hidden">Plan</span>
          </button>
        </div>
      </div>

      {/* Main Floor Plan Canvas & Legend Container */}
      <div className="relative rounded-2xl bg-[#EFE8DC]/70 border border-[#E0D7C9] overflow-hidden flex flex-col md:flex-row items-stretch min-h-[300px] sm:min-h-[360px]">
        {/* Interactive Floor Plan Graphics Canvas */}
        <div className="relative flex-1 min-h-[280px] sm:min-h-[340px] bg-[#E8E1D3] p-3 overflow-hidden select-none">
          {/* Architectural Background Layout Elements */}
          <div className="absolute inset-2 sm:inset-3 rounded-xl border-2 border-[#CFC5B4] bg-[#F4EFE6] overflow-hidden pointer-events-none">
            {/* Tile grid lines */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #B5A895 1px, transparent 1px), linear-gradient(to bottom, #B5A895 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            {/* Outdoor Patio Garden Area */}
            <div className="absolute top-0 left-0 right-0 h-[28%] bg-[#EBE3D3]/80 border-b border-[#D8CEBD] flex items-center px-4 justify-between">
              <span className="text-[10px] font-bold text-[#8C8375] uppercase tracking-wider">
                Patio Terrace Garden
              </span>
              <div className="flex gap-2 text-[#7F9A75]">
                <span className="w-3 h-3 rounded-full bg-[#8FA785]/30 border border-[#8FA785] inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#8FA785]/30 border border-[#8FA785] inline-block" />
              </div>
            </div>

            {/* Central Wooden Cocktail Bar */}
            <div className="absolute bottom-4 left-[24%] right-[40%] h-12 bg-[#8C6239] rounded-lg border border-[#704E2C] shadow-md flex items-center justify-center">
              <span className="text-[11px] font-extrabold tracking-widest text-[#EADBCA] uppercase">
                BAR
              </span>
              {/* Barstools */}
              <div className="absolute -top-2.5 left-2 right-2 flex justify-around">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className="w-2.5 h-2.5 rounded-full bg-[#4A321E] border border-[#ECD9C5] shadow-xs"
                  />
                ))}
              </div>
            </div>

            {/* Banquette Booth lounge along right wall */}
            <div className="absolute top-[28%] right-2 bottom-4 w-12 bg-[#826E5D]/20 border-l border-[#C8BDAD] rounded-r-lg flex flex-col justify-around py-4 items-center">
              <div className="w-6 h-12 rounded-sm bg-[#A08C79] shadow-xs" />
              <div className="w-6 h-12 rounded-sm bg-[#A08C79] shadow-xs" />
            </div>

            {/* Olive plants / Greenery elements */}
            <div className="absolute top-2 left-3 w-5 h-5 rounded-full bg-[#758E6C] border-2 border-[#546A4C] shadow-xs" />
            <div className="absolute top-2 right-3 w-5 h-5 rounded-full bg-[#758E6C] border-2 border-[#546A4C] shadow-xs" />
            <div className="absolute bottom-3 left-4 w-6 h-6 rounded-full bg-[#758E6C] border-2 border-[#546A4C] shadow-xs" />
            <div className="absolute bottom-3 right-16 w-5 h-5 rounded-full bg-[#758E6C] border-2 border-[#546A4C] shadow-xs" />
          </div>

          {/* Interactive Table Pins */}
          {currentTables.map((t) => {
            const isSelected = selectedTable?.id === t.id;
            const dotColor = getStatusColor(t.status);

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTable(isSelected ? null : t)}
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 z-20 group"
              >
                {/* Physical Table Silhouette */}
                <div
                  className={`flex flex-col items-center justify-center transition-all ${
                    t.type === "round"
                      ? "w-8 h-8 rounded-full"
                      : t.type === "booth"
                      ? "w-11 h-8 rounded-lg"
                      : "w-9 h-7 rounded-md"
                  } ${
                    isSelected
                      ? "bg-[#FAF7F2] ring-3 ring-[#B55234] shadow-lg scale-110"
                      : "bg-[#DFD5C4] hover:bg-[#EBE3D5] hover:scale-105 shadow-xs border border-[#C5BAA7]"
                  }`}
                >
                  {/* Chairs around table */}
                  <span className="text-[9px] font-bold text-[#3D372F] tracking-tighter">
                    {t.id}
                  </span>

                  {/* Pulsing Status Dot */}
                  <div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: dotColor }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"
                    />
                  </div>
                </div>

                {/* Quick Tooltip on Hover */}
                <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-[#1A1A1A] text-white text-[10px] whitespace-nowrap shadow-md z-30">
                  <span className="font-bold">{t.name}</span> · {t.seats} seats · {t.status}
                </div>
              </div>
            );
          })}

          {/* Selected Table Popup Details */}
          {selectedTable && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md rounded-xl p-3 border border-[#E2DDD2] shadow-xl z-30 w-52 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#ECE7DC]">
                <span className="text-xs font-bold text-[#1A1A1A]">
                  {selectedTable.name}
                </span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: getStatusColor(selectedTable.status) }}
                >
                  {selectedTable.status}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-[#5C564E] space-y-1">
                <p>Capacity: <span className="font-semibold text-[#1A1A1A]">{selectedTable.seats} guests</span></p>
                {selectedTable.guest && (
                  <p>Guest: <span className="font-semibold text-[#1A1A1A]">{selectedTable.guest}</span></p>
                )}
                {selectedTable.time && (
                  <p>Time: <span className="font-semibold text-[#1A1A1A]">{selectedTable.time}</span></p>
                )}
              </div>
              <div className="mt-2.5 pt-2 border-t border-[#ECE7DC] flex gap-1">
                <button
                  onClick={() => alert(`Table ${selectedTable.name} opened in management view`)}
                  className="flex-1 py-1 rounded-lg bg-[#FAF0EA] hover:bg-[#F5E2D6] text-[#B55234] text-[10px] font-bold transition-colors"
                >
                  Manage Table
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend & Floor Status Sidebar on the right */}
        <div className="shrink-0 w-full md:w-36 bg-[#F8F5EE] border-t md:border-t-0 md:border-l border-[#DFD7C9] p-3.5 flex flex-row md:flex-col justify-between items-center md:items-stretch gap-3">
          <div className="space-y-2.5 w-full">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
                <span className="text-[#6B655D] text-[11.5px] font-medium">Available</span>
              </div>
              <span className="font-bold text-[#1A1A1A] text-xs">{counts.available}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D32F2F]" />
                <span className="text-[#6B655D] text-[11.5px] font-medium">Reserved</span>
              </div>
              <span className="font-bold text-[#1A1A1A] text-xs">{counts.reserved}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E65100]" />
                <span className="text-[#6B655D] text-[11.5px] font-medium">Occupied</span>
              </div>
              <span className="font-bold text-[#1A1A1A] text-xs">{counts.occupied}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#546E7A]" />
                <span className="text-[#6B655D] text-[11.5px] font-medium">Cleaning</span>
              </div>
              <span className="font-bold text-[#1A1A1A] text-xs">{counts.cleaning}</span>
            </div>
          </div>

          {/* Compass matching screenshot: N with arrow */}
          <div className="flex md:flex-col items-center justify-center gap-1 text-[#8C8478] pt-2 md:border-t md:border-[#E8E2D6] shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black tracking-widest text-[#5C564E]">N</span>
              <Compass className="w-5 h-5 text-[#8C8478]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
