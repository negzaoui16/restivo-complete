"use client";

/**
 * Présentation guidée de la page publique : diapositives dans une modale,
 * avec voix off (Web Speech API). Les textes viennent de lib/tour/steps.ts.
 * La voix ne démarre qu'après un clic de l'utilisateur.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  BookOpen,
  Bell,
  CalendarDays,
  Compass,
  HelpCircle,
  LayoutDashboard,
  Radio,
  RotateCcw,
  Search,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
  Users2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useVoiceOver } from "@/hooks/useVoiceOver";
import { TOUR_STEPS, type TourRole, type TourStep } from "@/lib/tour/steps";

const OPEN_EVENT = "restivo:open-landing-tour";

/** Ouvre la modale (boutons « Explore Restivo » et « Visite guidée »). */
export function openLandingTour(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_EVENT));
}

export const ROLES: {
  id: TourRole;
  label: string;
  icon: typeof Users2;
  resume: string;
  cta: { label: string; href: string };
}[] = [
  {
    id: "client",
    label: "Client",
    icon: UtensilsCrossed,
    resume: "Je réserve une table et je précommande mes plats.",
    cta: { label: "Créer un compte", href: "/auth/signup" },
  },
  {
    id: "manager",
    label: "Gérant",
    icon: LayoutDashboard,
    resume: "Je gère mon restaurant : salle, menu, réservations et équipe.",
    cta: { label: "Créer un compte", href: "/auth/signup" },
  },
  {
    id: "staff",
    label: "Personnel",
    icon: Users2,
    resume: "Je travaille dans un restaurant et je suis le service du jour.",
    cta: { label: "Se connecter", href: "/auth/signin" },
  },
];

const STEP_ICONS: Record<string, typeof Sparkles> = {
  "client-recherche": Search,
  "client-explorer": Compass,
  "client-reservations": CalendarDays,
  "client-commandes": ShoppingBag,
  "client-notifications": Bell,
  "manager-tableau": LayoutDashboard,
  "manager-reservations": CalendarDays,
  "manager-salle": Radio,
  "manager-menu": BookOpen,
  "manager-tables": Armchair,
  "manager-ia": Sparkles,
  "client-aide": HelpCircle,
  "manager-aide": HelpCircle,
  "staff-aide": HelpCircle,
  "staff-accueil": Users2,
  "staff-reservations": CalendarDays,
  "staff-commandes": ShoppingBag,
};

const INTRO_SPOKEN =
  "Choisissez votre rôle : client, gérant ou personnel. Je vous explique ensuite l'application étape par étape.";

function slideText(step: TourStep): string {
  return step.publicText ?? step.texte;
}

