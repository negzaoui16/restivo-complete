// No client directive needed — purely presentational

// ─── Individual Feature Icon Components ──────────────────────────────────────

function DigitalMenusIcon() {
  return (
    <svg className="w-5 h-5 text-[#B55234]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

function TableManagementIcon() {
  return (
    <svg className="w-5 h-5 text-[#B55234]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="7" width="16" height="10" rx="3" />
      <path d="M8 7V4m8 3V4m-8 13v3m8-3v3" />
    </svg>
  );
}

function ReservationsIcon() {
  return (
    <svg className="w-5 h-5 text-[#B55234]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

function CustomerManagementIcon() {
  return (
    <svg className="w-5 h-5 text-[#B55234]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0113 0" />
      <path d="M17 11l2 2 4-4" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg className="w-5 h-5 text-[#B55234]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

// ─── Feature Item ─────────────────────────────────────────────────────────────

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  colSpan?: boolean;
}

function FeatureItem({ icon, title, description, colSpan }: FeatureItemProps) {
  return (
    <div className={`flex flex-col items-start group${colSpan ? " col-span-2 md:col-span-1" : ""}`}>
      <div className="w-10 h-10 rounded-xl bg-[#FAF2ED] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
        {icon}
      </div>
      <h3 className="font-bold text-[#161413] text-sm sm:text-[15px] mb-1.5">{title}</h3>
      <p className="text-zinc-600 text-xs sm:text-[13px] leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Feature Icons Row ────────────────────────────────────────────────────────

export function FeatureIconsRow() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 pb-20 sm:pb-28">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-6 pt-6 border-t border-[#E8E2D5]/80">
        <FeatureItem
          icon={<DigitalMenusIcon />}
          title="Digital Menus"
          description="Update your menu in real time and increase your efficiency."
        />
        <FeatureItem
          icon={<TableManagementIcon />}
          title="Table Management"
          description="Optimize your seating and maximize table turnover."
        />
        <FeatureItem
          icon={<ReservationsIcon />}
          title="Reservations"
          description="Manage bookings, waitlists and customer preferences."
        />
        <FeatureItem
          icon={<CustomerManagementIcon />}
          title="Customer Management"
          description="Build lasting relationships with your guests."
        />
        <FeatureItem
          icon={<AnalyticsIcon />}
          title="Analytics & KPIs"
          description="Make data-driven decisions and grow your business."
          colSpan
        />
      </div>
    </section>
  );
}
