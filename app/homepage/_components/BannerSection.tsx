import Image from "next/image";
import Link from "next/link";

export function BannerSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#121110]">
      {/* Ambient Restaurant Background */}
      <div className="absolute inset-0">
        <Image
          src="/images/restaurant-ambient.jpg"
          alt="Restivo modern restaurant atmosphere"
          fill
          className="object-cover object-center opacity-45 mix-blend-luminosity scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121110] via-[#121110]/80 to-transparent" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#121110]/60 to-[#121110]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Content */}
          <div className="lg:col-span-8">
            <span className="text-[#D98263] font-bold text-[12px] sm:text-[13px] tracking-[0.2em] uppercase mb-4 block">
              BUILT FOR MODERN RESTAURANTS
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-[-0.03em] text-white leading-[1.12] mb-6">
              Everything you need.
              <br />
              In one platform.
            </h2>
            <p className="text-zinc-300 text-base sm:text-lg leading-[1.65] max-w-xl mb-9">
              Menus, tables, reservations, customers, analytics, operations and more — all in a
              single, intuitive platform designed for the way you work, not the other way around.
            </p>

            <Link
              href="#create"
              className="group inline-flex items-center gap-3 rounded-full bg-[#B55234] hover:bg-[#9E4328] text-white px-8 py-4 text-[15px] font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
            >
              <span>Create your restaurant</span>
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* Right: Floating Glass Badge */}
          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <div className="bg-white/88 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-white/40 shadow-2xl flex items-center justify-between gap-6 max-w-xs hover:bg-white/95 transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FAF2ED] text-[#B55234] flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="2" />
                    <rect x="14" y="3" width="7" height="7" rx="2" />
                    <rect x="3" y="14" width="7" height="7" rx="2" />
                    <rect x="14" y="14" width="7" height="7" rx="2" />
                  </svg>
                </div>
                <div className="text-xs sm:text-sm text-zinc-800 leading-snug">
                  <span>Better operations.</span>
                  <br />
                  <span className="font-bold text-zinc-950">Happier guests.</span>
                </div>
              </div>

              <span className="text-[#B55234]">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
