"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthInput } from "../_components/AuthInput";
import { PasswordChecklist } from "../_components/PasswordChecklist";
import { SocialAuthButtons } from "../_components/SocialAuthButtons";
import { AuthSideBanner } from "../_components/AuthSideBanner";
import { useAuth, ApiError } from "@/contexts/AuthContext";

// ─── Role data ────────────────────────────────────────────────────────────────

const ROLES = [
  {
    id: "owner",
    title: "Owner or Manager",
    description: "Create and manage your restaurant",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: "staff",
    title: "Work at a restaurant",
    description: "Join a restaurant team",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "customer",
    title: "I'm a customer",
    description: "Discover and book restaurants",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-1.5-.454M9 6l3-3 3 3M9 6H5.5a2 2 0 00-2 2v10a2 2 0 002 2h13a2 2 0 002-2V8a2 2 0 00-2-2H15" />
      </svg>
    ),
  },
] as const;

type RoleId = (typeof ROLES)[number]["id"];

// ─── Banner copy per stage ─────────────────────────────────────────────────────

const BANNER: Record<1 | 2 | 3, { headline: string; subheadline: string }> = {
  1: { headline: "Better restaurants.", subheadline: "Together." },
  2: { headline: "Almost there.", subheadline: "Secure your workspace." },
  3: { headline: "One platform.", subheadline: "Every role." },
};

const STAGE_TITLE: Record<1 | 2 | 3, string> = {
  1: "Create your Restivo account",
  2: "Set your password",
  3: "How will you use Restivo?",
};

const STAGE_SUBTITLE: Record<1 | 2 | 3, string> = {
  1: "One account for your restaurant, your team and your dining experience.",
  2: "Choose a strong password to protect your restaurant workspace.",
  3: "Select the option that best describes you. You can always change this later.",
};

// ─── Role Card ────────────────────────────────────────────────────────────────

interface RoleCardProps {
  id: RoleId;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: (id: RoleId) => void;
}

