import { MainpageProvider } from "./_components/MainpageProvider";
import { MainpageShell } from "./_components/MainpageShell";

/**
 * Shared layout for every /mainpage/* route.
 *
 * The Next.js App Router keeps this layout mounted across sibling
 * navigations, so the sidebar and top nav never remount — only `children`
 * (the page body) swaps.
 */
export default function MainpageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainpageProvider>
      <MainpageShell>{children}</MainpageShell>
    </MainpageProvider>
  );
}
