"use client";

/**
 * Visite guidée : accueil au premier lancement, surbrillance de l'élément
 * ciblé (data-tour), bulle de texte et voix off (Web Speech API).
 * Les étapes sont statiques (lib/tour/steps.ts) : aucun appel LLM.
 *
 * Mode démo automatique : enchaîne seul les 3 rôles (lib/tour/demoScript.ts),
 * en connectant les comptes démo via /api/demo/login (DEMO_MODE=true).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  HelpCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Pause,
  Play,
  SkipForward,
  Square,
  PlayCircle,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@/components/LandingTour";
import { useVoiceOver } from "@/hooks/useVoiceOver";
import { TOUR_STEPS, TOUR_STORAGE_PREFIX, type TourRole } from "@/lib/tour/steps";
import {
  DEMO_FLAG,
  DEMO_SCRIPT,
  demoRange,
  demoStepFor,
  isDemoEmail,
  isSafeClickTarget,
} from "@/lib/tour/demoScript";

const START_EVENT = "restivo:start-tour";
const VOICE_KEY = "restivo_tour_voice";
const PAD = 6;

/** Relance la visite (utilisé par le bouton d'aide des barres de navigation). */
export function startTour(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(START_EVENT));
}

export function TourHelpButton() {
  return (
    <button
      type="button"
      onClick={startTour}
      data-tour="tour-help"
      className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-[#E8E4DA] flex items-center justify-center text-[#4A4643] hover:text-[#1A1A1A] transition-all shadow-2xs"
      aria-label="Revoir la visite guidée"
      title="Revoir la visite guidée"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
}

/**
 * Bouton « Démo automatique » de la page d'accueil. À n'afficher que si le
 * serveur est en DEMO_MODE. Le clic est indispensable : il autorise la voix.
 */
export function DemoStartButton({ className }: { className?: string }) {
  const { signInDemo } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<TourRole | null>(null);
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setBusy(null);
    setFailed(false);
  }, []);

  // Échap ferme la fenêtre ; le focus passe sur le premier choix.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const start = async (role: TourRole) => {
    setBusy(role);
    setFailed(false);
    try {
      // « Déverrouille » la synthèse vocale pendant le geste de l'utilisateur.
      if ("speechSynthesis" in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
      }
    } catch {
      // Sans voix, la démo continue en texte.
    }
    try {
      await signInDemo(role);
      try {
        window.sessionStorage.setItem(DEMO_FLAG, role);
      } catch {
        // Sans sessionStorage, la démo ne peut pas démarrer.
      }
      router.push(DEMO_SCRIPT[demoRange(role).start].route);
    } catch {
      setFailed(true);
      setBusy(null);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <PlayCircle className="mr-1.5 inline h-4 w-4 align-[-3px]" />
        Démo automatique
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/55 p-4"
              onClick={close}
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Choisir un profil pour la démo"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-[#E8E2D7] bg-[#FAF7F2] p-5 text-[#1A1A1A] shadow-2xl"
              >
                <h2 className="text-lg font-bold">Quel profil voulez-vous explorer ?</h2>
                <p className="mt-1 text-sm text-[#6B6661]">
                  La démo se déroule seule, avec voix off, pour le profil choisi.
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void start(r.id)}
                        className="flex items-start gap-3 rounded-2xl border border-[#E8E2D7] bg-white p-4 text-left hover:border-[#B55234] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B55234] disabled:opacity-60"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5ECE5] text-[#B55234]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span>
                          <span className="block text-base font-bold">
                            {r.label}
                            {busy === r.id ? " · chargement…" : ""}
                          </span>
                          <span className="block text-sm text-[#6B6661]">{r.resume}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {failed ? (
                  <p className="mt-3 text-sm text-[#C0392B]" role="alert">
                    Démo indisponible. Vérifiez DEMO_MODE et lancez « npm run seed:demo ».
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={close}
                  className="mt-4 w-full rounded-xl border border-[#E8E2D7] bg-white px-4 py-2.5 text-sm font-semibold text-[#4A4643] hover:bg-[#F5F1E8]"
                >
                  Fermer
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible : la visite se proposera à nouveau.
  }
}

/** Indice de départ de la démo demandée (profil mémorisé dans le drapeau), sinon null. */
function demoRequested(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const role = window.sessionStorage.getItem(DEMO_FLAG);
    if (role === "client" || role === "manager" || role === "staff") {
      return demoRange(role).start;
    }
  } catch {
    // Rien à lire.
  }
  return null;
}

