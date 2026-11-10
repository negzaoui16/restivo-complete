import Image from "next/image";

// ─── Shared Arrow CTA ─────────────────────────────────────────────────────────

function CardArrow() {
  return (
    <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center">
      <span className="w-8 h-8 rounded-full bg-[#FAF2ED] text-[#B55234] group-hover:bg-[#B55234] group-hover:text-white flex items-center justify-center transition-all duration-200">
        <svg
          className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </span>
    </div>
  );
}

// ─── Staff Card Mockup Widget ─────────────────────────────────────────────────

function StaffScheduleMockup() {
  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF7F2] border border-black/5 mb-6 p-4 flex items-center justify-center group-hover:scale-[1.01] transition-transform">
      <div className="w-full h-full max-w-[240px] bg-white rounded-xl shadow-lg border border-zinc-200/80 p-3.5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-2.5">
            <span className="font-extrabold text-xs text-zinc-900 tracking-tight">Today</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="space-y-2 text-[10.5px]">
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#FAF2ED] text-zinc-800">
              <span className="w-2 h-2 rounded-full bg-[#B55234] flex-shrink-0" />
              <div className="truncate">
                <span className="font-semibold">New reservation</span>
                <br />
                <span className="text-zinc-500">Table 12 • 4 guests • 19:30</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-50 text-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <div className="truncate">
                <span className="font-medium">Table 04 • 2 guests • 19:45</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-zinc-50 text-zinc-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              <div className="truncate">
                <span className="font-medium">Table 09 • 4 guests • 20:00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[10px] text-[#B55234] font-semibold">
          <span>2 orders ready</span>
          <span>→</span>
        </div>
      </div>
    </div>
  );
}

// ─── Persona Card ─────────────────────────────────────────────────────────────

interface PersonaCardProps {
  eyebrow: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
}

function PersonaCard({ eyebrow, title, description, mockup }: PersonaCardProps) {
  return (
    <article className="group bg-white rounded-3xl p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-[#EBE6DC] hover:border-[#B55234]/30 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
      <div>
        {mockup}
        <span className="text-[#B55234] font-bold text-[11px] sm:text-xs tracking-[0.16em] uppercase mb-2 block">
          {eyebrow}
        </span>
        <h3 className="font-extrabold text-[#161413] text-xl sm:text-[22px] leading-snug mb-3">
          {title}
        </h3>
        <p className="text-zinc-600 text-sm leading-relaxed">{description}</p>
      </div>
      <CardArrow />
    </article>
  );
}

// ─── Persona Cards Section ────────────────────────────────────────────────────

export function PersonaCards() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pb-24 sm:pb-32">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: Owners & Managers */}
        <PersonaCard
          eyebrow="FOR OWNERS & MANAGERS"
          title="Run your restaurant with clarity."
          description="Create menus, manage tables, reservations, staff and business performance from one place."
          mockup={
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF7F2] border border-black/5 mb-6 flex items-center justify-center shadow-inner group-hover:scale-[1.01] transition-transform">
              <Image
                src="/images/dashboard-crop.png"
                alt="Restivo Owner & Manager Analytics Dashboard"
                width={800}
                height={600}
                className="w-full h-full object-cover object-left-top"
              />
            </div>
          }
        />

        {/* Card 2: Staff */}
        <PersonaCard
          eyebrow="FOR STAFF"
          title="Know what needs attention."
          description="Stay on top of reservations, tables and orders in real time."
          mockup={<StaffScheduleMockup />}
        />

        {/* Card 3: Customers */}
        <PersonaCard
          eyebrow="FOR CUSTOMERS"
          title="Discover. Explore. Enjoy."
          description="Find the perfect table, browse the menu, order and enjoy a seamless experience."
          mockup={
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#FAF7F2] border border-black/5 mb-6 flex items-center justify-center group-hover:scale-[1.01] transition-transform">
              <Image
                src="/images/customer-mobile.jpg"
                alt="Restivo Customer Mobile Reservation Experience"
                width={600}
                height={800}
                className="w-full h-full object-contain p-2"
              />
            </div>
          }
        />
      </div>
    </section>
  );
}
