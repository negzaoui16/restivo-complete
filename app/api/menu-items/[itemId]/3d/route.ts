/**
 * ============================================================================
 * ROUTE API : STREAMING ET DIFFUSION DU MODÈLE 3D BINAIRE (.GLB)
 * ============================================================================
 * Fichier : app/api/menu-items/[itemId]/3d/route.ts
 *
 * RÔLE CLÉ :
 * Résout définitivement la limite des navigateurs mobiles face aux données Base64.
 * Au lieu d'injecter 2.16 Mo de texte Base64 dans le DOM HTML, cette route lit
 * le modèle dans MongoDB Atlas et le diffuse sous forme de flux binaire direct
 * avec le type MIME officiel "model/gltf-binary" et mise en cache permanente.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

// Exécution dynamique obligatoire pour récupérer le plat à jour dans MongoDB
export const dynamic = "force-dynamic";

// Typage du paramètre dynamique asynchrone itemId
type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    // 1. Extraction asynchrone de l'identifiant du plat (itemId)
    const { itemId } = await context.params;
    if (!itemId) {
      return new Response("Missing itemId", { status: 400 });
    }

    // 2. Recherche du plat dans la base MongoDB Atlas via notre adaptateur Prisma/Mongoose
    const item = await db.orm.public.MenuItem.where({ id: itemId }).first();
    if (!item) {
      return new Response("Item not found", { status: 404 });
    }

    // 3. Vérification de la présence d'un modèle 3D associé au plat
    const raw3d = (item as any).model3dUrl as string | undefined | null;
    if (!raw3d || !raw3d.trim()) {
      return new Response("No 3D model for this item", { status: 404 });
    }

    // 4. Cas 1 : Modèle stocké sous forme de Data URI Base64 dans MongoDB (généré par Trellis sur Vercel)
    if (raw3d.startsWith("data:")) {
      // Découpe le préfixe "data:model/gltf-binary;base64," pour ne garder que la charge utile
      const base64Data = raw3d.replace(/^data:[^;]+;base64,/, "");
      // Convertit la chaîne Base64 en véritable Buffer binaire Node.js
      const buffer = Buffer.from(base64Data, "base64");

      // Renvoie le flux binaire brut avec les en-têtes HTTP de performance et de sécurité
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "model/gltf-binary", // Type MIME officiel pour les fichiers GLB
          "Content-Length": buffer.length.toString(), // Taille exacte en octets
          "Cache-Control": "public, max-age=31536000, immutable", // Cache CDN et navigateur 1 an (immuable)
          "Access-Control-Allow-Origin": "*", // Autorise model-viewer et le WebGL cross-origin
        },
      });
    }

    // 5. Cas 2 : Modèle stocké comme chemin relatif local (ex: /models/burger.glb ou /models/fries.glb)
    if (raw3d.startsWith("/models/")) {
      const filename = path.basename(raw3d);
      const filePath = path.join(process.cwd(), "public", "models", filename);
      try {
        // Lecture directe du fichier binaire sur le disque public
        const fileBuf = await fs.readFile(filePath);
        return new Response(fileBuf, {
          status: 200,
          headers: {
            "Content-Type": "model/gltf-binary",
            "Content-Length": fileBuf.length.toString(),
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch {
        // En cas d'erreur de lecture disque, redirection vers l'URL publique statique
        return NextResponse.redirect(new URL(raw3d, request.url));
      }
    }

    // 6. Cas 3 : URL externe absolue complète (hébergée sur un CDN tiers ou un bucket S3)
    if (raw3d.startsWith("http://") || raw3d.startsWith("https://")) {
      return NextResponse.redirect(raw3d);
    }

    // Format d'URL non reconnu
    return new Response("Unsupported model URL format", { status: 400 });
  } catch (err: any) {
    // Journalisation et capture des erreurs serveur
    console.error("[API 3D Model] Error serving model:", err);
    return new Response(err?.message || "Internal server error", { status: 500 });
  }
}
