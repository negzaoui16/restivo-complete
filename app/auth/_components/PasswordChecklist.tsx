"use client";

import React from "react";

interface PasswordChecklistProps {
  password: string;
}

export function PasswordChecklist({ password }: PasswordChecklistProps) {
  const requirements = [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "One uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "One number",
      met: /[0-9]/.test(password),
    },
    {
      label: "One special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 py-1">
      {requirements.map((req) => (
        <div key={req.label} className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-200 ${
              req.met
                ? "bg-[#6B7F5B] text-white"
                : "border border-[#6B7F5B]/50 text-[#6B7F5B]/60 bg-transparent"
            }`}
          >
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span
            className={`text-xs transition-colors duration-200 ${
              req.met ? "text-zinc-800 font-medium" : "text-zinc-500"
            }`}
          >
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
}
