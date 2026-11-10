"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Phone, UserRound } from "lucide-react";
import { AuthInput } from "@/app/auth/_components/AuthInput";
import { ApiError, useAuth } from "@/contexts/AuthContext";
import { apiMe } from "@/lib/auth/client";
import { ProfileIdentityCard } from "../_components/ProfileIdentityCard";
import { RestivoGlyph } from "../_components/RestivoGlyph";

interface ProfileFormState {
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  bio: string;
}

const EMPTY_FORM: ProfileFormState = {
  firstName: "",
  lastName: "",
  displayName: "",
  phone: "",
  bio: "",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, isReady, isLoading, getAccessToken, updateProfile, signOut } = useAuth();

  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [saved, setSaved] = useState<ProfileFormState>(EMPTY_FORM);
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<unknown>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !user) return;

    let cancelled = false;
    const currentUser = user;

    async function loadProfile() {
      const token = getAccessToken();
      setEmail(currentUser.email);
      setAvatarUrl(currentUser.avatarUrl);
      setForm({
        firstName: currentUser.firstName ?? "",
        lastName: currentUser.lastName ?? "",
        displayName: currentUser.displayName ?? "",
        phone: "",
        bio: "",
      });

      if (!token) {
        setHydrated(true);
        return;
      }

      try {
        const me = await apiMe(token);
        if (cancelled) return;
        const next: ProfileFormState = {
          firstName: me.firstName ?? "",
          lastName: me.lastName ?? "",
          displayName: me.displayName ?? "",
          phone: me.phone ?? "",
          bio: me.bio ?? "",
        };
        setForm(next);
        setSaved(next);
        setEmail(me.email);
        setAvatarUrl(me.avatarUrl);
        setCreatedAt(me.createdAt);
      } catch {
        if (!cancelled) {
          setSaved({
            firstName: currentUser.firstName ?? "",
            lastName: currentUser.lastName ?? "",
            displayName: currentUser.displayName ?? "",
            phone: "",
            bio: "",
          });
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isReady, user?.id, getAccessToken]);

  const dirty = useMemo(
    () =>
      form.firstName !== saved.firstName ||
      form.lastName !== saved.lastName ||
      form.displayName !== saved.displayName ||
      form.phone !== saved.phone ||
      form.bio !== saved.bio,
    [form, saved]
  );

  const setField = (key: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }

    setSaving(true);
    try {
      const me = await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        displayName: form.displayName.trim() || undefined,
        phone: form.phone.trim(),
        bio: form.bio,
      });
      const next: ProfileFormState = {
        firstName: me.firstName ?? "",
        lastName: me.lastName ?? "",
        displayName: me.displayName ?? "",
        phone: me.phone ?? "",
        bio: me.bio ?? "",
      };
      setForm(next);
      setSaved(next);
      setSuccess("Saved. This is how you’ll appear on bookings.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/signin");
  };

  if (!isReady || isLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <aside className="relative overflow-hidden rounded-2xl border border-[#E8E2D7] bg-[#F3EBE3] p-6 shadow-2xs">
            <RestivoGlyph
              className="pointer-events-none absolute -right-3 -top-2 h-28 w-28 opacity-[0.12]"
              color="#B55234"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0705C]">
              Your table
            </p>
            <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#B55234] text-lg font-extrabold text-white">
              R
            </div>
            <p className="mt-4 text-[13px] font-semibold text-[#2C2926]">Guest</p>
            <p className="mt-1 text-[12px] text-[#7A746B]">
              Sign in to put a name on the reservation.
            </p>
            <div className="mt-6 h-[2px] w-6 rounded-full bg-[#B55234]" />
          </aside>
        </div>

        <div className="lg:col-span-8 flex flex-col justify-center rounded-2xl border border-[#E8E2D7] bg-white/80 px-6 py-12 shadow-2xs sm:px-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1A1A1A]">
            Sign in to manage your profile
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[#736D65]">
            Names, phone and the note restaurants see on your booking live here.
          </p>
          <Link
            href="/auth/signin"
            className="mt-6 inline-flex h-11 w-fit items-center justify-center rounded-full bg-[#B55234] px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#9E4328]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 pb-4">
      <header className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0705C]">
          Account
        </p>
        <h1 className="mt-1 text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1A1A1A]">
          Your profile
        </h1>
        <p className="mt-1 text-sm text-[#736D65]">
          How hosts will recognise you when you walk in.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-4">
          <ProfileIdentityCard
            firstName={form.firstName}
            lastName={form.lastName}
            displayName={form.displayName}
            email={email}
            avatarUrl={avatarUrl}
            createdAt={createdAt}
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 rounded-2xl border border-[#E8E2D7] bg-white/80 p-4 sm:p-6 shadow-2xs"
        >
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-[#C6E6CD] bg-[#E7F5EA] p-2.5 text-xs font-medium text-[#227B3A]">
              {success}
            </div>
          )}

          <section>
            <h2 className="text-[13px] font-bold text-[#1A1A1A]">The name on the reservation</h2>
            <p className="mt-0.5 mb-4 text-[12px] text-[#8A7F74]">
              Used at the door and on the booking confirmation.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AuthInput
                label="First name"
                name="firstName"
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                leftIcon={<UserRound className="h-4 w-4" />}
              />
              <AuthInput
                label="Last name"
                name="lastName"
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                leftIcon={<UserRound className="h-4 w-4" />}
              />
            </div>

            <div className="mt-3">
              <AuthInput
                label="Name on the booking"
                name="displayName"
                autoComplete="nickname"
                placeholder={`${form.firstName} ${form.lastName}`.trim() || "How you appear to the restaurant"}
                value={form.displayName}
                onChange={(e) => setField("displayName", e.target.value)}
              />
            </div>
          </section>

          <section className="mt-6 border-t border-[#EDE8DE] pt-5">
            <h2 className="text-[13px] font-bold text-[#1A1A1A]">How to reach you</h2>
            <p className="mt-0.5 mb-4 text-[12px] text-[#8A7F74]">
              Email stays on the account. Phone is for the restaurant if the table changes.
            </p>

            <div className="space-y-3">
              <div className="w-full">
                <label className="mb-1 block text-[11.5px] sm:text-[13px] font-semibold text-[#1A1A1A]">
                  Email
                </label>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-3.5 text-zinc-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="h-10 w-full cursor-not-allowed rounded-xl border border-[#E5E0D5] bg-[#F6F3EB]/70 px-3.5 pl-10 pr-10 text-xs sm:text-sm text-[#6B6661] sm:h-11"
                  />
                  <Lock className="pointer-events-none absolute right-3.5 h-3.5 w-3.5 text-[#C4BDB3]" />
                </div>
              </div>

              <AuthInput
                label="Phone number"
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="+216 12 345 678"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                leftIcon={<Phone className="h-4 w-4" />}
              />
            </div>
          </section>

          <section className="mt-6 border-t border-[#EDE8DE] pt-5">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-bold text-[#1A1A1A]">A note for restaurants</h2>
                <p className="mt-0.5 text-[12px] text-[#8A7F74]">
                  Allergies, a preferred name, or how you like to be seated.
                </p>
              </div>
              <span
                className={`text-[11px] tabular-nums ${
                  form.bio.length > 260 ? "font-semibold text-[#B55234]" : "text-[#9E988F]"
                }`}
              >
                {form.bio.length}/280
              </span>
            </div>
            <textarea
              name="bio"
              rows={4}
              maxLength={280}
              value={form.bio}
              onChange={(e) => setField("bio", e.target.value)}
              placeholder="Window table when you can — celebrating a birthday this month."
              className="w-full resize-none rounded-xl border border-[#E5E0D5] bg-[#F6F3EB]/70 px-3.5 py-3 text-xs sm:text-sm text-[#1A1A1A] placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-[#B55234] focus:bg-white focus:ring-2 focus:ring-[#B55234]/15"
            />
          </section>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-semibold text-[#8A7F74] transition-colors hover:text-[#B55234]"
            >
              Sign out of Restivo
            </button>

            <button
              type="submit"
              disabled={!dirty || saving || !hydrated}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#B55234] px-7 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#9E4328] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="h-64 animate-pulse rounded-2xl bg-[#EFE9DF] lg:col-span-4" />
      <div className="h-96 animate-pulse rounded-2xl bg-[#EFE9DF] lg:col-span-8" />
    </div>
  );
}
