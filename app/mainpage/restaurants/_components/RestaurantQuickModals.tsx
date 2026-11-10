"use client";

import React, { useState } from "react";
import {
  X,
  Calendar,
  UtensilsCrossed,
  Armchair,
  Settings,
  Check,
  Clock,
  User,
  Phone,
  Maximize2,
  Compass,
} from "lucide-react";
import { useRestaurantManager } from "../_context/RestaurantManagerContext";

interface QuickModalsProps {
  reservationOpen: boolean;
  setReservationOpen: (open: boolean) => void;
  menuItemOpen: boolean;
  setMenuItemOpen: (open: boolean) => void;
  tableOpen: boolean;
  setTableOpen: (open: boolean) => void;
  manageOpen: boolean;
  setManageOpen: (open: boolean) => void;
  floorPlanOpen: boolean;
  setFloorPlanOpen: (open: boolean) => void;
}

export function RestaurantQuickModals({
  reservationOpen,
  setReservationOpen,
  menuItemOpen,
  setMenuItemOpen,
  tableOpen,
  setTableOpen,
  manageOpen,
  setManageOpen,
  floorPlanOpen,
  setFloorPlanOpen,
}: QuickModalsProps) {
  const { currentRestaurant, restaurantStatus, setRestaurantStatus } = useRestaurantManager();

  // Add Reservation State
  const [resGuest, setResGuest] = useState("");
  const [resTable, setResTable] = useState("T12");
  const [resTime, setResTime] = useState("19:30");
  const [resGuestsCount, setResGuestsCount] = useState(2);
  const [resSuccess, setResSuccess] = useState(false);

  // Add Menu Item State
  const [dishName, setDishName] = useState("");
  const [dishCategory, setDishCategory] = useState("Main Course");
  const [dishPrice, setDishPrice] = useState(38);
  const [dishSuccess, setDishSuccess] = useState(false);

  // Add Table State
  const [newTableNum, setNewTableNum] = useState("T25");
  const [newTableSeats, setNewTableSeats] = useState(4);
  const [newTableFloor, setNewTableFloor] = useState(1);
  const [tableSuccess, setTableSuccess] = useState(false);

  // Modal 1: Add Reservation
  const renderReservationModal = () => {
    if (!reservationOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-[#FAF7F2] rounded-3xl border border-[#E8E2D7] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DC] mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#B55234]" />
              <h3 className="font-bold text-[#1A1A1A]">Add Reservation</h3>
            </div>
            <button onClick={() => setReservationOpen(false)} className="p-1 rounded-full hover:bg-black/5">
              <X className="w-5 h-5 text-[#6B6661]" />
            </button>
          </div>

          {resSuccess ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm">Reservation Saved!</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Guest Name</label>
                <input
                  type="text"
                  placeholder="e.g. Karim Trabelsi"
                  value={resGuest}
                  onChange={(e) => setResGuest(e.target.value)}
                  className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Time Slot</label>
                  <select
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                  >
                    <option value="12:00">12:00 PM</option>
                    <option value="13:30">1:30 PM</option>
                    <option value="19:30">7:30 PM</option>
                    <option value="20:45">8:45 PM</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Assigned Table</label>
                  <select
                    value={resTable}
                    onChange={(e) => setResTable(e.target.value)}
                    className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                  >
                    <option value="T04">Table 04 (Terrace)</option>
                    <option value="T07">Table 07 (Central)</option>
                    <option value="T12">Table 12 (Garden)</option>
                    <option value="T14">Table 14 (Window)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Guests Count</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={resGuestsCount}
                  onChange={(e) => setResGuestsCount(Number(e.target.value))}
                  className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  onClick={() => setReservationOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DFD8CC] text-[#736D65]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setResSuccess(true);
                    setTimeout(() => {
                      setResSuccess(false);
                      setReservationOpen(false);
                    }, 800);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#B55234] text-white font-bold"
                >
                  Confirm Reservation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Modal 2: Add Menu Item
  const renderMenuItemModal = () => {
    if (!menuItemOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-[#FAF7F2] rounded-3xl border border-[#E8E2D7] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DC] mb-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-[#B55234]" />
              <h3 className="font-bold text-[#1A1A1A]">Add Menu Item</h3>
            </div>
            <button onClick={() => setMenuItemOpen(false)} className="p-1 rounded-full hover:bg-black/5">
              <X className="w-5 h-5 text-[#6B6661]" />
            </button>
          </div>

          {dishSuccess ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm">Menu Item Added to Today&apos;s Service!</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Item Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mediterranean Seabass en Papillote"
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={dishCategory}
                    onChange={(e) => setDishCategory(e.target.value)}
                    className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                  >
                    <option value="Starters">Starters & Tapas</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Pasta & Risotto">Pasta & Risotto</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Price (TND)</label>
                  <input
                    type="number"
                    value={dishPrice}
                    onChange={(e) => setDishPrice(Number(e.target.value))}
                    className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  onClick={() => setMenuItemOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DFD8CC] text-[#736D65]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setDishSuccess(true);
                    setTimeout(() => {
                      setDishSuccess(false);
                      setMenuItemOpen(false);
                    }, 800);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#B55234] text-white font-bold"
                >
                  Save Item
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Modal 3: Add Table
  const renderTableModal = () => {
    if (!tableOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-[#FAF7F2] rounded-3xl border border-[#E8E2D7] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DC] mb-4">
            <div className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-[#B55234]" />
              <h3 className="font-bold text-[#1A1A1A]">Add Dining Table</h3>
            </div>
            <button onClick={() => setTableOpen(false)} className="p-1 rounded-full hover:bg-black/5">
              <X className="w-5 h-5 text-[#6B6661]" />
            </button>
          </div>

          {tableSuccess ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6" />
              </div>
              <p className="font-bold text-sm">Table Successfully Positioned!</p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Table Number</label>
                  <input
                    type="text"
                    value={newTableNum}
                    onChange={(e) => setNewTableNum(e.target.value)}
                    className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Seats / Chairs</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={newTableSeats}
                    onChange={(e) => setNewTableSeats(Number(e.target.value))}
                    className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Floor</label>
                <select
                  value={newTableFloor}
                  onChange={(e) => setNewTableFloor(Number(e.target.value))}
                  className="w-full bg-white p-2.5 rounded-xl border border-[#DFD8CC] outline-none focus:border-[#B55234]"
                >
                  <option value={1}>Floor 1 · Main Terrace & Patio</option>
                  <option value={2}>Floor 2 · Rooftop Lounge</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  onClick={() => setTableOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#DFD8CC] text-[#736D65]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setTableSuccess(true);
                    setTimeout(() => {
                      setTableSuccess(false);
                      setTableOpen(false);
                    }, 800);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#B55234] text-white font-bold"
                >
                  Add Table
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Modal 4: Manage Restaurant
  const renderManageModal = () => {
    if (!manageOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-[#FAF7F2] rounded-3xl border border-[#E8E2D7] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DC] mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#B55234]" />
              <h3 className="font-bold text-[#1A1A1A]">Manage {currentRestaurant?.name ?? "restaurant"}</h3>
            </div>
            <button onClick={() => setManageOpen(false)} className="p-1 rounded-full hover:bg-black/5">
              <X className="w-5 h-5 text-[#6B6661]" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Live Service Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Open", "Break", "Closed"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRestaurantStatus(st)}
                    className={`py-2 px-3 rounded-xl font-bold transition-all text-center ${
                      restaurantStatus === st
                        ? "bg-[#B55234] text-white shadow-xs"
                        : "bg-white border border-[#DFD8CC] text-[#4A443D]"
                    }`}
                  >
                    {st === "Open" ? "🟢 Open" : st === "Break" ? "🟠 Break" : "🔴 Closed"}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#DFD8CC] space-y-1.5 text-[#5C564E]">
              <p>📍 Location: <span className="font-semibold text-[#1A1A1A]">{currentRestaurant?.location ?? "—"}</span></p>
              <p>🪑 Total Tables: <span className="font-semibold text-[#1A1A1A]">{currentRestaurant?.tablesCount ?? 0}</span></p>
              <p>👥 Seating Capacity: <span className="font-semibold text-[#1A1A1A]">{currentRestaurant?.capacity ?? 0} seats</span></p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setManageOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#B55234] text-white font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modal 5: Full Screen Floor Plan
  const renderFloorPlanModal = () => {
    if (!floorPlanOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-[#FAF7F2] rounded-3xl border border-[#E8E2D7] w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECE7DC] bg-white/80">
            <div className="flex items-center gap-2.5">
              <Maximize2 className="w-5 h-5 text-[#B55234]" />
              <div>
                <h3 className="font-bold text-base text-[#1A1A1A]">
                  Full Floor Plan — {currentRestaurant?.name ?? "restaurant"}
                </h3>
                <p className="text-xs text-[#7A746B]">
                  Live interactive table management with real-time seating updates
                </p>
              </div>
            </div>
            <button onClick={() => setFloorPlanOpen(false)} className="p-1.5 rounded-full hover:bg-black/5">
              <X className="w-5 h-5 text-[#6B6661]" />
            </button>
          </div>

          <div className="flex-1 bg-[#E8E1D3] p-6 relative overflow-hidden flex items-center justify-center">
            <div className="relative w-full h-full max-w-4xl bg-[#F4EFE6] rounded-2xl border-2 border-[#CFC5B4] p-8 shadow-inner flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#736D65] border-b pb-2">
                <span className="font-bold tracking-wider uppercase text-[#1A1A1A]">Terrace Garden Patio (Floor 1)</span>
                <span className="font-semibold text-emerald-700">🟢 12 Available · 🔴 6 Reserved · 🟠 5 Occupied</span>
              </div>

              {/* Grid Tables Display */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-4 my-auto">
                {Array.from({ length: 18 }).map((_, i) => {
                  const num = i + 1;
                  const status = num % 3 === 0 ? "Occupied" : num % 4 === 0 ? "Reserved" : "Available";
                  return (
                    <div
                      key={num}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-transform hover:scale-105 shadow-xs ${
                        status === "Available"
                          ? "bg-white border-emerald-300 text-emerald-800"
                          : status === "Reserved"
                          ? "bg-rose-50 border-rose-300 text-rose-800"
                          : "bg-amber-50 border-amber-300 text-amber-800"
                      }`}
                    >
                      <span className="font-bold text-xs">T{num < 10 ? `0${num}` : num}</span>
                      <span className="text-[10px] mt-0.5 opacity-80">{status}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t text-xs text-[#736D65]">
                <span>Restivo Dynamic Table Engine v2</span>
                <span className="font-bold">Compass: N ↑</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderReservationModal()}
      {renderMenuItemModal()}
      {renderTableModal()}
      {renderManageModal()}
      {renderFloorPlanModal()}
    </>
  );
}
