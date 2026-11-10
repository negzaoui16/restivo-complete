/**
 * ============================================================================
 * API ROUTE : Génération de Modèles 3D par IA (/api/generate-3d)
 * ============================================================================
 * Rôle : Transforme une photo 2D d'un plat (pizza, burger, salade, etc.)
 *        en un modèle 3D interactif au format standard .GLB.
 *
 * Pipeline en 4 étapes :
 * 1. Extraction et normalisation de l'image (fichier binaire ou URL).
 * 2. Appel au modèle de Deep Learning TRELLIS (HuggingFace / Gradio).
 * 3. Fallback intelligent si l'API IA est indisponible (modèle de repli réaliste).
 * 4. Recalcul des normales géométriques pour un éclairage photoréaliste.
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

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log("==================================================");
    console.log("[Route: generate-3d] Received new 3D generation request");

    // 1. Récupération des données du formulaire envoyé par AddMenuItemPanel
    const formData = await req.formData();
    const image = formData.get("image");
    const imageUrl = formData.get("imageUrl") as string | null;

    // Validation : Vérifie qu'au moins une photo ou une URL d'image est fournie
    if (!image && !imageUrl) {
      console.warn("[Route: generate-3d] Validation failed: No image or imageUrl provided.");
      return NextResponse.json(
        { ok: false, error: "Veuillez fournir un fichier image ou une URL." },
        { status: 400 }
      );
    }

    // Métadonnées du plat (utilisées pour le fallback si besoin)
    const name = ((formData.get("name") as string | null) || "").toLowerCase();
    const category = ((formData.get("category") as string | null) || "").toLowerCase();

    // Génération d'un nom de fichier unique pour le modèle 3D
    const uniqueId = crypto.randomUUID();
    const outputFilename = `item-3d-${uniqueId}.glb`;
    const modelsDir = path.join(process.cwd(), "public", "models");
    await fs.mkdir(modelsDir, { recursive: true });
    const destinationPath = path.join(modelsDir, outputFilename);

    // ----------------------------------------------------
    // Étape 1 : Conversion de l'image en Blob binaire & sauvegarde permanente
    // ----------------------------------------------------
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

    // Sauvegarde automatique permanente de la photo dans /uploads/dishes
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
        console.error("[Route: generate-3d] Failed to save 2D photo:", e);
      }
    }

    let generated = false;

    // ----------------------------------------------------
    // Étape 2 : Appel à l'IA Trellis pour générer le maillage 3D
    // ----------------------------------------------------
    console.log("[Route: generate-3d] [2/3] Calling generateWithTrellis()...");
    try {
      generated = await generateWithTrellis(imageBlob, destinationPath);
      console.log("[Route: generate-3d] generateWithTrellis() succeeded! Model written to disk.");
    } catch (trellisError: any) {
      console.warn(
        `[Route: generate-3d] generateWithTrellis() failed: ${trellisError?.message || trellisError}`
      );
    }

    // ----------------------------------------------------
    // Étape 3 : Système de repli (Fallback) si l'IA distante échoue
    // ----------------------------------------------------
    if (!generated) {
      console.log("[Route: generate-3d] [3/3] Calling applyFallbackModel()...");
      const fallbackResult = await applyFallbackModel({
        name,
        category,
        modelsDir,
        destinationPath,
      });
      console.log(`[Route: generate-3d] applyFallbackModel() finished using: ${fallbackResult}`);
      generated = true;
    }

    // ----------------------------------------------------
    // Étape 4 : Post-traitement des normales pour l'éclairage 3D
    // ----------------------------------------------------
    if (generated) {
      await ensureGlbNormals(destinationPath);
    }

    // URL publique relative que le frontend peut charger (/models/item-3d-....glb)
    const publicUrl = `/models/${outputFilename}`;
    console.log(`[Route: generate-3d] Request completed successfully. Public URL: ${publicUrl}`);
    console.log("==================================================");

    return NextResponse.json({
      ok: true,
      model3dUrl: publicUrl,
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
