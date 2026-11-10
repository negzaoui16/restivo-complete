import { Navbar } from "./_components/Navbar";
import { HeroSection } from "./_components/HeroSection";
import { FeatureIconsRow } from "./_components/FeatureIconsRow";
import { PlatformSection } from "./_components/PlatformSection";
import { PersonaCards } from "./_components/PersonaCards";
import { BannerSection } from "./_components/BannerSection";
import { TestimonialsSection } from "./_components/TestimonialsSection";
import { Footer } from "./_components/Footer";

export default function Homepage() {
  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-[#1A1A1A] font-sans overflow-x-hidden selection:bg-[#B55234] selection:text-white">
      {/* Top container with macro-pattern background */}
      <div
        className="relative w-full bg-[#FAF7F2]"
        style={{
          backgroundImage: "url('/VisualIdentity/macroPattern.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "950px auto",
          backgroundPosition: "center top",
        }}
      >
        {/* Soft radial overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F2]/60 via-transparent to-[#FAF7F2]/80 pointer-events-none" />

        <Navbar />
        <HeroSection />
        <FeatureIconsRow />
        <PlatformSection />
        <PersonaCards />
      </div>

      <BannerSection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}