export function LandingTour() {
  const voice = useVoiceOver();
  const { supported, speak, stop } = voice;

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<TourRole | null>(null);
  const [index, setIndex] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const steps = role ? TOUR_STEPS[role] : [];
  const step = role ? steps[index] : undefined;
  const roleInfo = ROLES.find((r) => r.id === role);

  const close = useCallback(() => {
    stop();
    setOpen(false);
    setRole(null);
    setIndex(0);
  }, [stop]);

  // Ouverture par événement.
  useEffect(() => {
    const onOpen = () => {
      lastFocused.current = document.activeElement as HTMLElement | null;
      setRole(null);
      setIndex(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // Échap, piège du focus, blocage du défilement de la page.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")
      );
      if (items.length === 0) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      lastFocused.current?.focus?.();
    };
  }, [open, close]);

  // Arrêt de la voix au démontage.
  useEffect(() => stop, [stop]);

  if (!open) return null;

  /** Change de diapo : coupe la voix, puis relit la nouvelle si elle est activée. */
  const goTo = (nextRole: TourRole | null, nextIndex: number) => {
    stop();
    setRole(nextRole);
    setIndex(nextIndex);
    if (!voiceOn) return;
    if (nextRole === null) {
      speak(INTRO_SPOKEN);
      return;
    }
    const s = TOUR_STEPS[nextRole][nextIndex];
    if (s) speak(`${s.titre}. ${slideText(s)}`);
  };

  const currentSpoken = step ? `${step.titre}. ${slideText(step)}` : INTRO_SPOKEN;

  const toggleVoice = () => {
    if (voiceOn) {
      setVoiceOn(false);
      stop();
    } else {
      setVoiceOn(true);
      speak(currentSpoken); // déclenché par un clic : autorisé par le navigateur
    }
  };

  const last = step ? index === steps.length - 1 : false;
  const StepIcon = (step && STEP_ICONS[step.id]) || Sparkles;

  const ghostBtn =
    "rounded-xl border border-[#E8E2D7] bg-white px-4 py-2.5 text-sm font-semibold text-[#4A4643] hover:bg-[#F5F1E8] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B55234]";
  const pillBtn =
    "flex items-center gap-1.5 rounded-full border border-[#E8E2D7] bg-white px-3 py-1.5 text-xs font-semibold text-[#4A4643] hover:bg-[#F5F1E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B55234]";

  return (
    <div className="fixed inset-0 z-[1100] flex items-stretch justify-center bg-black/55 sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Présentation guidée de Restivo"
        className="flex h-full w-full flex-col bg-[#FAF7F2] text-[#1A1A1A] shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl sm:border sm:border-[#E8E2D7]"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3 border-b border-[#ECE7DC] px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#B55234]">
            {step ? `${roleInfo?.label} · ${index + 1}/${steps.length}` : "Visite guidée"}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-[#6B6661] hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B55234]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {step ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5ECE5] text-[#B55234]">
                <StepIcon className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold">{step.titre}</h2>
              <p className="mt-2 text-base leading-relaxed text-[#4A4643]">{slideText(step)}</p>
              <div
                className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[#ECE7DC]"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={steps.length}
                aria-valuenow={index + 1}
              >
                <div
                  className="h-full rounded-full bg-[#B55234] transition-all"
                  style={{ width: `${((index + 1) / steps.length) * 100}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Découvrez Restivo</h2>
              <p className="mt-2 text-base text-[#4A4643]">
                Quel est votre rôle ? Nous vous expliquons l&apos;application en quelques étapes.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => goTo(r.id, 0)}
                      className="flex items-start gap-3 rounded-2xl border border-[#E8E2D7] bg-white p-4 text-left hover:border-[#B55234] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B55234]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5ECE5] text-[#B55234]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-base font-bold">{r.label}</span>
                        <span className="block text-sm text-[#6B6661]">{r.resume}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pied : voix + navigation */}
        <div className="flex flex-col gap-3 border-t border-[#ECE7DC] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {supported ? (
              <>
                <button type="button" onClick={toggleVoice} aria-pressed={voiceOn} className={pillBtn}>
                  {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  Voix {voiceOn ? "on" : "off"}
                </button>
                {voiceOn ? (
                  <button type="button" onClick={() => speak(currentSpoken)} className={pillBtn}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Réécouter
                  </button>
                ) : null}
              </>
            ) : (
              <span className="text-xs text-[#7A746B]">Voix indisponible : lecture du texte seul.</span>
            )}
          </div>

          {step ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => goTo(null, 0)} className={ghostBtn}>
                Changer de rôle
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => goTo(role, index - 1)}
                  className={ghostBtn}
                >
                  Précédent
                </button>
                {last && roleInfo ? (
                  <Link
                    href={roleInfo.cta.href}
                    className="rounded-xl bg-[#B55234] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9C4429] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B55234] focus-visible:ring-offset-2"
                  >
                    {roleInfo.cta.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => goTo(role, index + 1)}
                    className="rounded-xl bg-[#B55234] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9C4429] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B55234] focus-visible:ring-offset-2"
                  >
                    Suivant
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button type="button" onClick={close} className={ghostBtn}>
              Fermer
            </button>
          )}
          {step && last ? (
            <button type="button" onClick={close} className="self-center text-xs font-semibold text-[#7A746B] hover:text-[#1A1A1A]">
              Fermer
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
