"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "../_data";

// ─── Arrow Icon ──────────────────────────────────────────────────────────────

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

// ─── Mobile Drawer ───────────────────────────────────────────────────────────

interface MobileDrawerProps {
  onClose: () => void;
}

function MobileDrawer({ onClose }: MobileDrawerProps) {
  return (
    <div className="lg:hidden mt-4 pt-4 pb-6 px-4 bg-white/95 backdrop-blur-md rounded-2xl border border-black/5 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
      {NAV_LINKS.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          onClick={onClose}
          className="text-base font-medium text-zinc-800 hover:text-[#B55234]"
        >
          {label}
        </Link>
      ))}
      <div className="pt-3 border-t border-zinc-100 flex flex-col gap-3">
        <Link
          href="/auth/signin"
          onClick={onClose}
          className="text-center py-2 text-sm font-medium text-zinc-700"
        >
          Log in
        </Link>
        <Link
          href="/auth/signup"
          onClick={onClose}
          className="text-center py-3 rounded-full bg-[#B55234] text-white text-sm font-medium shadow"
        >
          Get started
        </Link>
      </div>
    </div>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggle = () => setMobileMenuOpen((v) => !v);

  return (
    <header className="relative z-30 max-w-7xl mx-auto px-6 sm:px-8 pt-6 pb-4">
      <div className="flex items-center justify-between">
        {/* Left: Brand Logo + Desktop Nav */}
        <div className="flex items-center gap-10">
          <Link href="/homepage" className="flex items-center gap-3 group">
            <div className="relative h-8 sm:h-9 w-auto">
              <Image
                src="/images/restivo-logo-primary.png"
                alt="RESTIVO"
                width={150}
                height={36}
                priority
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
              />
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-[14.5px] font-medium text-[#4A4643]">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={href} href={href} className="hover:text-[#1A1A1A] transition-colors">
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Auth & Primary CTA (desktop) */}
        <div className="hidden sm:flex items-center gap-6">
          <Link
            href="/auth/signin"
            className="text-[14.5px] font-medium text-[#4A4643] hover:text-[#1A1A1A] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="group relative inline-flex items-center gap-2 rounded-full bg-[#B55234] hover:bg-[#9E4328] text-white px-5 py-2.5 text-[14px] font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
          >
            <span>Get started</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Mobile: mini CTA + hamburger */}
        <div className="lg:hidden flex items-center gap-3">
          <Link
            href="/auth/signup"
            className="sm:hidden inline-flex items-center gap-1.5 rounded-full bg-[#B55234] text-white px-3.5 py-1.5 text-xs font-medium"
          >
            <span>Start</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-lg text-zinc-700 hover:text-black hover:bg-black/5 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && <MobileDrawer onClose={() => setMobileMenuOpen(false)} />}
    </header>
  );
}
