import React from "react";

interface SectionEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function SectionEmptyState({ icon, title, description }: SectionEmptyStateProps) {
  return (
    <div className="mt-3 flex flex-col items-center justify-center text-center py-16 sm:py-24 px-6">
      <div className="w-12 h-12 rounded-2xl bg-[#F5ECE5] text-[#B55234] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
        {title}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[#736D65] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
