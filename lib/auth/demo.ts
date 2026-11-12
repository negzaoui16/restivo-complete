/**
 * Garde commune de la connexion démo (route + page d'accueil).
 *
 * ⚠️ DEMO_MODE=true ouvre une connexion SANS mot de passe aux trois comptes
 * démo (voir DEMO_EMAILS). À réserver au développement, à la recette et aux
 * démonstrations. Hors production, DEMO_MODE suffit ; en production il faut en
 * plus DEMO_ALLOW_PROD=true.
 */
export function isDemoEnabled(): boolean {
  if (process.env.DEMO_MODE !== "true") return false;
  if (process.env.NODE_ENV === "production" && process.env.DEMO_ALLOW_PROD !== "true") {
    return false;
  }
  return true;
}