function RoleCard({ id, title, description, icon, selected, onSelect }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`w-full flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
        selected
          ? "border-[#B55234] bg-[#FAF2ED] shadow-sm"
          : "border-[#E5E0D5] bg-[#F6F3EB]/70 hover:border-[#C8B9A8] hover:bg-[#F0EBE1]"
      }`}
    >
      {/* Icon container */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          selected ? "bg-[#B55234] text-white" : "bg-white text-zinc-500 border border-[#E5E0D5]"
        }`}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-[13px] font-bold leading-tight ${selected ? "text-[#161413]" : "text-zinc-800"}`}>
          {title}
        </p>
        <p className={`text-[11px] sm:text-xs mt-0.5 leading-tight ${selected ? "text-[#7A4028]" : "text-zinc-500"}`}>
          {description}
        </p>
      </div>

      {/* Selection indicator */}
      <div
        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          selected ? "border-[#B55234] bg-[#B55234]" : "border-[#D0C9BD]"
        }`}
      >
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  // Wizard stage: 1 = Personal details, 2 = Password & Terms, 3 = Role
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  // Stage 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Stage 2 fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Stage 3 fields
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Stage 1 → 2 ─────────────────────────────────────────────────────────────

  const handleStage1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim()) return setError("Please enter your first name.");
    if (!lastName.trim()) return setError("Please enter your last name.");
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email))
      return setError("Please enter a valid email address.");

    setStage(2);
  };

  // ── Stage 2 → 3 ─────────────────────────────────────────────────────────────

  const handleStage2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8)
      return setError("Password must be at least 8 characters long.");
    if (!/[A-Z]/.test(password))
      return setError("Password must include at least one uppercase letter.");
    if (!/[0-9]/.test(password))
      return setError("Password must include at least one number.");
    if (!/[^A-Za-z0-9]/.test(password))
      return setError("Password must include at least one special character.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");
    if (!agreedToTerms)
      return setError("Please agree to the Terms of Service and Privacy Policy.");

    setStage(3);
  };

  // ── Stage 3 → Submit ─────────────────────────────────────────────────────────

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRole) return setError("Please select how you plan to use Restivo.");

    setIsLoading(true);

    try {
      await signUp({
        email,
        password,
        firstName,
        lastName,
        phone: phone.trim() || undefined,
        role: selectedRole,
      });

      // Route new users into the app
      router.push("/mainpage");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className="relative z-10 w-full max-w-[440px] md:max-w-[890px] bg-[#FAF7F2] rounded-2xl sm:rounded-[32px] border border-black/[0.08] shadow-[0_20px_50px_-15px_rgba(26,26,26,0.18)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 md:min-h-[560px]">

        {/* Left Column: Side Banner */}
        <div className="hidden md:block md:col-span-5 relative h-full">
          <AuthSideBanner
            headline={BANNER[stage].headline}
            subheadline={BANNER[stage].subheadline}
          />
        </div>

        {/* Right Column: Multi-stage Form */}
        <div className="md:col-span-7 p-4 sm:p-7 md:p-9 lg:p-10 flex flex-col justify-center bg-[#FAF7F2]">

          {/* Top Bar: Logo + Step indicator */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <Link href="/homepage" className="inline-block group">
              <Image
                src="/images/restivo-logo-primary.png"
                alt="RESTIVO"
                width={130}
                height={28}
                priority
                className="h-5 sm:h-6 md:h-7 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              />
            </Link>

            {/* 3-dot progress */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10.5px] sm:text-[11px] font-semibold text-[#5C5752] uppercase tracking-wider">
                Step {stage} of 3
              </span>
              <div className="flex items-center gap-1">
                {([1, 2, 3] as const).map((s) => (
                  <span
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      stage >= s ? "bg-[#B55234] w-4 sm:w-5" : "bg-[#E5E0D5] w-4 sm:w-5"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <h1 className="text-xl sm:text-2xl md:text-[26px] font-extrabold tracking-[-0.025em] text-[#161413] leading-tight mb-1">
            {STAGE_TITLE[stage]}
          </h1>
          <p className="text-[11.5px] sm:text-xs md:text-[13px] text-[#5C5752] mb-3 sm:mb-4">
            {STAGE_SUBTITLE[stage]}
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mb-2.5 p-2 sm:p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-in fade-in duration-200">
              {error}
            </div>
          )}

          {/* ================================================================ */}
          {/* STAGE 1: Personal Details                                        */}
          {/* ================================================================ */}
          {stage === 1 && (
            <form
              onSubmit={handleStage1Submit}
              className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-200"
            >
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <AuthInput
                  label="First name"
                  name="firstName"
                  autoComplete="given-name"
                  required
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); if (error) setError(null); }}
                  leftIcon={
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
                <AuthInput
                  label="Last name"
                  name="lastName"
                  autoComplete="family-name"
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); if (error) setError(null); }}
                  leftIcon={
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
              </div>

              <AuthInput
                label="Email address"
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                leftIcon={
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />

              <AuthInput
                label="Phone number (optional)"
                type="tel"
                name="phone"
                autoComplete="tel"
                placeholder="+216 12 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              />

              <button
                type="submit"
                className="w-full h-10 sm:h-11 rounded-full bg-[#B55234] hover:bg-[#9E4328] text-white font-semibold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group active:scale-[0.99] cursor-pointer pt-0.5 mt-1"
              >
                <span>Continue</span>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <SocialAuthButtons />

              <div className="pt-2 text-center text-[11.5px] sm:text-xs text-zinc-600">
                Already have an account?{" "}
                <Link href="/auth/signin" className="font-semibold text-[#B55234] hover:text-[#9E4328] underline-offset-2 hover:underline transition-colors">
                  Sign in
                </Link>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* STAGE 2: Password & Terms                                        */}
          {/* ================================================================ */}
          {stage === 2 && (
            <form
              onSubmit={handleStage2Submit}
              className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-200"
            >
              <button
                type="button"
                onClick={() => { setError(null); setStage(1); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B55234] hover:text-[#9E4328] transition-colors cursor-pointer mb-0.5"
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to personal details</span>
              </button>

              <div className="space-y-1">
                <AuthInput
                  label="Password"
                  name="password"
                  autoComplete="new-password"
                  required
                  isPassword
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                  leftIcon={
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4" />
                    </svg>
                  }
                />
                <PasswordChecklist password={password} />
              </div>

              <AuthInput
                label="Confirm password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                isPassword
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(null); }}
                leftIcon={
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4" />
                  </svg>
                }
              />

              <div className="pt-0.5">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => { setAgreedToTerms(e.target.checked); if (error) setError(null); }}
                    required
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 rounded border-[#D0C9BD] text-[#B55234] focus:ring-[#B55234]/30 accent-[#B55234] cursor-pointer"
                  />
                  <span className="text-[11px] sm:text-xs text-zinc-700 leading-tight">
                    I agree to the{" "}
                    <Link href="#terms" onClick={(e) => { e.preventDefault(); alert("Terms of Service modal"); }} className="text-[#B55234] font-semibold hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="#privacy" onClick={(e) => { e.preventDefault(); alert("Privacy Policy modal"); }} className="text-[#B55234] font-semibold hover:underline">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full h-10 sm:h-11 rounded-full bg-[#B55234] hover:bg-[#9E4328] text-white font-semibold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group active:scale-[0.99] cursor-pointer pt-0.5"
              >
                <span>Continue</span>
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <div className="pt-2 text-center text-[11.5px] sm:text-xs text-zinc-600">
                Already have an account?{" "}
                <Link href="/auth/signin" className="font-semibold text-[#B55234] hover:text-[#9E4328] underline-offset-2 hover:underline transition-colors">
                  Sign in
                </Link>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* STAGE 3: Role Selection                                          */}
          {/* ================================================================ */}
          {stage === 3 && (
            <form
              onSubmit={handleFinalSubmit}
              className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-200"
            >
              <button
                type="button"
                onClick={() => { setError(null); setStage(2); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B55234] hover:text-[#9E4328] transition-colors cursor-pointer mb-0.5"
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to password</span>
              </button>

              {/* Role cards */}
              <div className="space-y-2">
                {ROLES.map((role) => (
                  <RoleCard
                    key={role.id}
                    {...role}
                    selected={selectedRole === role.id}
                    onSelect={(id) => { setSelectedRole(id); if (error) setError(null); }}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 sm:h-11 rounded-full bg-[#B55234] hover:bg-[#9E4328] text-white font-semibold text-xs sm:text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group active:scale-[0.99] cursor-pointer disabled:opacity-75 pt-0.5"
              >
                <span>{isLoading ? "Creating account..." : "Create account"}</span>
                {!isLoading && (
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>

              <div className="pt-2 text-center text-[11.5px] sm:text-xs text-zinc-600">
                Already have an account?{" "}
                <Link href="/auth/signin" className="font-semibold text-[#B55234] hover:text-[#9E4328] underline-offset-2 hover:underline transition-colors">
                  Sign in
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </main>
  );
}
