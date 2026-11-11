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
export const maxDuration = 60;

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
    let canWriteModels = false;
    try {
      await fs.mkdir(modelsDir, { recursive: true });
      canWriteModels = true;
    } catch {
      canWriteModels = false;
    }
    const destinationPath = canWriteModels ? path.join(modelsDir, outputFilename) : undefined;

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

    // Sauvegarde permanente de la photo dans /uploads/dishes (ou Data URI si read-only)
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

    // ----------------------------------------------------
    // Étape 2 : Appel à l'IA Trellis pour générer le maillage 3D
    // ----------------------------------------------------
    console.log("[Route: generate-3d] [2/3] Calling generateWithTrellis()...");
    try {
      let glbBuffer = await generateWithTrellis(imageBlob, destinationPath);
      if (glbBuffer && glbBuffer.length > 0) {
        console.log(`[Route: generate-3d] generateWithTrellis() succeeded! GLB size: ${glbBuffer.length} bytes`);

        // Post-traitement des normales en mémoire pour l'éclairage 3D
        try {
          const patched = await ensureGlbNormals(glbBuffer);
          if (patched && Buffer.isBuffer(patched)) {
            glbBuffer = patched;
          }
        } catch (normErr) {
          console.warn("[Route: generate-3d] Warning during normals injection:", normErr);
        }

        // Tente de sauvegarder sur disque si possible, sinon Data URI Base64
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

    // ----------------------------------------------------
    // Étape 3 : Système de repli (Fallback) si l'IA distante échoue
    // ----------------------------------------------------
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
