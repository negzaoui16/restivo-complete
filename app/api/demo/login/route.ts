/**
 * POST /api/demo/login?role=client|manager|staff
 *
 * Connecte l'un des trois comptes démo créés par `npm run seed:demo`, sans mot
 * de passe (ces comptes n'ont aucun mot de passe connu : le seed en génère un
 * aléatoire et ne l'affiche jamais). Même réponse que /api/auth/signin.
 *
 * ⚠️ SÉCURITÉ — cette route est une porte d'entrée sans authentification :
 *  - elle répond 404 tant que DEMO_MODE n'est pas exactement "true" ;
 *  - elle répond 404 aussi en production (NODE_ENV=production) sauf si
 *    DEMO_ALLOW_PROD="true" ;
 *  - seuls les emails de DEMO_EMAILS sont acceptés, jamais un email fourni
 *    par le client.
 * N'activez DEMO_MODE que sur une base qui ne contient pas de vraies données.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toErrorResponse } from "@/lib/auth/errors";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { jsonWithRefreshCookie } from "@/lib/auth/cookies";
import { toAuthUser } from "@/lib/auth/public-user";
import { isDemoEnabled } from "@/lib/auth/demo";
import { DEMO_EMAILS } from "@/lib/tour/demoScript";
import type { TourRole } from "@/lib/tour/steps";

export const dynamic = "force-dynamic";

function notFound(): Response {
  return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Not found." }, { status: 404 });
}

export async function POST(request: Request): Promise<Response> {
  if (!isDemoEnabled()) return notFound();

  try {
    const role = new URL(request.url).searchParams.get("role");
    if (role !== "client" && role !== "manager" && role !== "staff") {
      return NextResponse.json(
        { ok: false, code: "VALIDATION_ERROR", message: "Unknown demo role." },
        { status: 400 }
      );
    }

    const email = DEMO_EMAILS[role as TourRole];
    const user = await db.orm.public.User.where({ email }).first();
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, code: "DEMO_NOT_SEEDED", message: "Run `npm run seed:demo` first." },
        { status: 404 }
      );
    }

    const profile = await db.orm.public.Profile.where({ userId: user.id }).first();
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(user.id, user.email),
      signRefreshToken(user.id),
    ]);

    return jsonWithRefreshCookie(
      { ok: true, accessToken, user: await toAuthUser(user, profile) },
      refreshToken
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
