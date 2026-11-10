/**
 * ============================================================================
 * MODULE : RECALCUL ET INJECTION DES NORMALES BINAIRES GLB (GLTF 2.0 Binary)
 * ============================================================================
 * Fichier : app/api/generate-3d/normals.ts
 *
 * RÔLE CLÉ DANS LE PROJET :
 * Certains modèles 3D générés par l'IA (Deep Learning) manquent de normales
 * de surface (attribut "NORMAL" absent dans les primitives du maillage).
 * Sans normales, le moteur de rendu 3D (WebGL / Three.js / model-viewer)
 * ne sait pas comment faire rebondir la lumière, ce qui crée des faces noires
 * ou un éclairage complètement plat et irréaliste.
 *
 * Ce module réalise un "Binary Patching" de bas niveau directement sur le GLB :
 * 1. Lit les 12 octets de l'en-tête GLB (Magic Number 0x46546c67 = "glTF").
 * 2. Décode le Chunk 0 (JSON du graphe de scène) et le Chunk 1 (données BIN).
 * 3. Détecte si un maillage n'a pas de normales.
 * 4. Calcule le produit vectoriel (Cross Product) de chaque triangle pour trouver
 *    les normales des faces, puis les accumule et les normalise par sommet.
 * 5. Injecte le nouveau buffer binaire, met à jour le JSON, aligne sur 4 octets
 *    et réécrit le fichier GLB final corrigé.
 * ============================================================================
 */

import { promises as fs } from "fs";

