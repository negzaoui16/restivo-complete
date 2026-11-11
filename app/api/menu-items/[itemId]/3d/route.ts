import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { itemId } = await context.params;
    if (!itemId) {
      return new Response("Missing itemId", { status: 400 });
    }

    const item = await db.orm.public.MenuItem.where({ id: itemId }).first();
    if (!item) {
      return new Response("Item not found", { status: 404 });
    }

    const raw3d = (item as any).model3dUrl as string | undefined | null;
    if (!raw3d || !raw3d.trim()) {
      return new Response("No 3D model for this item", { status: 404 });
    }

    // 1. Si le modèle est stocké sous forme de Data URI Base64 dans MongoDB Atlas
    if (raw3d.startsWith("data:")) {
      const base64Data = raw3d.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "model/gltf-binary",
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 2. Si c'est un chemin relatif local (ex: /models/burger.glb ou /models/fries.glb)
    if (raw3d.startsWith("/models/")) {
      const filename = path.basename(raw3d);
      const filePath = path.join(process.cwd(), "public", "models", filename);
      try {
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
        return NextResponse.redirect(new URL(raw3d, request.url));
      }
    }

    // 3. Si c'est une URL externe complète
    if (raw3d.startsWith("http://") || raw3d.startsWith("https://")) {
      return NextResponse.redirect(raw3d);
    }

    return new Response("Unsupported model URL format", { status: 400 });
  } catch (err: any) {
    console.error("[API 3D Model] Error serving model:", err);
    return new Response(err?.message || "Internal server error", { status: 500 });
  }
}
