/**
 * Démo automatique : une séquence par profil (client, gérant, personnel) ;
 * la démo lancée ne parcourt que le profil choisi sur la page d'accueil.
 * Les textes viennent de TOUR_STEPS (via `stepId`) : rien n'est dupliqué ici.
 */
import { DEMO_EXTRA_STEPS, TOUR_STEPS, type TourRole, type TourStep } from "./steps";

/**
 * Actions possibles d'une entrée :
 *  - (aucune)    : va sur `route`, met l'élément en surbrillance et lit le texte.
 *  - "navigate"  : va sur `route` sans parler (courte pause).
 *  - "highlight" : surbrillance seule, sans voix.
 *  - "speak"     : lit le texte, bulle centrée, sans surbrillance.
 *  - "click"     : comme l'action par défaut, après avoir cliqué sur `clickTarget`
 *                  (lien de navigation uniquement, voir isSafeClickTarget).
 *  - "changeRole": connecte le compte démo du rôle avant l'étape.
 */
export type DemoAction = "navigate" | "highlight" | "speak" | "click" | "changeRole";

export interface DemoEntry {
  role: TourRole;
  route: string;
  stepId: string;
  action?: DemoAction;
  /** Pour "click" : élément data-tour à cliquer (par défaut, l'élément mis en surbrillance). */
  clickTarget?: string;
}

/** Étape (texte) d'une entrée : TOUR_STEPS, ou DEMO_EXTRA_STEPS pour les étapes propres à la démo. */
export function demoStepFor(entry: DemoEntry): TourStep | undefined {
  return (
    TOUR_STEPS[entry.role].find((s) => s.id === entry.stepId) ??
    DEMO_EXTRA_STEPS.find((s) => s.id === entry.stepId)
  );
}

export const DEMO_SCRIPT: DemoEntry[] = [
  // ── Client ──
  { role: "client", route: "/mainpage", stepId: "client-bienvenue", action: "changeRole" },
  { role: "client", route: "/mainpage", stepId: "client-recherche" },
  { role: "client", route: "/mainpage/explore", stepId: "client-explorer", action: "click" },
  { role: "client", route: "/mainpage/explore", stepId: "client-3d", action: "speak" },
  { role: "client", route: "/mainpage/reservations", stepId: "client-reservations", action: "click" },
  { role: "client", route: "/mainpage/orders", stepId: "client-commandes", action: "click" },
  { role: "client", route: "/mainpage/orders", stepId: "client-notifications" },
  { role: "client", route: "/mainpage/orders", stepId: "client-hors-ligne", action: "speak" },
  // ── Gérant ──
  // Parcours complet d'un restaurant déjà créé (données de scripts/seed-demo.ts).
  { role: "manager", route: "/mainpage/restaurants", stepId: "manager-demo-intro", action: "speak" },
  { role: "manager", route: "/mainpage/restaurants", stepId: "manager-demo-profile" },
  { role: "manager", route: "/mainpage/restaurants", stepId: "manager-demo-stats" },
  { role: "manager", route: "/mainpage/restaurants", stepId: "manager-demo-ov-reservations" },
  { role: "manager", route: "/mainpage/restaurants", stepId: "manager-demo-ov-orders" },
  { role: "manager", route: "/mainpage/restaurants", stepId: "manager-demo-ov-activity" },
  { role: "manager", route: "/mainpage/restaurants", stepId: "manager-demo-bell" },
  { role: "manager", route: "/mainpage/restaurants", stepId: "manager-demo-sidebar" },
  { role: "manager", route: "/mainpage/restaurants/reservations", stepId: "manager-demo-reservations", action: "click", clickTarget: "manager-nav-reservations" },
  { role: "manager", route: "/mainpage/restaurants/reservations?tab=orders", stepId: "manager-demo-orders" },
  { role: "manager", route: "/mainpage/restaurants/live", stepId: "manager-demo-live", action: "click", clickTarget: "manager-nav-live" },
  { role: "manager", route: "/mainpage/restaurants/menu", stepId: "manager-demo-menu", action: "click", clickTarget: "manager-nav-menu" },
  { role: "manager", route: "/mainpage/restaurants/menu", stepId: "manager-demo-menu-3d" },
  { role: "manager", route: "/mainpage/restaurants/tables", stepId: "manager-demo-tables", action: "click", clickTarget: "manager-nav-tables" },
  { role: "manager", route: "/mainpage/restaurants/tables", stepId: "manager-demo-tables-3d" },
  { role: "manager", route: "/mainpage/restaurants/tables", stepId: "manager-demo-tables-walls" },
  { role: "manager", route: "/mainpage/restaurants/tables", stepId: "manager-demo-tables-ai" },
  { role: "manager", route: "/mainpage/restaurants/staff", stepId: "manager-demo-staff", action: "click", clickTarget: "manager-nav-staff" },
  { role: "manager", route: "/mainpage/restaurants/ai", stepId: "manager-demo-ai", action: "click", clickTarget: "manager-nav-ai" },
  { role: "manager", route: "/mainpage/restaurants/analytics", stepId: "manager-demo-analytics", action: "click", clickTarget: "manager-nav-analytics" },
  { role: "manager", route: "/mainpage/restaurants/analytics", stepId: "manager-demo-analytics-tabs" },
  { role: "manager", route: "/mainpage/restaurants/analytics", stepId: "manager-demo-fin", action: "speak" },
  // ── Personnel ──
  { role: "staff", route: "/mainpage/staff", stepId: "staff-accueil", action: "changeRole" },
  { role: "staff", route: "/mainpage/staff", stepId: "staff-reservations", action: "click" },
  { role: "staff", route: "/mainpage/staff", stepId: "staff-tables", action: "click" },
  { role: "staff", route: "/mainpage/staff", stepId: "staff-commandes", action: "click" },
  { role: "staff", route: "/mainpage/staff", stepId: "staff-menu", action: "click" },
];

/** Première entrée et nombre d'entrées du script pour un profil (une démo par profil). */
export function demoRange(role: TourRole): { start: number; count: number } {
  return {
    start: DEMO_SCRIPT.findIndex((e) => e.role === role),
    count: DEMO_SCRIPT.filter((e) => e.role === role).length,
  };
}

/** Seuls les liens/boutons de navigation de barre latérale peuvent être cliqués. */
export function isSafeClickTarget(selector: string | undefined): selector is string {
  return !!selector && /^(client|manager|staff)-nav-[a-z]+$/.test(selector);
}

/** Emails des comptes démo (créés par scripts/seed-demo.ts, à garder identiques). */
export const DEMO_EMAILS: Record<TourRole, string> = {
  client: "demo-client@restivo.test",
  manager: "demo-gerant@restivo.test",
  staff: "demo-personnel@restivo.test",
};

export function isDemoEmail(email: string | null | undefined): boolean {
  return !!email && Object.values(DEMO_EMAILS).includes(email);
}

/** Drapeau posé par la page d'accueil (valeur = profil choisi) pour que TourGuide lance la démo. */
export const DEMO_FLAG = "restivo_demo_autoplay";
