/**
 * ============================================================================
 * ROUTE API : ANALYTICS & FINANCES DU RESTAURANT
 * ============================================================================
 * Fichier : app/api/restaurants/[restaurantId]/analytics/route.ts
 *
 * RÔLE CLÉ :
 * Point d'entrée HTTP (GET) appelé par le tableau de bord décisionnel.
 * Reçoit l'identifiant du restaurant, appelle le service analytique qui
 * interroge MongoDB Atlas en direct, et renvoie l'ensemble des KPIs,
 * graphiques financiers et prévisions Machine Learning.
 * ============================================================================
 */

import { getRealRestaurantAnalytics } from "@/lib/analytics/service";

// Empêche le cache statique de Next.js : les statistiques doivent refléter les commandes en temps réel
export const dynamic = "force-dynamic";

// Typage des paramètres d'URL asynchrones de Next.js 15+
type RouteContext = { params: Promise<{ restaurantId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    // 1. Récupération asynchrone du paramètre dynamique restaurantId depuis l'URL
    const { restaurantId } = await context.params;

    // 2. Validation : vérifie que l'identifiant du restaurant est bien fourni
    if (!restaurantId) {
      return Response.json(
        { ok: false, error: "Restaurant ID required" },
        { status: 400 }
      );
    }

    // 3. Appel du moteur analytique (interroge MongoDB Atlas : orders, orderitems, marges, prédictions ML)
    const data = await getRealRestaurantAnalytics(restaurantId);

    // 4. Renvoie le rapport consolidé en JSON avec un statut de succès 200 OK
    return Response.json({ ok: true, data });
  } catch (err: any) {
    // En cas d'erreur serveur, journalise l'anomalie et renvoie une réponse d'erreur 500
    console.error("Error in /api/restaurants/[restaurantId]/analytics:", err);
    return Response.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
