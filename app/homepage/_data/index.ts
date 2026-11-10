// ─── Navigation ─────────────────────────────────────────────────────────────

export const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "For Restaurants", href: "#restaurants" },
  { label: "For Customers", href: "#customers" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
] as const;

// ─── Hero Floorplan ──────────────────────────────────────────────────────────

export const FLOORS = [
  { name: "Main Floor", color: "bg-[#B55234]" },
  { name: "Terrace", color: "bg-[#6B7F5B]" },
  { name: "Private Room", color: "bg-[#D9A74A]" },
  { name: "Bar", color: "bg-[#8C6D58]" },
  { name: "Kitchen", color: "bg-[#A65B32]" },
] as const;

// ─── Feature Icons Row ───────────────────────────────────────────────────────

export const HERO_FEATURES = [
  {
    id: "menus",
    title: "Digital Menus",
    description: "Update your menu in real time and increase your efficiency.",
    colSpan: false,
  },
  {
    id: "tables",
    title: "Table Management",
    description: "Optimize your seating and maximize table turnover.",
    colSpan: false,
  },
  {
    id: "reservations",
    title: "Reservations",
    description: "Manage bookings, waitlists and customer preferences.",
    colSpan: false,
  },
  {
    id: "customers",
    title: "Customer Management",
    description: "Build lasting relationships with your guests.",
    colSpan: false,
  },
  {
    id: "analytics",
    title: "Analytics & KPIs",
    description: "Make data-driven decisions and grow your business.",
    colSpan: true,
  },
] as const;

// ─── Testimonials ────────────────────────────────────────────────────────────

export const TESTIMONIALS = [
  {
    id: 1,
    quote:
      "\u201cRestivo has completely changed how we manage our restaurant. It\u2019s intuitive, powerful and our team loves it.\u201d",
    author: "Sophie Laurent",
    role: "Owner, Le Bellevue",
    image: "/images/sophie-laurent.jpg",
  },
  {
    id: 2,
    quote:
      "\u201cTable turnover improved by 22% in our first month. The 3D floorplan makes host seating effortless during peak rush.\u201d",
    author: "Marco Moretti",
    role: "General Manager, Osteria del Sole",
    image: "/images/sophie-laurent.jpg",
  },
  {
    id: 3,
    quote:
      "\u201cFrom menu changes to real-time reservation notifications, Restivo keeps our front and back of house completely in sync.\u201d",
    author: "Elena Rostova",
    role: "Director of Hospitality, L\u2019Atelier Moderne",
    image: "/images/sophie-laurent.jpg",
  },
] as const;

// ─── Social Proof Metrics ────────────────────────────────────────────────────

export const METRICS = [
  { value: "2,500+", label: "Restaurants & Cafés", accent: true },
  { value: "120K+", label: "Active Tables", accent: false },
  { value: "1.8M+", label: "Reservations Managed", accent: false },
  { value: "4.9/5", label: "Customer Satisfaction", accent: false },
] as const;

// ─── Footer ──────────────────────────────────────────────────────────────────

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "#overview" },
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Integrations", href: "#integrations" },
    ],
  },
  {
    title: "For Restaurants",
    links: [
      { label: "Why Restivo", href: "#why" },
      { label: "Use Cases", href: "#use-cases" },
      { label: "Success Stories", href: "#stories" },
      { label: "Resources", href: "#resources" },
    ],
  },
  {
    title: "For Customers",
    links: [
      { label: "Find Restaurants", href: "#find" },
      { label: "How It Works", href: "#how" },
      { label: "For Business", href: "#business" },
      { label: "Support", href: "#support" },
    ],
  },
] as const;

export const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    icon: "linkedin",
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: "instagram",
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    icon: "youtube",
  },
  {
    label: "X (Twitter)",
    href: "https://x.com",
    icon: "x",
  },
] as const;
