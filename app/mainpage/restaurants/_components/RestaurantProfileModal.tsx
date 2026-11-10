"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  Users,
  Armchair,
  Layers,
  Clock,
  Check,
  Edit3,
  Save,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
} from "lucide-react";
import { ApiError, useAuth } from "@/contexts/AuthContext";
import { apiUpdateRestaurant } from "@/lib/restaurants/client";
import { HoursEditor } from "./HoursEditor";
import { CuisineField, ImageUrlField, PriceLevelField } from "./ProfileFields";
import {
  useRestaurantManager,
  ManagedRestaurant,
} from "../_context/RestaurantManagerContext";

const AMENITY_TAGS = [
  "Outdoor Patio Terrace",
  "Sea / Lake View",
  "Valet Parking",
  "Wi-Fi High Speed",
  "Private VIP Dining Room",
  "Full Cocktail Bar",
  "Vegetarian & Vegan Options",
  "Wheelchair Accessible",
  "Sommelier Wine Cellar",
];

const PRESET_GALLERY = [
  { label: "Main Ambiance", src: "/images/restaurant-ambient.jpg" },
  { label: "Bistrot Dining", src: "/images/le-bistrot.jpg" },
  { label: "Seaside Terrace", src: "/images/dar-el-marsa.jpg" },
  { label: "Artisan Cafe Lounge", src: "/images/cafe-des-arts.jpg" },
  { label: "Fine Dining Bar", src: "/images/le-comptoir.jpg" },
];

