"use client";

import { CuisineField, ImageUrlField, PriceLevelField } from "./ProfileFields";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  Store,
  Check,
  MapPin,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ApiError, useAuth } from "@/contexts/AuthContext";
import { apiCreateRestaurant } from "@/lib/restaurants/client";
import { DEFAULT_WEEK_HOURS } from "@/lib/restaurants/constants";
import { toManagedRestaurant, useRestaurantManager } from "../_context/RestaurantManagerContext";

const PRESET_PHOTOS = [
  { label: "Mediterranean Terrace", src: "/images/restaurant-ambient.jpg" },
  { label: "Bistrot Charm", src: "/images/le-bistrot.jpg" },
  { label: "Coastal Seaside", src: "/images/dar-el-marsa.jpg" },
  { label: "Artisan Cafe", src: "/images/cafe-des-arts.jpg" },
  { label: "Fine Dining Lounge", src: "/images/le-comptoir.jpg" },
];

const STEPS = [
  { id: 1 as const, label: "Identity" },
  { id: 2 as const, label: "Location" },
  { id: 3 as const, label: "Hours" },
  { id: 4 as const, label: "Floor" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const inputClass =
  "w-full bg-white rounded-xl border border-[#DFD8CC] px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1A1A] placeholder:text-[#9E988F] focus:outline-none focus:border-[#B55234] focus:ring-2 focus:ring-[#B55234]/15 transition-all";

const labelClass =
  "block text-[11px] font-bold text-[#2A2621] uppercase tracking-wider mb-1.5";

type HoursDay = (typeof DEFAULT_WEEK_HOURS)[number];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function AddRestaurantModal() {
  const { isAddRestaurantOpen, setIsAddRestaurantOpen, upsertRestaurant } =
    useRestaurantManager();
  const { getAccessToken } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("TND");
  const [timezone, setTimezone] = useState("Africa/Tunis");
  const [coverUrl, setCoverUrl] = useState(PRESET_PHOTOS[0].src);
  const [cuisine, setCuisine] = useState("");
  const [priceLevel, setPriceLevel] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Tunisia");
  const [postalCode, setPostalCode] = useState("");
  const [hours, setHours] = useState<HoursDay[]>(DEFAULT_WEEK_HOURS);
  const [floorName, setFloorName] = useState("Main floor");
  const [floorWidth, setFloorWidth] = useState(1200);
  const [floorHeight, setFloorHeight] = useState(800);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAddRestaurantOpen) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) setIsAddRestaurantOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAddRestaurantOpen, isSubmitting, setIsAddRestaurantOpen]);

  if (!isAddRestaurantOpen) return null;

  function resetForm() {
    setStep(1);
    setName("");
    setDescription("");
    setPhone("");
    setEmail("");
    setWebsite("");
    setCurrency("TND");
    setTimezone("Africa/Tunis");
    setCoverUrl(PRESET_PHOTOS[0].src);
    setCuisine("");
    setPriceLevel(null);
    setLogoUrl("");
    setAddress("");
    setCity("");
    setCountry("Tunisia");
    setPostalCode("");
    setHours(DEFAULT_WEEK_HOURS);
    setFloorName("Main floor");
    setFloorWidth(1200);
    setFloorHeight(800);
    setError(null);
    setSuccess(false);
  }

  function close() {
    if (isSubmitting) return;
    setIsAddRestaurantOpen(false);
    resetForm();
  }

  function validateStep(current: 1 | 2 | 3 | 4): string | null {
    if (current === 1 && name.trim().length < 2) {
      return "Give your restaurant a name (at least 2 characters).";
    }
    if (current === 3) {
      const openWithoutTimes = hours.find(
        (day) => !day.isClosed && (!day.openTime || !day.closeTime)
      );
      if (openWithoutTimes) {
        return `Set opening hours for ${DAY_NAMES[openWithoutTimes.dayOfWeek]}.`;
      }
      const sameTimes = hours.find(
        (day) => !day.isClosed && day.openTime && day.openTime === day.closeTime
      );
      if (sameTimes) {
        return `${DAY_NAMES[sameTimes.dayOfWeek]}: closing time must differ from opening time.`;
      }
    }
    if (current === 4) {
      if (!floorName.trim()) return "Name this floor.";
      if (floorWidth < 400 || floorHeight < 400) {
        return "Floor size must be at least 400 × 400.";
      }
    }
    return null;
  }

  function goNext() {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((prev) => (prev < 4 ? ((prev + 1) as 2 | 3 | 4) : prev));
  }

  function goBack() {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  }

  function updateHour(dayOfWeek: number, patch: Partial<HoursDay>) {
    setHours((prev) =>
      prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day))
    );
  }

  function copyMondayToWeek() {
    const monday = hours.find((day) => day.dayOfWeek === 1);
    if (!monday) return;
    setHours((prev) =>
      prev.map((day) =>
        day.dayOfWeek >= 1 && day.dayOfWeek <= 5
          ? { ...day, isClosed: monday.isClosed, openTime: monday.openTime, closeTime: monday.closeTime }
          : day
      )
    );
  }

  async function handleCreate() {
    const message = validateStep(4);
    if (message) {
      setError(message);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setError("Your session expired. Sign in again to create a restaurant.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await apiCreateRestaurant(token, {
        name: name.trim(),
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
        cuisine: cuisine.trim() || undefined,
        priceLevel: priceLevel ?? undefined,
        logoUrl: logoUrl.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        currency,
        timezone,
        hours: hours.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          isClosed: day.isClosed,
          openTime: day.isClosed ? null : day.openTime,
          closeTime: day.isClosed ? null : day.closeTime,
        })),
        floor: {
          name: floorName.trim(),
          width: floorWidth,
          height: floorHeight,
        },
      });

      upsertRestaurant(toManagedRestaurant(created));
      setSuccess(true);
      window.setTimeout(() => {
        setIsAddRestaurantOpen(false);
        resetForm();
      }, 900);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the restaurant. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-3xl border border-[#E8E2D7] w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-[#ECE7DC] bg-white/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#FAF0EA] flex items-center justify-center text-[#B55234] shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#1A1A1A]">Add a restaurant</h3>
              <p className="text-xs text-[#7A746B]">Four short steps. You can change this later.</p>
            </div>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#6B6661] hover:text-[#1A1A1A] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 pt-4 pb-2">
          <ol className="grid grid-cols-4 gap-1.5">
            {STEPS.map((item) => {
              const active = step === item.id;
              const done = step > item.id;
              return (
                <li key={item.id} className="flex flex-col gap-1">
                  <div
                    className={`h-1 rounded-full ${
                      active || done ? "bg-[#B55234]" : "bg-[#E8E2D7]"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold ${
                      active ? "text-[#B55234]" : done ? "text-[#1A1A1A]" : "text-[#9E988F]"
                    }`}
                  >
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="px-5 sm:px-6 pb-5 overflow-y-auto space-y-4">
          {success ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <Check className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <h4 className="text-lg font-bold text-[#1A1A1A]">Restaurant created</h4>
              <p className="text-xs text-[#7A746B] mt-1">Opening it in your workspace…</p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-3.5">
                  <Field label="Restaurant name *">
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Villa Didon"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Short description">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="What should guests know about this place?"
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Phone">
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+216 …"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="hello@restaurant.tn"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <Field label="Website">
                    <input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://"
                      className={inputClass}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Currency">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className={inputClass}
                      >
                        <option value="TND">TND</option>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </Field>
                    <Field label="Timezone">
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className={inputClass}
                      >
                        <option value="Africa/Tunis">Africa/Tunis</option>
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CuisineField value={cuisine} onChange={setCuisine} />
                    <PriceLevelField value={priceLevel} currency={currency} onChange={setPriceLevel} />
                  </div>
                  <ImageUrlField label="Logo link (optional)" value={logoUrl} onChange={setLogoUrl} />
                  <Field label="Cover photo">
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_PHOTOS.map((photo) => {
                        const selected = coverUrl === photo.src;
                        return (
                          <button
                            key={photo.src}
                            type="button"
                            onClick={() => setCoverUrl(photo.src)}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                              selected
                                ? "border-[#B55234] ring-2 ring-[#B55234]/30"
                                : "border-transparent opacity-75 hover:opacity-100"
                            }`}
                          >
                            <Image src={photo.src} alt={photo.label} fill sizes="80px" className="object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <ImageUrlField wide label="Or a cover link" value={coverUrl} onChange={setCoverUrl} />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3.5">
                  <Field label="Street address">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E988F]" />
                      <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="14 Avenue Habib Bourguiba"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="City">
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Tunis"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Postal code">
                      <input
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="1000"
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <Field label="Country">
                    <input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#7A746B] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Closed days stay closed. Open days need a start and end.
                    </p>
                    <button
                      type="button"
                      onClick={copyMondayToWeek}
                      className="text-[11px] font-semibold text-[#B55234] hover:underline"
                    >
                      Copy Monday to weekdays
                    </button>
                  </div>
                  <div className="space-y-2">
                    {hours.map((day) => (
                      <div
                        key={day.dayOfWeek}
                        className="grid grid-cols-[88px_1fr_1fr_auto] gap-2 items-center bg-white/70 border border-[#E8E2D7] rounded-xl px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-[#1A1A1A]">
                          {DAY_NAMES[day.dayOfWeek]}
                        </span>
                        <input
                          type="time"
                          disabled={day.isClosed}
                          value={day.openTime ?? "11:00"}
                          onChange={(e) => updateHour(day.dayOfWeek, { openTime: e.target.value })}
                          className={`${inputClass} py-1.5 disabled:opacity-40`}
                        />
                        <input
                          type="time"
                          disabled={day.isClosed}
                          value={day.closeTime ?? "23:00"}
                          onChange={(e) => updateHour(day.dayOfWeek, { closeTime: e.target.value })}
                          className={`${inputClass} py-1.5 disabled:opacity-40`}
                        />
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#666059] whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={day.isClosed}
                            onChange={(e) =>
                              updateHour(day.dayOfWeek, { isClosed: e.target.checked })
                            }
                            className="accent-[#B55234]"
                          />
                          Closed
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3.5">
                  <p className="text-xs text-[#7A746B] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    This is the first floor for your table map. You can add more later.
                  </p>
                  <Field label="Floor name">
                    <input
                      value={floorName}
                      onChange={(e) => setFloorName(e.target.value)}
                      placeholder="Main floor"
                      className={inputClass}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Width">
                      <input
                        type="number"
                        min={400}
                        max={4000}
                        value={floorWidth}
                        onChange={(e) => setFloorWidth(Number(e.target.value))}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Height">
                      <input
                        type="number"
                        min={400}
                        max={4000}
                        value={floorHeight}
                        onChange={(e) => setFloorHeight(Number(e.target.value))}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs font-semibold text-[#B55234] bg-[#FAF0EA] border border-[#F3DFD4] rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              <div className="pt-2 border-t border-[#ECE7DC] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={step === 1 ? close : goBack}
                  className="px-4 py-2 rounded-xl border border-[#DFD8CC] text-xs font-semibold text-[#666059] hover:bg-black/5 transition-colors inline-flex items-center gap-1"
                >
                  {step > 1 && <ChevronLeft className="w-3.5 h-3.5" />}
                  {step === 1 ? "Cancel" : "Back"}
                </button>
                {step < 4 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="px-5 py-2 rounded-xl bg-[#B55234] hover:bg-[#994127] text-white text-xs font-bold transition-all inline-flex items-center gap-1"
                  >
                    Continue
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-[#B55234] hover:bg-[#994127] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isSubmitting ? "Creating…" : "Create restaurant"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
