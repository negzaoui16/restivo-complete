"use client";

/**
 * ============================================================================
 * COMPOSANT : PWAInstallPrompt (Installation Native de l'Application Restivo)
 * ============================================================================
 * Fichier : app/_components/PWAInstallPrompt.tsx
 *
 * RÔLE CLÉ :
 * Permet au jury, professeur et clients d'installer l'application Restivo
 * directement sur leur appareil (Smartphone Android / iPhone ou PC Windows / Mac) :
 * 1. Détecte l'événement standard `beforeinstallprompt` sur Chrome / Edge / Android.
 * 2. Déclenche la boîte de dialogue native du système d'exploitation ("Installer Restivo ?").
 * 3. Guide pas-à-pas les utilisateurs iOS (Safari) pour "Ajouter à l'écran d'accueil".
 * 4. Détecte automatiquement si l'application est déjà lancée en mode standalone
 *    (installée) pour masquer discrètement le bouton.
 * ============================================================================
 */

import React, { useEffect, useState } from "react";
import { Download, Smartphone, X, Check, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Vérifier si l'application est DÉJÀ installée et lancée en mode standalone
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Détecter iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = ua.includes("safari") && !ua.includes("chrome") && !ua.includes("crios") && !ua.includes("fxios");
    if (isIosDevice && isSafari) {
      setIsIOS(true);
      setCanInstall(true);
    }

    // 3. Écouter l'événement standard PWA `beforeinstallprompt` (Chrome, Edge, Android, Windows)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setInstallSuccess(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      setTimeout(() => setIsStandalone(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Déclencher l'installation native
  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback si l'événement n'a pas encore trigger
      alert("Pour installer Restivo : Ouvrez le menu de votre navigateur (les 3 points en haut) et choisissez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallSuccess(true);
        setCanInstall(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn("[PWAInstallPrompt] Erreur lors de l'installation:", err);
    }
  };

  // Ne rien afficher si déjà installé ou si l'utilisateur a fermé la notification
  if (isStandalone || isDismissed) return null;

  return (
    <>
      {/* Toast Flottant d'Installation (Desktop & Mobile) */}
      <div className="fixed bottom-4 right-4 z-[999] max-w-[92vw] sm:max-w-sm animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-[#1A1A1A] text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 backdrop-blur-md">
          {/* Icône de l'app */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B55234] to-[#E06D48] flex items-center justify-center shrink-0 shadow-inner">
            <Smartphone className="w-5 h-5 text-white" />
          </div>

          {/* Textes explicatifs */}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Installer Restivo</span>
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded">
                App PWA
              </span>
            </h4>
            <p className="text-[11px] text-[#A39C91] line-clamp-1">
              Accès rapide, 3D AR fluide & Mode Hors-Ligne
            </p>
          </div>

          {/* Bouton d'action */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#B55234] hover:bg-[#C95E3D] text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              {installSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Installé !</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Installer</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              aria-label="Fermer la suggestion"
              className="w-7 h-7 rounded-lg text-[#736D65] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal d'instructions pour iPhone (iOS Safari) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-[#E8E2D7] animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#B55234]" />
                Installer sur iPhone (Safari)
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-full bg-[#FAF7F2] text-[#736D65] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#736D65] mb-4">
              Pour ajouter Restivo à votre écran d&apos;accueil iOS :
            </p>

            <ol className="space-y-3 text-xs text-[#1A1A1A] font-medium">
              <li className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7]">
                <Share className="w-4 h-4 text-blue-600 shrink-0" />
                <span>1. Appuyez sur le bouton <strong>Partager</strong> en bas de Safari</span>
              </li>
              <li className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7]">
                <PlusSquare className="w-4 h-4 text-[#1A1A1A] shrink-0" />
                <span>2. Faites défiler et appuyez sur <strong>Sur l&apos;écran d&apos;accueil</strong></span>
              </li>
              <li className="flex items-center gap-2.5 p-2 rounded-xl bg-[#FAF7F2] border border-[#E8E2D7]">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>3. Appuyez sur <strong>Ajouter</strong> en haut à droite</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#1A1A1A] text-white text-xs font-bold"
            >
              C&apos;est compris !
            </button>
          </div>
        </div>
      )}
    </>
  );
}