export function RestaurantProfileModal() {
  const {
    isProfileModalOpen,
    setIsProfileModalOpen,
    profileModalRestaurant,
    setProfileModalRestaurant,
    restaurants,
    currentRestaurant,
    setCurrentRestaurant,
    updateRestaurantProfile,
  } = useRestaurantManager();

  // Active sub-tab inside the profile modal
  const [activeTab, setActiveTab] = useState<"about" | "contact" | "operations" | "gallery">("about");
  const [isEditing, setIsEditing] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const { getFreshAccessToken } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Messages by form field, from the server (422) or from the checks below.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Editable form state
  const selectedRest = profileModalRestaurant ?? currentRestaurant ?? restaurants[0];

  const [formName, setFormName] = useState("");
  const [formCuisine, setFormCuisine] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState<number | null>(null);
  const [formLogo, setFormLogo] = useState("");
  const [formImage, setFormImage] = useState("");

  // Sync state whenever selectedRest changes
  useEffect(() => {
    if (selectedRest) {
      setFormName(selectedRest.name || "");
      setFormCuisine(selectedRest.cuisine || "");
      setFormPrice(selectedRest.priceLevel ?? null);
      setFormLogo(selectedRest.logoUrl || "");
      setFormCity(selectedRest.city || "");
      setFormAddress(selectedRest.address || "");
      setFormPhone(selectedRest.phone || "");
      setFormEmail(selectedRest.email || "");
      setFormWebsite(selectedRest.website || "");
      setFormDesc(selectedRest.description || "");
      setFormImage(selectedRest.coverUrl || "");
      setIsEditing(false);
      setSaveError(null);
      setFieldErrors({});
    }
  }, [selectedRest]);

  if (!isProfileModalOpen || !selectedRest) return null;

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest || saving) return;

    const found: Record<string, string> = {};
    if (formName.trim().length < 2) found.name = "Restaurant name is required.";
    if (formEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) {
      found.email = "Please enter a valid email address.";
    }
    if (formPhone.trim() && !/^\+?[\d\s\-().]{7,20}$/.test(formPhone.trim())) {
      found.phone = "Please enter a valid phone number.";
    }
    setFieldErrors(found);
    setSaveError(null);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const token = await getFreshAccessToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      const saved = await apiUpdateRestaurant(token, selectedRest.id, {
        name: formName.trim(),
        description: formDesc.trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
        website: formWebsite.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        cuisine: formCuisine.trim(),
        priceLevel: formPrice,
        logoUrl: formLogo.trim(),
        coverUrl: formImage.trim(),
      });

      updateRestaurantProfile(selectedRest.id, {
        name: saved.name,
        description: saved.description ?? undefined,
        address: saved.address ?? undefined,
        city: saved.city ?? undefined,
        phone: saved.phone ?? undefined,
        email: saved.email ?? undefined,
        website: saved.website ?? undefined,
        location: [saved.address, saved.city, saved.country].filter(Boolean).join(", ") || saved.city || "",
        cuisine: saved.cuisine ?? "",
        priceLevel: saved.priceLevel,
        logoUrl: saved.logoUrl,
        coverUrl: saved.coverUrl,
        image: saved.coverUrl || "/images/restaurant-ambient.jpg",
      });

      setIsEditing(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err) {
      if (err instanceof ApiError && err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setSaveError(err instanceof Error ? err.message : "Could not save the profile. Try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const isCurrentActive = currentRestaurant?.id === selectedRest.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-3xl border border-[#E8E2D7] w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* ─── Hero Header & Cover Image ─── */}
        <div className="relative h-44 sm:h-52 w-full shrink-0 overflow-hidden bg-zinc-900 select-none">
          <Image
            src={formImage || selectedRest.image || "/images/restaurant-ambient.jpg"}
            alt={selectedRest.name}
            fill
            sizes="100vw"
            className="object-cover opacity-85"
            priority
          />
          {/* Gradient Tint */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

          {/* Top Controls (Venue selector & Close) */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
            {/* Restaurant Selector Pills */}
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md p-1 rounded-full border border-white/20 max-w-[80%] overflow-x-auto no-scrollbar">
              <span className="text-[10px] uppercase font-bold text-white/70 px-2 hidden sm:inline">
                Venues:
              </span>
              {restaurants.map((rest) => {
                const isThis = rest.id === selectedRest.id;
                return (
                  <button
                    key={rest.id}
                    onClick={() => {
                      setProfileModalRestaurant(rest);
                      setIsEditing(false);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      isThis
                        ? "bg-[#B55234] text-white shadow-xs"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {rest.name}
                  </button>
                );
              })}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-colors shrink-0"
              aria-label="Close Profile"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom of Hero: Avatar, Title, Status & Rating */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 z-10">
            <div className="flex items-end gap-3 min-w-0">
              {/* Restaurant Logo Avatar */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg shrink-0 bg-white">
                <Image
                  src={formImage || selectedRest.image || "/images/restaurant-ambient.jpg"}
                  alt={selectedRest.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>

              {/* Title & Badges */}
              <div className="min-w-0 pb-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight truncate">
                    {selectedRest.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0EA] text-[#B55234]">
                    <ShieldCheck className="w-3 h-3 text-[#B55234]" />
                    <span>{selectedRest.role}</span>
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedRest.status === "Open"
                        ? "bg-emerald-500 text-white"
                        : "bg-rose-500 text-white"
                    }`}
                  >
                    ● {selectedRest.status}
                  </span>
                </div>
                <p className="text-xs text-white/80 truncate mt-0.5">
                  {selectedRest.cuisine} · {selectedRest.city}, Tunisia
                </p>
              </div>
            </div>

            {/* Edit / Rating Pill */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{selectedRest.rating || 4.8}</span>
                <span className="text-white/60 text-[10px]">(342 reviews)</span>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#1A1A1A] hover:bg-[#FAF7F2] text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-[#B55234]" />
                <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Profile Navigation Tabs ─── */}
        <div className="px-6 border-b border-[#ECE7DC] bg-white/80 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-6">
            {[
              { id: "about", label: "About & Story" },
              { id: "contact", label: "Location & Contact" },
              { id: "operations", label: "Capacity & Operations" },
              { id: "gallery", label: "Atmosphere & Photos" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`py-3 text-xs sm:text-[13px] font-semibold transition-all relative whitespace-nowrap ${
                    isActive
                      ? "text-[#B55234]"
                      : "text-[#736D65] hover:text-[#1A1A1A]"
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#B55234] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {saveToast && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved!</span>
            </span>
          )}
        </div>

        {/* ─── Profile Body Content ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 text-[#1A1A1A]">
          {isEditing ? (
            /* ─── Edit Mode Form ─── */
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div className="p-3 bg-[#FAF0EA]/60 rounded-2xl border border-[#F3DFD4] text-xs text-[#B55234] font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  Editing profile for <strong>{selectedRest.name}</strong>. Changes will update live across the dashboard and reservations engine.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#2A2621] uppercase tracking-wider mb-1">
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => { setFormName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: "" })); }}
                    className="w-full bg-white rounded-xl border border-[#DFD8CC] px-3.5 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B55234]"
                  />
                  {fieldErrors.name ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.name}</p> : null}
                </div>

                <div>
                  <CuisineField
                    value={formCuisine}
                    onChange={(value) => { setFormCuisine(value); setFieldErrors((prev) => ({ ...prev, cuisine: "" })); }}
                    error={fieldErrors.cuisine}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2A2621] uppercase tracking-wider mb-1">
                  Story & Description
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => { setFormDesc(e.target.value); setFieldErrors((prev) => ({ ...prev, description: "" })); }}
                  className="w-full bg-white rounded-xl border border-[#DFD8CC] p-3 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B55234] leading-relaxed"
                />
                  {fieldErrors.description ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.description}</p> : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2A2621] uppercase tracking-wider mb-1">
                    City / Area
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => { setFormCity(e.target.value); setFieldErrors((prev) => ({ ...prev, city: "" })); }}
                    className="w-full bg-white rounded-xl border border-[#DFD8CC] px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B55234]"
                  />
                  {fieldErrors.city ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.city}</p> : null}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A2621] uppercase tracking-wider mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => { setFormAddress(e.target.value); setFieldErrors((prev) => ({ ...prev, address: "" })); }}
                    className="w-full bg-white rounded-xl border border-[#DFD8CC] px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B55234]"
                  />
                  {fieldErrors.address ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.address}</p> : null}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A2621] uppercase tracking-wider mb-1">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => { setFormPhone(e.target.value); setFieldErrors((prev) => ({ ...prev, phone: "" })); }}
                    className="w-full bg-white rounded-xl border border-[#DFD8CC] px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B55234]"
                  />
                  {fieldErrors.phone ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.phone}</p> : null}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2A2621] uppercase tracking-wider mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => { setFormEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: "" })); }}
                    className="w-full bg-white rounded-xl border border-[#DFD8CC] px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B55234]"
                  />
                  {fieldErrors.email ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.email}</p> : null}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2A2621] uppercase tracking-wider mb-1">
                    Website / Web App
                  </label>
                  <input
                    type="text"
                    value={formWebsite}
                    onChange={(e) => { setFormWebsite(e.target.value); setFieldErrors((prev) => ({ ...prev, website: "" })); }}
                    className="w-full bg-white rounded-xl border border-[#DFD8CC] px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#B55234]"
                  />
                  {fieldErrors.website ? <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.website}</p> : null}
                </div>
              </div>

              <PriceLevelField
                value={formPrice}
                currency={selectedRest.currency || "TND"}
                onChange={(value) => { setFormPrice(value); setFieldErrors((prev) => ({ ...prev, priceLevel: "" })); }}
                error={fieldErrors.priceLevel}
              />

              <ImageUrlField
                label="Logo link"
                value={formLogo}
                onChange={(value) => { setFormLogo(value); setFieldErrors((prev) => ({ ...prev, logoUrl: "" })); }}
                error={fieldErrors.logoUrl}
              />

              {/* Cover Photo Selection */}
              <div>
                <label className="block text-xs font-bold text-[#2A2621] uppercase tracking-wider mb-2">
                  Select Primary Cover Atmosphere
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_GALLERY.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormImage(g.src)}
                      className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                        formImage === g.src
                          ? "border-[#B55234] ring-2 ring-[#B55234]/30 scale-102"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image src={g.src} alt={g.label} fill sizes="80px" className="object-cover" />
                      {formImage === g.src && (
                        <div className="absolute inset-0 bg-[#B55234]/30 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {saveError && (
                <p role="alert" className="rounded-xl border border-[#F3DFD4] bg-[#FAF0EA] px-3 py-2 text-xs font-semibold text-[#B55234]">
                  {saveError}
                </p>
              )}

              <ImageUrlField
                wide
                label="Or a cover link"
                value={formImage}
                onChange={(value) => { setFormImage(value); setFieldErrors((prev) => ({ ...prev, coverUrl: "" })); }}
                error={fieldErrors.coverUrl}
              />

              <div className="pt-3 border-t border-[#ECE7DC] flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-[#DFD8CC] text-xs font-semibold text-[#736D65] hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#B55234] hover:bg-[#994127] active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ─── View Mode Tabs ─── */
            <>
              {activeTab === "about" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Bio & Story */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C857B] mb-2">
                      About {selectedRest.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#4A453F] leading-relaxed bg-white rounded-2xl p-4 border border-[#ECE7DC]">
                      {formDesc}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white rounded-2xl border border-[#ECE7DC] text-center">
                      <div className="text-[10px] text-[#8C857B] uppercase font-bold">Cuisine</div>
                      <div className="text-xs font-bold text-[#1A1A1A] mt-1">{selectedRest.cuisine}</div>
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-[#ECE7DC] text-center">
                      <div className="text-[10px] text-[#8C857B] uppercase font-bold">Price Range</div>
                      <div className="text-xs font-bold text-[#1A1A1A] mt-1">45 – 120 TND / person</div>
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-[#ECE7DC] text-center">
                      <div className="text-[10px] text-[#8C857B] uppercase font-bold">Total Capacity</div>
                      <div className="text-xs font-bold text-[#1A1A1A] mt-1">{selectedRest.capacity} Guests</div>
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-[#ECE7DC] text-center">
                      <div className="text-[10px] text-[#8C857B] uppercase font-bold">Service Floors</div>
                      <div className="text-xs font-bold text-[#1A1A1A] mt-1">{selectedRest.floorsCount} Floors</div>
                    </div>
                  </div>

                  {/* Venue Amenities & Tags */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C857B] mb-2.5">
                      Venue Features & Amenities
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {AMENITY_TAGS.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E2DDD2] text-xs font-medium text-[#4A443D] shadow-2xs"
                        >
                          <Check className="w-3 h-3 text-[#B55234]" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "contact" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Location Card */}
                    <div className="p-4 bg-white rounded-2xl border border-[#ECE7DC] space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#8C857B]">
                        <MapPin className="w-4 h-4 text-[#B55234]" />
                        <span>Address & Location</span>
                      </div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {formAddress || "Les Berges du Lac II"}
                      </p>
                      <p className="text-xs text-[#736D65]">
                        {formCity}, Tunisia · Postal Code 1053
                      </p>
                      <div className="pt-2 border-t border-[#ECE7DC] flex items-center justify-between text-[11px] text-[#8C857B]">
                        <span>Timezone: Africa/Tunis</span>
                        <span>Currency: TND (Tunisian Dinar)</span>
                      </div>
                    </div>

                    {/* Contact Card */}
                    <div className="p-4 bg-white rounded-2xl border border-[#ECE7DC] space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#8C857B]">
                        <Phone className="w-4 h-4 text-[#B55234]" />
                        <span>Direct Communication</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[#736D65]">Phone:</span>
                          <a
                            href={`tel:${formPhone}`}
                            className="font-bold text-[#B55234] hover:underline"
                          >
                            {formPhone}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#736D65]">Email:</span>
                          <a
                            href={`mailto:${formEmail}`}
                            className="font-bold text-[#B55234] hover:underline"
                          >
                            {formEmail}
                          </a>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#736D65]">Website:</span>
                          <span className="font-semibold text-[#1A1A1A]">{formWebsite}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "operations" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-white rounded-2xl border border-[#ECE7DC] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center">
                        <Armchair className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-[#1A1A1A]">{selectedRest.tablesCount} Tables</div>
                        <div className="text-[11px] text-[#736D65]">Active Floor Layout</div>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-[#ECE7DC] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-[#1A1A1A]">{selectedRest.capacity} Seats</div>
                        <div className="text-[11px] text-[#736D65]">Full Dining Capacity</div>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-[#ECE7DC] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FAF0EA] text-[#B55234] flex items-center justify-center">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-[#1A1A1A]">{selectedRest.floorsCount} Floors</div>
                        <div className="text-[11px] text-[#736D65]">Terrace & Indoor</div>
                      </div>
                    </div>
                  </div>

                  {/* Service hours: real, editable */}
                  <HoursEditor key={selectedRest.id} restaurantId={selectedRest.id} />
                </div>
              )}

              {activeTab === "gallery" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C857B]">
                    Atmosphere & Venue Media
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PRESET_GALLERY.map((g, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-video rounded-2xl overflow-hidden border border-[#ECE7DC] shadow-2xs cursor-pointer"
                        onClick={() => {
                          setFormImage(g.src);
                          updateRestaurantProfile(selectedRest.id, { image: g.src });
                          setSaveToast(true);
                          setTimeout(() => setSaveToast(false), 1500);
                        }}
                      >
                        <Image
                          src={g.src}
                          alt={g.label}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                          <span className="text-[11px] font-bold text-white">
                            {g.label} (Set as Cover)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Footer Controls ─── */}
        <div className="px-6 py-3.5 bg-white border-t border-[#ECE7DC] flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {!isCurrentActive ? (
              <button
                onClick={() => {
                  setCurrentRestaurant(selectedRest);
                  setIsProfileModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#FAF0EA] hover:bg-[#F5E2D6] text-[#B55234] text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>Switch Dashboard to this Venue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                ✓ Currently Active in Dashboard
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#DFD8CC] text-xs font-semibold text-[#666059] hover:bg-black/5 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
