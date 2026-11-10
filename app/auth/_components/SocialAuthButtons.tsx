"use client";

import React from "react";

export function SocialAuthButtons() {
  const handleGoogleAuth = () => {
    // Integration hook / mock auth trigger
    console.log("OAuth with Google initiated");
  };

  const handleAppleAuth = () => {
    // Integration hook / mock auth trigger
    console.log("OAuth with Apple initiated");
  };

  return (
    <div className="w-full">
      {/* Divider */}
      <div className="relative flex items-center justify-center my-3 sm:my-4">
        <div className="border-t border-[#E5E0D5] w-full" />
        <span className="bg-[#FAF7F2] px-2.5 text-[10.5px] sm:text-xs text-zinc-400 font-normal tracking-wide uppercase select-none">
          or continue with
        </span>
        <div className="border-t border-[#E5E0D5] w-full" />
      </div>

      {/* Social Buttons: Grid side-by-side on mobile, stacked or side-by-side cleanly */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full h-9 sm:h-10 rounded-full border border-[#E5E0D5] bg-[#F6F3EB]/40 hover:bg-[#F6F3EB] text-zinc-700 text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors active:scale-[0.99] cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="truncate">Google</span>
        </button>

        {/* Apple */}
        <button
          type="button"
          onClick={handleAppleAuth}
          className="w-full h-9 sm:h-10 rounded-full border border-[#E5E0D5] bg-[#F6F3EB]/40 hover:bg-[#F6F3EB] text-zinc-700 text-xs sm:text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors active:scale-[0.99] cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current text-zinc-900 flex-shrink-0" viewBox="0 0 24 24">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.63 1.34-.55.63-.99 1.68-.87 2.69.99.08 2.01-.5 2.58-1.18z" />
          </svg>
          <span className="truncate">Apple</span>
        </button>
      </div>
    </div>
  );
}
