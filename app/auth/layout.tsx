/**
 * Shared layout for all /auth/* routes.
 *
 * The background layer is mounted once by the Next.js App Router and is
 * NEVER torn down when navigating between /auth/signin and /auth/signup.
 * Only the card content (children) swaps — the background stays still.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full font-sans antialiased text-[#1A1A1A] selection:bg-[#B55234] selection:text-white">
      {/* ── Fixed background pattern (z-0 so it sits above body, below content) ── */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: "url('/VisualIdentity/microPattern.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "880px auto",
          backgroundColor: "#FAF7F2",
        }}
      />
      {/* Soft frosted overlay */}
      <div className="fixed inset-0 z-0 bg-[#FAF7F2]/40 backdrop-blur-[0.5px] pointer-events-none" />

      {/* ── Page content — above background ── */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center p-4 sm:p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
