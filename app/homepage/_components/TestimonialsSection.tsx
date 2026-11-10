"use client";

import Image from "next/image";
import { useCarousel } from "../_hooks/useCarousel";
import { TESTIMONIALS, METRICS } from "../_data";

// ─── Testimonial Card ─────────────────────────────────────────────────────────

interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
  image: string;
  onPrev: () => void;
  onNext: () => void;
}

function TestimonialCard({ quote, author, role, image, onPrev, onNext }: TestimonialCardProps) {
  return (
    <div className="bg-[#F5F1E8] border border-[#E8E2D5] rounded-3xl p-7 sm:p-8 shadow-sm flex flex-col justify-between min-h-[220px]">
      <p className="text-zinc-800 text-base sm:text-[17px] font-normal leading-relaxed mb-6">
        {quote}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-black/5">
        {/* Author */}
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-white">
            <Image src={image} alt={author} fill className="object-cover" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 leading-tight">{author}</h4>
            <span className="text-[11px] sm:text-xs text-zinc-500">{role}</span>
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous testimonial"
            className="w-8 h-8 rounded-full border border-zinc-300 hover:border-black hover:bg-black/5 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next testimonial"
            className="w-8 h-8 rounded-full border border-zinc-300 hover:border-black hover:bg-black/5 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Testimonials Section ─────────────────────────────────────────────────────

export function TestimonialsSection() {
  const { active, prev, next } = useCarousel(TESTIMONIALS.length);
  const current = TESTIMONIALS[active];

  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 py-20 lg:py-28">
      <span className="text-[#B55234] font-bold text-[12px] sm:text-[13px] tracking-[0.18em] uppercase mb-3 block">
        TRUSTED BY MODERN RESTAURANTS
      </span>
      <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-[-0.03em] text-[#161413] leading-[1.12] mb-12">
        Real restaurants. Real results.
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left: Metrics */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-4">
          {METRICS.map(({ value, label, accent }) => (
            <div key={label}>
              <div
                className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  accent ? "text-[#B55234]" : "text-[#161413]"
                }`}
              >
                {value}
              </div>
              <p className="text-zinc-600 text-xs sm:text-[13px] font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Right: Testimonial Carousel */}
        <div className="lg:col-span-5">
          <TestimonialCard
            quote={current.quote}
            author={current.author}
            role={current.role}
            image={current.image}
            onPrev={prev}
            onNext={next}
          />
        </div>
      </div>
    </section>
  );
}
