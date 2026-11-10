import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = (formData.get("file") || formData.get("image")) as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Aucun fichier fourni." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine extension
    let ext = ".jpg";
    if (file.type === "image/png") ext = ".png";
    else if (file.type === "image/webp") ext = ".webp";
    else if (file.type === "image/gif") ext = ".gif";
    else if (file.name && path.extname(file.name)) {
      ext = path.extname(file.name).toLowerCase();
    }

    const uniqueId = crypto.randomUUID();
    const filename = `dish-${uniqueId}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "dishes");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/dishes/${filename}`;
    console.log(`[Upload-Image] Saved image permanently to: ${publicUrl}`);

    return NextResponse.json({
      ok: true,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error("[Upload-Image] Failed to upload image:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Échec du téléversement." },
      { status: 500 }
    );
  }
}
