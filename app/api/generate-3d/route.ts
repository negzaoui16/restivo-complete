/**
 * ============================================================================
 * ROUTE API : GÉNÉRATION DE MODÈLES 3D PAR IA (/api/generate-3d)
 * ============================================================================
 * Fichier : app/api/generate-3d/route.ts
 *
 * RÔLE CLÉ :
 * Reçoit une photo 2D de plat envoyée depuis le panneau 'AddMenuItemPanel',
 * orchestre l'appel au modèle de Deep Learning Trellis AI, injecte des normales
 * géométriques Three.js pour un éclairage réaliste, et gère automatiquement
 * l'environnement Serverless en lecture seule de Vercel.
 * ============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { extractImageBlob } from "./image-parser";
import { generateWithTrellis } from "./trellis";
import { applyFallbackModel } from "./fallback";
import { ensureGlbNormals } from "./normals";

// Forcer le rendu dynamique pour traiter chaque nouvelle photo individuellement
export const dynamic = "force-dynamic";

// Configuration du timeout maximum de Vercel à 60 secondes pour laisser le temps à l'IA
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    console.log("==================================================");
    console.log("[Route: generate-3d] Received new 3D generation request");

    // 1. Extraction des données multipart/form-data envoyées par le client
    const formData = await req.formData();
    const image = formData.get("image"); // Fichier photo uploadé
    const imageUrl = formData.get("imageUrl") as string | null; // Ou URL d'image web alternative

    // 2. Validation d'entrée : s'assure qu'une photo ou une URL est présente
    if (!image && !imageUrl) {
      console.warn("[Route: generate-3d] Validation failed: No image or imageUrl provided.");
      return NextResponse.json(
        { ok: false, error: "Veuillez fournir un fichier image ou une URL." },
        { status: 400 }
      );
    }

    // 3. Extraction du nom et de la catégorie du plat (utiles pour cibler le modèle de fallback)
    const name = ((formData.get("name") as string | null) || "").toLowerCase();
    const category = ((formData.get("category") as string | null) || "").toLowerCase();

    // 4. Génération d'un UUID unique pour nommer le fichier 3D
    const uniqueId = crypto.randomUUID();
    const outputFilename = `item-3d-${uniqueId}.glb`;
    const modelsDir = path.join(process.cwd(), "public", "models");
    
    // 5. Test d'écriture disque pour détecter si nous sommes en local (Node) ou sur Vercel (Serverless read-only)
    let canWriteModels = false;
    try {
      await fs.mkdir(modelsDir, { recursive: true });
      canWriteModels = true;
    } catch {
      canWriteModels = false; // Environnement Vercel : disque en lecture seule
    }
    const destinationPath = canWriteModels ? path.join(modelsDir, outputFilename) : undefined;

    // ------------------------------------------------------------------------
    // ÉTAPE 1 : Normalisation de la photo 2D en Blob binaire & sauvegarde
    // ------------------------------------------------------------------------
    console.log("[Route: generate-3d] [1/3] Calling extractImageBlob()...");
    const imageBlob = await extractImageBlob(image, imageUrl);

    if (!imageBlob) {
      console.error("[Route: generate-3d] extractImageBlob() returned null.");
      return NextResponse.json(
        { ok: false, error: "Impossible de lire les données de l'image." },
        { status: 400 }
      );
    }
    console.log(`[Route: generate-3d] extractImageBlob() succeeded! Blob size: ${imageBlob.size} bytes`);

    // Sauvegarde de l'image 2D sur disque en local ou en Data URI Base64 sur Vercel
    let savedImageUrl: string | null = null;
    if (image && typeof image === "object" && "arrayBuffer" in image) {
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "dishes");
        await fs.mkdir(uploadDir, { recursive: true });
        const imgFilename = `dish-${uniqueId}.jpg`;
        const imgPath = path.join(uploadDir, imgFilename);
        const buf = Buffer.from(await (image as Blob).arrayBuffer());
        await fs.writeFile(imgPath, buf);
        savedImageUrl = `/uploads/dishes/${imgFilename}`;
        console.log(`[Route: generate-3d] Saved 2D photo permanently to: ${savedImageUrl}`);
      } catch (e) {
        try {
          const mimeType = (image as Blob).type || "image/jpeg";
          const buf = Buffer.from(await (image as Blob).arrayBuffer());
          savedImageUrl = `data:${mimeType};base64,${buf.toString("base64")}`;
          console.log("[Route: generate-3d] Disk write failed. Stored 2D photo as Base64 data URI.");
        } catch {
          console.error("[Route: generate-3d] Failed to convert photo to Base64:", e);
        }
      }
    }

    let model3dUrl: string | null = null;

    // ------------------------------------------------------------------------
    // ÉTAPE 2 : Appel à l'intelligence artificielle Trellis (HuggingFace / Gradio)
    // ------------------------------------------------------------------------
    console.log("[Route: generate-3d] [2/3] Calling generateWithTrellis()...");
    try {
      let glbBuffer = await generateWithTrellis(imageBlob, destinationPath);
      if (glbBuffer && glbBuffer.length > 0) {
        console.log(`[Route: generate-3d] generateWithTrellis() succeeded! GLB size: ${glbBuffer.length} bytes`);

        // Post-traitement géométrique : injection des normales Three.js pour un éclairage 3D lissé
        try {
          const patched = await ensureGlbNormals(glbBuffer);
          if (patched && Buffer.isBuffer(patched)) {
            glbBuffer = patched;
          }
        } catch (normErr) {
          console.warn("[Route: generate-3d] Warning during normals injection:", normErr);
        }

        // Sauvegarde sur disque si possible (local), sinon encodage Data URI pour persistance MongoDB
        if (canWriteModels && destinationPath) {
          try {
            await fs.writeFile(destinationPath, glbBuffer);
            model3dUrl = `/models/${outputFilename}`;
            console.log(`[Route: generate-3d] Model written to disk: ${model3dUrl}`);
          } catch {
            model3dUrl = `data:model/gltf-binary;base64,${glbBuffer.toString("base64")}`;
            console.log("[Route: generate-3d] Disk write failed. Using Data URI for 3D model.");
          }
        } else {
          model3dUrl = `data:model/gltf-binary;base64,${glbBuffer.toString("base64")}`;
          console.log("[Route: generate-3d] Read-only environment. Serving 3D model as Data URI.");
        }
      }
    } catch (trellisError: any) {
      console.warn(
        `[Route: generate-3d] generateWithTrellis() failed: ${trellisError?.message || trellisError}`
      );
    }

    // ------------------------------------------------------------------------
    // ÉTAPE 3 : Système de repli intelligent (Fallback) en cas de panne de l'IA
    // ------------------------------------------------------------------------
    if (!model3dUrl) {
      console.log("[Route: generate-3d] [3/3] Calling applyFallbackModel()...");
      const fallbackResult = await applyFallbackModel({
        name,
        category,
        modelsDir: canWriteModels ? modelsDir : undefined,
        destinationPath,
      });
      model3dUrl = fallbackResult.publicUrl;
      console.log(`[Route: generate-3d] applyFallbackModel() finished using: ${fallbackResult.modelFile} -> ${model3dUrl}`);
    }

    console.log(`[Route: generate-3d] Request completed successfully. Final URL prefix: ${model3dUrl.slice(0, 50)}...`);
    console.log("==================================================");

    // ------------------------------------------------------------------------
    // ÉTAPE 4 : Renvoie de la réponse JSON avec l'URL ou Data URI du modèle 3D
    // ------------------------------------------------------------------------
    return NextResponse.json({
      ok: true,
      model3dUrl,
      savedImageUrl: savedImageUrl || imageUrl || undefined,
      message: "Modèle 3D généré avec succès !",
    });
  } catch (error: any) {
    console.error("[Route: generate-3d] Fatal error during POST:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Échec de génération du modèle 3D." },
      { status: 500 }
    );
  }
}
