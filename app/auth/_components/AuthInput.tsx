"use client";

import React, { useState } from "react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export function AuthInput({
  label,
  leftIcon,
  isPassword = false,
  type = "text",
  className = "",
  ...props
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full">
      <label className="block text-[11.5px] sm:text-[13px] font-semibold text-[#1A1A1A] mb-1">
        {label}
      </label>
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 sm:left-3.5 flex items-center justify-center text-zinc-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={inputType}
          className={`w-full h-10 sm:h-11 rounded-xl bg-[#F6F3EB]/70 border border-[#E5E0D5] text-[#1A1A1A] placeholder:text-zinc-400 text-xs sm:text-sm px-3 sm:px-3.5 transition-all duration-200 outline-none focus:bg-white focus:border-[#B55234] focus:ring-2 focus:ring-[#B55234]/15 ${
            leftIcon ? "pl-9 sm:pl-10" : ""
          } ${isPassword ? "pr-9 sm:pr-10" : ""} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute right-3.5 p-1 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              /* Eye Off Icon */
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
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              </svg>
            ) : (
              /* Eye Icon with slash line as in design */
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
