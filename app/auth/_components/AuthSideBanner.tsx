"use client";

import React from "react";
import Image from "next/image";

interface AuthSideBannerProps {
  headline: string;
  subheadline: string;
}

export function AuthSideBanner({ headline, subheadline }: AuthSideBannerProps) {
  return (
    <div className="relative w-full h-full min-h-[220px] sm:min-h-[280px] lg:min-h-full overflow-hidden select-none">
      {/* Restaurant Atmosphere Image */}
      <Image
        src="/images/auth-restaurant-banner.jpg"
        alt="Restivo Restaurant Ambience"
        fill
        priority
        className="object-cover object-center"
      />

      {/* Dark warm gradient overlay for readable caption */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div className="absolute inset-0 ring-1 ring-inset ring-black/5" />

      {/* Caption at bottom */}
      <div className="absolute bottom-6 sm:bottom-10 left-6 sm:left-9 right-6 z-10">
        <p className="text-white text-lg sm:text-xl font-normal leading-tight">
          {headline}
          <br />
          {subheadline}
        </p>
        <div className="w-8 h-[3px] bg-[#B55234] mt-3.5 rounded-full" />
      </div>
    </div>
  );
}
