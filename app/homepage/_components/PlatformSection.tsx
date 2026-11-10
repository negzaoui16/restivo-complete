// Purely presentational — no client directive needed

// ─── Chevron Arrow (reused 4× between nodes) ──────────────────────────────────

function ChevronRight() {
  return (
    <div className="text-zinc-400 -mt-6 px-1">
      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}

// ─── Step Node ────────────────────────────────────────────────────────────────

interface StepNodeProps {
  icon: React.ReactNode;
  label: React.ReactNode;
}

function StepNode({ icon, label }: StepNodeProps) {
  return (
    <div className="flex flex-col items-center min-w-[70px] group">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#B55234] text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="mt-3 text-xs sm:text-[13px] font-medium text-zinc-700 text-center">{label}</span>
    </div>
  );
}

// ─── Platform Section ─────────────────────────────────────────────────────────

export function PlatformSection() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pb-20 lg:pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left: Header */}
        <div className="lg:col-span-5">
          <span className="text-[#B55234] font-bold text-[12px] sm:text-[13px] tracking-[0.18em] uppercase mb-3 block">
            THE RESTIVO PLATFORM
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-[-0.03em] text-[#161413] leading-[1.12] mb-4">
            From the first reservation
            <br />
            to the last bite.
          </h2>
          <p className="text-[#5C5752] text-base leading-relaxed max-w-md">
            Restivo connects your restaurant, your team, and your customers in one seamless
            experience.
          </p>
        </div>

        {/* Right: Connected Stepper */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between sm:justify-around overflow-x-auto pb-4 pt-2">
            {/* Node 1: Restaurant */}
            <StepNode
              label="Restaurant"
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              }
            />

            <ChevronRight />

            {/* Node 2: Tables */}
            <StepNode
              label="Tables"
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="8" width="16" height="8" rx="2" />
                  <path d="M7 8V4m10 4V4m-10 12v4m10-4v4" />
                </svg>
              }
            />

            <ChevronRight />

            {/* Node 3: Reservations */}
            <StepNode
              label="Reservations"
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              }
            />

            <ChevronRight />

            {/* Node 4: Orders */}
            <StepNode
              label="Orders"
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              }
            />

            <ChevronRight />

            {/* Node 5: Customer Experience */}
            <StepNode
              label={
                <>
                  Customer
                  <br />
                  Experience
                </>
              }
              icon={
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
