import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "./_components/PWAInstallPrompt";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Serif used for the titles of the menu book only (self-hosted by next/font, no npm package).
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Restivo — The Restaurant Operating System",
  description: "Create your menu, design your tables, manage reservations, and deliver a better dining experience — all from one beautifully connected platform.",
  icons: {
    icon: "/VisualIdentity/AppIcon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${playfair.variable} font-sans h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#FAF7F2] text-[#1A1A1A]">
        {/* Enregistrement du Service Worker PWA pour l'installation native */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
        <AuthProvider>{children}</AuthProvider>
        <PWAInstallPrompt />
        <Script
          type="module"
          src="/vendor/model-viewer.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
