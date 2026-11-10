/**
 * ============================================================================
 * MODULE : Trellis AI 3D Generator avec Rotation Automatique de Tokens
 * ============================================================================
 * Rôle :
 * Appelle le modèle Deep Learning Trellis sur Hugging Face Space pour
 * convertir une photo de plat 2D en modèle 3D .GLB texturé.
 *
 * Fonctionnalité Token Pool Rotation :
 * Si le token actuel dépasse son quota journalier (rate limit 429 ou 24h),
 * le système bascule automatiquement sur le token suivant dans la liste
 * (hf_...1 -> hf_...2 -> hf_...3 -> hf_...4) sans aucune interruption.
 * ============================================================================
 */

import { promises as fs } from "fs";
import crypto from "crypto";

const BASE = "https://trellis-community-trellis.hf.space/gradio_api";

/**
 * Récupère tous les tokens Hugging Face configurés dans .env (séparés par des virgules)
 */
function getHfTokenPool(): string[] {
  const multi = process.env.HUGGINGFACE_TOKENS || "";
  const single = process.env.HUGGINGFACE_TOKEN || "";
  const tokens = [
    ...multi.split(",").map((t) => t.trim()).filter(Boolean),
    ...single.split(",").map((t) => t.trim()).filter(Boolean),
  ];
  return Array.from(new Set(tokens));
}

/**
 * Exécute le pipeline complet Trellis avec un token spécifique
 */
async function executeTrellisPipeline(
  imageBlob: Blob,
  destinationPath: string,
  token: string
): Promise<boolean> {
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const sessionHash = crypto.randomBytes(6).toString("hex");

  const queueCall = async (fnIndex: number, data: any[]) => {
    const joinRes = await fetch(`${BASE}/queue/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ data, fn_index: fnIndex, session_hash: sessionHash }),
    });

    if (!joinRes.ok) {
      throw new Error(`HTTP ${joinRes.status} on queue/join: ${joinRes.statusText}`);
    }

    const joinData = await joinRes.json();
    if (!joinData.event_id) {
      throw new Error(`join fn ${fnIndex} failed: ${JSON.stringify(joinData)}`);
    }

    const streamRes = await fetch(
      `${BASE}/queue/data?session_hash=${sessionHash}`,
      { headers: authHeaders }
    );

    if (!streamRes.ok) {
      throw new Error(`HTTP ${streamRes.status} on queue/data: ${streamRes.statusText}`);
    }

    const text = await streamRes.text();

    for (const block of text.split("\n\n")) {
      const line = block.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      try {
        const msg = JSON.parse(line.substring(6));
        if (msg.event_id && msg.event_id !== joinData.event_id) continue;
        if (msg.msg === "process_completed") {
          if (!msg.success) {
            throw new Error(
              `fn ${fnIndex} error: ${JSON.stringify(msg.output).slice(0, 500)}`
            );
          }
          return msg.output.data as any[];
        }
      } catch (e: any) {
        if (e?.message?.startsWith("fn ") || e?.message?.startsWith("HTTP ")) throw e;
      }
    }
    throw new Error(`fn ${fnIndex} no completion: ${text.slice(-500)}`);
  };

  // 1. Upload de l'image vers le Space Hugging Face
  console.log("[TRELLIS] 1/4 Uploading input image to Hugging Face Space...");
  const upForm = new FormData();
  upForm.append("files", imageBlob, "input.png");
  const upRes = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: authHeaders,
    body: upForm,
  });

  if (!upRes.ok) {
    throw new Error(`HTTP ${upRes.status} on /upload: ${upRes.statusText}`);
  }

  const uploaded = (await upRes.json()) as string[];
  if (!uploaded || !uploaded[0]) {
    throw new Error("Failed to upload image to TRELLIS space.");
  }

  const fileData = (p: string) => ({
    path: p,
    meta: { _type: "gradio.FileData" },
  });

  // 2. Initialisation de la session
  console.log("[TRELLIS] 2/4 Starting session (fn 4)...");
  await queueCall(4, []);

  // 3. Pré-traitement de l'image (détourage / fond transparent)
  console.log("[TRELLIS] 3/4 Preprocessing image (fn 8)...");
  const pre = await queueCall(8, [fileData(uploaded[0])]);
  const processed = pre[0];

  // 4. Génération 3D et extraction du fichier GLB
  console.log("[TRELLIS] 4/4 Generating 3D model & extracting GLB (fn 11)...");
  const result = await queueCall(11, [
    processed,
    [],
    false,
    0,
    7.5,
    12,
    3,
    12,
    "stochastic",
    0.95,
    1024,
  ]);

  // Recherche de l'URL du fichier .glb généré
  let fileUrl: string | undefined;
  for (const item of result) {
    const u =
      typeof item === "string" ? item : (item as any)?.url || (item as any)?.path;
    if (typeof u === "string" && u.toLowerCase().includes(".glb")) {
      fileUrl = (item as any)?.url || u;
      if (!fileUrl!.startsWith("http")) fileUrl = `${BASE}/file=${fileUrl}`;
      break;
    }
  }

  console.log("[TRELLIS] Retrieved GLB URL:", fileUrl);
  if (!fileUrl) {
    throw new Error("TRELLIS generation completed but no .glb file URL found.");
  }

  // 5. Téléchargement du GLB et sauvegarde sur disque local
  console.log("[TRELLIS] Downloading GLB to local public/models...");
  const fileRes = await fetch(fileUrl, { headers: authHeaders });
  if (!fileRes.ok) {
    throw new Error(`Failed to download GLB file (HTTP ${fileRes.status})`);
  }
  const arrayBuf = await fileRes.arrayBuffer();
  await fs.writeFile(destinationPath, Buffer.from(arrayBuf));
  console.log("[TRELLIS] Saved GLB successfully to:", destinationPath);

  return true;
}

/**
 * Fonction principale : Tente la génération avec rotation automatique des tokens en cas d'erreur
 */
export async function generateWithTrellis(
  imageBlob: Blob,
  destinationPath: string
): Promise<boolean> {
  const tokenPool = getHfTokenPool();
  const tokensToTry = tokenPool.length > 0 ? tokenPool : [""];

  let lastError: any = null;

  for (let i = 0; i < tokensToTry.length; i++) {
    const currentToken = tokensToTry[i];
    const maskedToken = currentToken
      ? `${currentToken.slice(0, 7)}...${currentToken.slice(-4)}`
      : "anonyme";

    console.log(
      `[TRELLIS] Tentative [${i + 1}/${tokensToTry.length}] avec le token Hugging Face : ${maskedToken}`
    );

    try {
      const ok = await executeTrellisPipeline(imageBlob, destinationPath, currentToken);
      if (ok) {
        console.log(`[TRELLIS] ✅ Génération réussie avec le token [${i + 1}/${tokensToTry.length}] !`);
        return true;
      }
    } catch (err: any) {
      console.warn(
        `[TRELLIS] ⚠️ Échec du token [${i + 1}/${tokensToTry.length}] (${maskedToken}): ${err?.message || err}. Bascule sur le token suivant...`
      );
      lastError = err;
    }
  }

  throw new Error(
    `Tous les tokens Hugging Face (${tokensToTry.length}) ont échoué : ${lastError?.message || lastError}`
  );
}