const ROLE_LABEL: Record<TourRole, string> = {
  client: "Client",
  manager: "Gérant",
  staff: "Personnel",
};

type Phase = "idle" | "welcome" | "running";
type Box = { top: number; left: number; width: number; height: number };

function findTarget(selector: string | undefined): HTMLElement | null {
  if (!selector) return null;
  const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${selector}"]`);
  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return node;
  }
  return null;
}

export function TourGuide() {
  const { user, isLoading, signInDemo, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const voice = useVoiceOver();
  const { supported, speak, stop } = voice;

  const role: TourRole | null = user
    ? user.canManageRestaurants
      ? "manager"
      : user.isStaff
        ? "staff"
        : "client"
    : null;
  const steps = role ? TOUR_STEPS[role] : [];
  const storageKey = role ? `${TOUR_STORAGE_PREFIX}${role}` : null;

  // "pending" : aucun choix fait ; l'accueil s'affiche si rien n'est mémorisé.
  const [rawPhase, setPhase] = useState<Phase | "pending">("pending");
  const [index, setIndex] = useState(0);
  const [voiceOn, setVoiceOn] = useState(
    () => typeof window === "undefined" || readStorage(VOICE_KEY) !== "off"
  );
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ w: 1024, h: 768 });

  // Démo automatique : indice dans DEMO_SCRIPT (null = hors démo).
  const [demoIdx, setDemoIdx] = useState<number | null>(() => demoRequested());
  const [demoPaused, setDemoPaused] = useState(false);
  const [readyFor, setReadyFor] = useState<number | null>(null);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goDemoRef = useRef<(n: number) => Promise<void>>(async () => {});

  const demoEntry = demoIdx !== null ? DEMO_SCRIPT[demoIdx] : undefined;
  const demoStep = demoEntry ? demoStepFor(demoEntry) : undefined;

  const phase: Phase =
    demoIdx !== null
      ? "running"
      : rawPhase !== "pending"
        ? rawPhase
        : !isLoading && storageKey && !isDemoEmail(user?.email) && readStorage(storageKey) === null
          ? "welcome"
          : "idle";

  const step = demoEntry ? demoStep : phase === "running" ? steps[index] : undefined;

  const clearDwell = useCallback(() => {
    if (dwellRef.current) {
      clearTimeout(dwellRef.current);
      dwellRef.current = null;
    }
  }, []);

  // Le drapeau n'est utile qu'une fois : un rechargement ne relance pas la démo.
  useEffect(() => {
    try {
      window.sessionStorage.removeItem(DEMO_FLAG);
    } catch {
      // Rien à nettoyer.
    }
  }, []);

  // Bouton « Revoir la visite ».
  useEffect(() => {
    const onStart = () => {
      stop();
      setIndex(0);
      setPhase("running");
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [stop]);

  const finish = useCallback(
    (value: string) => {
      stop();
      if (storageKey) writeStorage(storageKey, value);
      setPhase("idle");
      setBox(null);
    },
    [stop, storageKey]
  );

  /** Fin de la démo (terminée ou arrêtée) : déconnecte le compte démo et revient à l'accueil. */
  const endDemo = useCallback(async () => {
    clearDwell();
    stop();
    setDemoIdx(null);
    setDemoPaused(false);
    setBox(null);
    await signOut().catch(() => {});
    // Rechargement volontaire : évite que la redirection vers /auth/signin des pages
    // connectées (utilisateur désormais null) passe après notre retour à l'accueil.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/homepage");
  }, [clearDwell, stop, signOut]);

  /** Passe à l'entrée `n` du script (connexion du compte démo si le rôle change). */
  const goDemo = useCallback(
    async (n: number) => {
      clearDwell();
      stop();
      // Fin du script, ou fin des étapes du profil choisi : la démo s'arrête.
      if (n >= DEMO_SCRIPT.length || DEMO_SCRIPT[n].role !== DEMO_SCRIPT[n - 1]?.role) {
        await endDemo();
        return;
      }
      const entry = DEMO_SCRIPT[n];
      if (entry.action === "changeRole") {
        try {
          await signInDemo(entry.role);
        } catch {
          await endDemo();
          return;
        }
      }
      setDemoPaused(false);
      setDemoIdx(n);
    },
    [clearDwell, stop, endDemo, signInDemo]
  );

  useEffect(() => {
    goDemoRef.current = goDemo;
  }, [goDemo]);

  // Navigation vers la page de l'étape (en démo, le clic navigue lui-même).
  useEffect(() => {
    const target = demoEntry
      ? demoEntry.action === "click"
        ? undefined
        : demoEntry.route
      : step?.route;
    if (target && pathname !== target) router.push(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, demoIdx]);

  // Recherche de l'élément ciblé (il peut apparaître après un changement de page).
  useEffect(() => {
    if (!step) return;
    const selector =
      demoEntry?.action === "speak" || demoEntry?.action === "navigate"
        ? undefined
        : step.selector;
    const idx = demoIdx;
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const el = findTarget(selector);
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (el) {
        const r = el.getBoundingClientRect();
        setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
        return true;
      }
      setBox(null);
      return false;
    };
    const markReady = () => {
      if (idx !== null) setReadyFor(idx);
    };
    const attempt = () => {
      if (cancelled) return;
      const el = findTarget(selector);
      if (el) {
        el.scrollIntoView({ block: "center", inline: "nearest" });
        timer = setTimeout(() => {
          measure();
          markReady();
        }, 120);
      } else if (selector && tries++ < (idx !== null ? 40 : 15)) {
        // Démo : on attend plus longtemps (changement de page, compilation en dev).
        timer = setTimeout(attempt, 150);
      } else {
        measure();
        // Démo : élément absent de la page → étape suivante, sans bloquer.
        // (Présent mais masqué, par exemple la sidebar sur mobile : bulle centrée.)
        if (
          idx !== null &&
          selector &&
          !document.querySelector(`[data-tour="${selector}"]`)
        ) {
          void goDemoRef.current(idx + 1);
          return;
        }
        markReady();
      }
    };
    attempt();
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pathname]);

  // Voix off de l'étape (ou de l'accueil), hors démo.
  useEffect(() => {
    if (demoIdx !== null) return;
    if (!supported || !voiceOn) {
      stop();
      return;
    }
    if (step) speak(`${step.titre}. ${step.texte}`);
    else if (phase === "welcome") speak("Bienvenue, voulez-vous une visite guidée ?");
  }, [step, phase, voiceOn, supported, speak, stop, demoIdx]);

  // Démo : lecture de l'étape, clic éventuel, puis passage à la suivante.
  useEffect(() => {
    if (demoIdx === null || readyFor !== demoIdx || !step || !demoEntry) return;
    const n = demoIdx;
    const action = demoEntry.action;
    const text = `${step.titre}. ${step.texte}`;
    const next = () => {
      void goDemoRef.current(n + 1);
    };

    if (action === "navigate" || action === "highlight") {
      dwellRef.current = setTimeout(next, action === "navigate" ? 800 : 3000);
    } else if (supported && voiceOn) {
      speak(text, () => {
        dwellRef.current = setTimeout(next, 350);
      });
    } else {
      // Voix coupée ou indisponible : délai proportionnel à la longueur du texte.
      dwellRef.current = setTimeout(next, Math.max(3000, text.length * 45));
    }

    return () => {
      clearDwell();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoIdx, readyFor, voiceOn, supported]);

  // Démo : clic sur un lien de navigation sûr dès le début de l'étape ; la page cible
  // apparaît pendant que l'élément à mettre en surbrillance est recherché.
  useEffect(() => {
    if (demoIdx === null || demoEntry?.action !== "click") return;
    const target = demoEntry.clickTarget ?? demoStep?.selector;
    const route = demoEntry.route;
    const timer = setTimeout(() => {
      const el = isSafeClickTarget(target)
        ? document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
        : null;
      if (el) el.click();
      else router.push(route);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoIdx]);

  // Échap : quitte la visite, ou arrête la démo.
  useEffect(() => {
    if (phase === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (demoIdx !== null) void endDemo();
      else finish(phase === "welcome" ? "later" : "done");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finish, demoIdx, endDemo]);

  // Arrêt de la voix au démontage.
  useEffect(() => stop, [stop]);

  if (phase === "idle" || (!role && demoIdx === null)) return null;

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    writeStorage(VOICE_KEY, next ? "on" : "off");
    if (!next) stop();
  };

  const pauseDemo = () => {
    setDemoPaused(true);
    clearDwell();
    if (voice.speaking) voice.pause();
  };

  const resumeDemo = () => {
    setDemoPaused(false);
    if (voice.paused) {
      voice.resume();
    } else if (demoIdx !== null) {
      const n = demoIdx;
      dwellRef.current = setTimeout(() => void goDemoRef.current(n + 1), 2000);
    }
  };

  if (phase === "welcome") {
    return (
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visite guidée"
          className="w-full max-w-sm rounded-3xl border border-[#E8E2D7] bg-[#FAF7F2] p-6 text-center shadow-2xl"
        >
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#F5ECE5] text-[#B55234]">
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Bienvenue !</h2>
          <p className="mt-1.5 text-sm text-[#6B6661]">
            Voulez-vous une visite guidée ? Elle dure environ une minute.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => finish("later")}
              className="flex-1 rounded-xl border border-[#E8E2D7] bg-white px-4 py-2.5 text-sm font-semibold text-[#4A4643] hover:bg-[#F5F1E8]"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={() => {
                if (storageKey) writeStorage(storageKey, "accepted");
                setIndex(0);
                setPhase("running");
              }}
              className="flex-1 rounded-xl bg-[#B55234] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9C4429]"
            >
              Oui
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!step) return null;

  const inDemo = demoIdx !== null;
  const last = !inDemo && index === steps.length - 1;
  const demoCount = demoEntry ? demoRange(demoEntry.role) : null;
  const current = inDemo && demoCount ? demoIdx - demoCount.start + 1 : index + 1;
  const total = inDemo && demoCount ? demoCount.count : steps.length;
  const mobile = viewport.w < 640;
  const bubbleW = Math.min(360, viewport.w - 24);
  const mobileBottom = inDemo ? 76 : 12;

  // Élément très haut (page entière) : la bulle se place en bas de l'écran.
  const bigBox = !!box && box.height > viewport.h * 0.5;

  let bubbleStyle: React.CSSProperties;
  if (mobile) {
    bubbleStyle = { left: 12, right: 12, bottom: mobileBottom };
  } else if (inDemo) {
    // Démo : petite légende dans le coin, pour ne pas couvrir l'interface.
    bubbleStyle = { right: 16, bottom: 68, width: Math.min(300, viewport.w - 32) };
  } else if (!box) {
    bubbleStyle = { top: "50%", left: "50%", width: bubbleW, transform: "translate(-50%, -50%)" };
  } else if (bigBox) {
    bubbleStyle = { bottom: mobileBottom, left: "50%", width: bubbleW, transform: "translateX(-50%)" };
  } else {
    const below = box.top + box.height + PAD + 200 < viewport.h;
    const left = Math.max(12, Math.min(box.left, viewport.w - bubbleW - 12));
    bubbleStyle = below
      ? { top: box.top + box.height + PAD + 10, left, width: bubbleW }
      : { bottom: viewport.h - box.top + PAD + 10, left, width: bubbleW };
  }

  const barBtn =
    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <div className="fixed inset-0 z-[1100]" role="dialog" aria-modal="true" aria-label="Visite guidée">
      {/* Bloque les clics sur la page pendant la visite */}
      <div className="absolute inset-0" />
      {box ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-[#B55234] transition-all duration-200"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            // Démo : l'interface reste bien visible, seule la bulle est discrète.
            boxShadow: `0 0 0 9999px rgba(0,0,0,${inDemo ? 0.14 : 0.4})`,
          }}
        />
      ) : (
        <div
          className={`pointer-events-none absolute inset-0 ${inDemo ? "bg-black/10" : "bg-black/40"}`}
        />
      )}

      <div
        className={
          inDemo
            ? "absolute rounded-xl border border-[#E8E2D7]/80 bg-[#FAF7F2]/90 p-3 shadow-lg backdrop-blur-sm"
            : "absolute rounded-2xl border border-[#E8E2D7] bg-[#FAF7F2] p-4 shadow-2xl"
        }
        style={bubbleStyle}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#B55234]">
            {inDemo && demoEntry ? `${ROLE_LABEL[demoEntry.role]} · ` : ""}
            Étape {current} / {total}
          </span>
          {!inDemo ? (
            <button
              type="button"
              onClick={() => finish("done")}
              className="text-xs font-semibold text-[#7A746B] hover:text-[#1A1A1A]"
            >
              Passer
            </button>
          ) : null}
        </div>
        <h3 className={`${inDemo ? "text-[13px]" : "text-[15px]"} font-bold text-[#1A1A1A]`}>
          {step.titre}
        </h3>
        <p
          className={`mt-1 ${inDemo ? "text-[12px] leading-snug" : "text-[13px] leading-relaxed"} text-[#4A4643]`}
        >
          {step.texte}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {supported ? (
            <>
              <button
                type="button"
                onClick={toggleVoice}
                aria-pressed={voiceOn}
                className="flex items-center gap-1.5 rounded-full border border-[#E8E2D7] bg-white px-2.5 py-1 text-xs font-semibold text-[#4A4643] hover:bg-[#F5F1E8]"
              >
                {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                Voix {voiceOn ? "on" : "off"}
              </button>
              {voiceOn && !inDemo ? (
                <button
                  type="button"
                  onClick={() => speak(`${step.titre}. ${step.texte}`)}
                  className="flex items-center gap-1.5 rounded-full border border-[#E8E2D7] bg-white px-2.5 py-1 text-xs font-semibold text-[#4A4643] hover:bg-[#F5F1E8]"
                  aria-label="Réécouter l'étape"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réécouter
                </button>
              ) : null}
            </>
          ) : (
            <span className="text-[11px] text-[#7A746B]">Voix indisponible sur ce navigateur.</span>
          )}
        </div>

        {!inDemo ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            {role === "manager" ? (
              <button
                type="button"
                onClick={() => {
                  finish("done");
                  router.push("/mainpage/restaurants/ai");
                }}
                className="text-xs font-semibold text-[#B55234] hover:underline"
              >
                Poser une question
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="rounded-xl border border-[#E8E2D7] bg-white px-3 py-1.5 text-xs font-semibold text-[#4A4643] hover:bg-[#F5F1E8] disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                type="button"
                onClick={() => (last ? finish("done") : setIndex((i) => i + 1))}
                className="rounded-xl bg-[#B55234] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#9C4429]"
              >
                {last ? "Terminer" : "Suivant"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Barre de contrôle de la démo automatique */}
      {inDemo ? (
        <div
          className="fixed bottom-3 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#1A1A1A] px-2 py-1.5 text-white shadow-2xl"
          role="toolbar"
          aria-label="Contrôles de la démo automatique"
        >
          <span className="hidden px-2 text-[11px] font-semibold uppercase tracking-wide text-white/70 sm:inline">
            Démo
          </span>
          {demoPaused ? (
            <button type="button" onClick={resumeDemo} className={barBtn}>
              <Play className="h-3.5 w-3.5" />
              Reprendre
            </button>
          ) : (
            <button type="button" onClick={pauseDemo} className={barBtn}>
              <Pause className="h-3.5 w-3.5" />
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={() => void goDemoRef.current((demoIdx ?? 0) + 1)}
            className={barBtn}
          >
            <SkipForward className="h-3.5 w-3.5" />
            Passer
          </button>
          <button type="button" onClick={() => void endDemo()} className={`${barBtn} text-[#FFB4A2]`}>
            <Square className="h-3.5 w-3.5" />
            Arrêter
          </button>
        </div>
      ) : null}
    </div>
  );
}