export async function ensureGlbNormals(filePath: string): Promise<boolean> {
  try {
    // 1. Lecture du fichier binaire GLB
    const fileBuf = await fs.readFile(filePath);

    // Vérifie le "Magic Number" GLB au début (0x46546c67 équivaut à la chaîne ASCII "glTF")
    const magic = fileBuf.readUInt32LE(0);
    if (magic !== 0x46546c67) return false;

    // 2. Décodage du Chunk 0 (JSON glTF)
    const chunk0Length = fileBuf.readUInt32LE(12);
    const jsonStr = fileBuf.toString("utf8", 20, 20 + chunk0Length);
    const gltf = JSON.parse(jsonStr);

    // 3. Décodage du Chunk 1 (Binaire BIN)
    const binHeaderOffset = 20 + chunk0Length;
    if (binHeaderOffset >= fileBuf.length) return false;

    const binChunkLength = fileBuf.readUInt32LE(binHeaderOffset);
    const binDataOffset = binHeaderOffset + 8;
    let binBuffer = fileBuf.subarray(binDataOffset, binDataOffset + binChunkLength);

    let modified = false;

    // 4. Parcourt tous les maillages (meshes) et primitives
    for (const mesh of gltf.meshes) {
      for (const prim of mesh.primitives) {
        // Si les normales existent déjà, rien à faire
        if (prim.attributes.NORMAL !== undefined) continue;

        // Récupère l'accessor des positions des sommets (X, Y, Z)
        const posAccessorIdx = prim.attributes.POSITION;
        const posAccessor = gltf.accessors[posAccessorIdx];
        const posBufferView = gltf.bufferViews[posAccessor.bufferView];
        const posByteOffset = (posBufferView.byteOffset || 0) + (posAccessor.byteOffset || 0);
        const vertexCount = posAccessor.count;

        // Lecture des coordonnées 3D de chaque sommet
        const positions = new Float32Array(vertexCount * 3);
        for (let i = 0; i < vertexCount * 3; i++) {
          positions[i] = binBuffer.readFloatLE(posByteOffset + i * 4);
        }

        // Récupère les indices des triangles (face 1: v0, v1, v2...)
        const indices: number[] = [];
        if (prim.indices !== undefined) {
          const idxAccessor = gltf.accessors[prim.indices];
          const idxBufferView = gltf.bufferViews[idxAccessor.bufferView];
          const idxByteOffset = (idxBufferView.byteOffset || 0) + (idxAccessor.byteOffset || 0);

          if (idxAccessor.componentType === 5123) {
            // UNSIGNED_SHORT (uint16)
            for (let i = 0; i < idxAccessor.count; i++) {
              indices.push(binBuffer.readUInt16LE(idxByteOffset + i * 2));
            }
          } else if (idxAccessor.componentType === 5125) {
            // UNSIGNED_INT (uint32)
            for (let i = 0; i < idxAccessor.count; i++) {
              indices.push(binBuffer.readUInt32LE(idxByteOffset + i * 4));
            }
          } else if (idxAccessor.componentType === 5121) {
            // UNSIGNED_BYTE (uint8)
            for (let i = 0; i < idxAccessor.count; i++) {
              indices.push(binBuffer.readUInt8(idxByteOffset + i));
            }
          }
        } else {
          for (let i = 0; i < vertexCount; i++) indices.push(i);
        }

        // 5. Calcul mathématique des normales via Produit Vectoriel (Cross Product)
        const normals = new Float32Array(vertexCount * 3);
        for (let i = 0; i < indices.length; i += 3) {
          const i0 = indices[i];
          const i1 = indices[i + 1];
          const i2 = indices[i + 2];

          const p0x = positions[i0 * 3], p0y = positions[i0 * 3 + 1], p0z = positions[i0 * 3 + 2];
          const p1x = positions[i1 * 3], p1y = positions[i1 * 3 + 1], p1z = positions[i1 * 3 + 2];
          const p2x = positions[i2 * 3], p2y = positions[i2 * 3 + 1], p2z = positions[i2 * 3 + 2];

          // Vecteurs des arêtes du triangle : e1 = p1 - p0, e2 = p2 - p0
          const e1x = p1x - p0x, e1y = p1y - p0y, e1z = p1z - p0z;
          const e2x = p2x - p0x, e2y = p2y - p0y, e2z = p2z - p0z;

          // Produit vectoriel : N = e1 x e2
          const nx = e1y * e2z - e1z * e2y;
          const ny = e1z * e2x - e1x * e2z;
          const nz = e1x * e2y - e1y * e2x;

          // Accumule la normale sur chaque sommet du triangle
          normals[i0 * 3] += nx; normals[i0 * 3 + 1] += ny; normals[i0 * 3 + 2] += nz;
          normals[i1 * 3] += nx; normals[i1 * 3 + 1] += ny; normals[i1 * 3 + 2] += nz;
          normals[i2 * 3] += nx; normals[i2 * 3 + 1] += ny; normals[i2 * 3 + 2] += nz;
        }

        let min = [Infinity, Infinity, Infinity];
        let max = [-Infinity, -Infinity, -Infinity];

        // 6. Normalisation unitaire : chaque vecteur doit avoir une longueur égale à 1
        for (let i = 0; i < vertexCount; i++) {
          let nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
          const len = Math.hypot(nx, ny, nz);
          if (len > 1e-6) {
            nx /= len; ny /= len; nz /= len;
          } else {
            nx = 0; ny = 1; nz = 0; // Normale par défaut vers le haut si dégénérée
          }
          normals[i * 3] = nx; normals[i * 3 + 1] = ny; normals[i * 3 + 2] = nz;

          min[0] = Math.min(min[0], nx); min[1] = Math.min(min[1], ny); min[2] = Math.min(min[2], nz);
          max[0] = Math.max(max[0], nx); max[1] = Math.max(max[1], ny); max[2] = Math.max(max[2], nz);
        }

        // 7. Écriture binaire des normales calculées (12 octets par sommet : 3 x Float32)
        const normalBytes = Buffer.alloc(vertexCount * 12);
        for (let i = 0; i < vertexCount * 3; i++) {
          normalBytes.writeFloatLE(normals[i], i * 4);
        }

        // Ajoute les données au buffer BIN
        const normalByteOffset = binBuffer.length;
        binBuffer = Buffer.concat([binBuffer, normalBytes]);

        // Crée un nouveau BufferView dans le JSON glTF
        const newBufferViewIdx = gltf.bufferViews.length;
        gltf.bufferViews.push({
          buffer: 0,
          byteOffset: normalByteOffset,
          byteLength: normalBytes.length,
        });

        // Crée un nouvel Accessor dans le JSON glTF
        const newAccessorIdx = gltf.accessors.length;
        gltf.accessors.push({
          bufferView: newBufferViewIdx,
          byteOffset: 0,
          componentType: 5126, // FLOAT (32-bit)
          count: vertexCount,
          type: "VEC3",
          max,
          min,
        });

        // Lie l'attribut NORMAL de la primitive à ce nouvel accessor
        prim.attributes.NORMAL = newAccessorIdx;
        gltf.buffers[0].byteLength = binBuffer.length;
        modified = true;
      }
    }

    if (!modified) return false;

    // 8. Réassemblage du fichier GLB binaire complet avec padding aligné sur 4 octets
    let newJsonStr = JSON.stringify(gltf);
    while (newJsonStr.length % 4 !== 0) newJsonStr += " "; // Padding espace pour JSON

    const newJsonBuf = Buffer.from(newJsonStr, "utf8");

    let padBin = 0;
    if (binBuffer.length % 4 !== 0) padBin = 4 - (binBuffer.length % 4);
    const finalBin = padBin > 0 ? Buffer.concat([binBuffer, Buffer.alloc(padBin)]) : binBuffer;

    const totalLength = 12 + 8 + newJsonBuf.length + 8 + finalBin.length;
    const outBuf = Buffer.alloc(totalLength);

    // Header GLB (12 octets)
    outBuf.writeUInt32LE(0x46546c67, 0); // "glTF"
    outBuf.writeUInt32LE(2, 4);          // version 2
    outBuf.writeUInt32LE(totalLength, 8); // taille totale

    // Chunk 0 : JSON (8 octets en-tête + payload)
    outBuf.writeUInt32LE(newJsonBuf.length, 12);
    outBuf.writeUInt32LE(0x4e4f534a, 16); // "JSON"
    newJsonBuf.copy(outBuf, 20);

    // Chunk 1 : BIN (8 octets en-tête + payload)
    const binOffset = 20 + newJsonBuf.length;
    outBuf.writeUInt32LE(finalBin.length, binOffset);
    outBuf.writeUInt32LE(0x004e4942, binOffset + 4); // "BIN\0"
    finalBin.copy(outBuf, binOffset + 8);

    // Enregistre le fichier GLB optimisé sur le disque
    await fs.writeFile(filePath, outBuf);
    return true;
  } catch (err) {
    console.warn("Failed to inject normals into GLB:", err);
    return false;
  }
}
