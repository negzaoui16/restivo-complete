"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthInput } from "../_components/AuthInput";
import { SocialAuthButtons } from "../_components/SocialAuthButtons";
import { AuthSideBanner } from "../_components/AuthSideBanner";
import { useAuth, ApiError } from "@/contexts/AuthContext";

export default function SignInPage() {
  const router = useRouter();
  const { signIn, user, isReady } = useAuth();

  React.useEffect(() => {
    if (isReady && user) {
      router.replace("/mainpage");
    }
  }, [user, isReady, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn({ email, password });
      router.push("/mainpage");
      router.refresh(); // ensure server components re-render with new session
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
      <main className="relative z-10 w-full max-w-[440px] md:max-w-[880px] bg-[#FAF7F2] rounded-2xl sm:rounded-[32px] border border-black/[0.08] shadow-[0_20px_50px_-15px_rgba(26,26,26,0.18)] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 md:min-h-[560px]">
          {/* Left Column: Atmospheric Restaurant Banner (Desktop/Tablet only) */}
          <div className="hidden md:block md:col-span-5 relative h-full">
            <AuthSideBanner
              headline="One account."
              subheadline="Multiple experiences."
            />
          </div>

          {/* Right Column: Sign In Form */}
          <div className="md:col-span-7 p-4 sm:p-7 md:p-9 lg:p-11 flex flex-col justify-center bg-[#FAF7F2]">
            {/* Brand Logo */}
            <div className="mb-3.5 sm:mb-5">
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
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl md:text-[28px] font-extrabold tracking-[-0.025em] text-[#161413] leading-tight mb-1">
              Welcome back
            </h1>
            <p className="text-[11.5px] sm:text-xs md:text-[13.5px] text-[#5C5752] mb-4 sm:mb-5">
              Sign in to continue to Restivo.
            </p>

            {/* Error banner */}
            {error && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-in fade-in duration-200">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} method="POST" action="javascript:void(0);" className="space-y-4">
              {/* Email Address */}
              <AuthInput
                label="Email address"
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                }
              />

              {/* Password */}
              <AuthInput
                label="Password"
                name="password"
                autoComplete="current-password"
                required
                isPassword
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 11V7a4 4 0 118 0v4"
                    />
                  </svg>
                }
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D0C9BD] text-[#B55234] focus:ring-[#B55234]/30 accent-[#B55234] cursor-pointer"
                  />
                  <span className="text-xs text-zinc-700 font-medium">
                    Remember me
                  </span>
                </label>

                <Link
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Password recovery link sent to your email.");
                  }}
                  className="text-xs font-semibold text-[#B55234] hover:text-[#9E4328] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 sm:h-[46px] rounded-full bg-[#B55234] hover:bg-[#9E4328] text-white font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 group active:scale-[0.99] cursor-pointer disabled:opacity-75"
              >
                <span>{isLoading ? "Signing in..." : "Sign in"}</span>
                {!isLoading && (
                  <svg
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                )}
              </button>
            </form>

            {/* Divider & Social SSO */}
            <SocialAuthButtons />

            {/* Switch to Sign Up */}
            <div className="mt-6 text-center text-xs sm:text-[13px] text-zinc-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/signup"
                className="font-semibold text-[#B55234] hover:text-[#9E4328] underline-offset-2 hover:underline transition-colors"
              >
                Create one
              </Link>
            </div>
          </div>
        </div>
      </main>
  );
}
