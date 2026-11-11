import {
  createFloorObject,
  isFloorObjectType,
  type FloorObject,
  type FloorObjectType,
} from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";
import type { GenerateFloorPlanInput, GenerateFloorPlanResult } from "./types";

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface RawDetectedObject {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  metadata?: {
    capacity?: number;
    tableNumber?: string;
    label?: string;
    [key: string]: unknown;
  };
}

interface RawGeminiResponse {
  summary?: {
    tableCount?: number;
    seatCount?: number;
    layoutDescription?: string;
    detectedZones?: string[];
  };
  objects?: RawDetectedObject[];
}

function parseBase64Image(input: string, fallbackMime = "image/jpeg"): { mimeType: string; data: string } | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.startsWith("data:")) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
  }
  // Assume raw base64 string
  return { mimeType: fallbackMime, data: trimmed };
}

/**
 * Builds the comprehensive prompt instructing Gemini to analyze the two
 * panoramic/perspective photos taken from the center of the venue and map
 * every detected physical element into the Restivo 2D floor catalog.
 */
function buildGeminiPrompt(width: number, height: number, notes?: string): string {
  const centerX = Number((width / 2).toFixed(1));
  const centerY = Number((height / 2).toFixed(1));

  return `
You are Restivo's Principal Restaurant Architect and Computer Vision spatial engine.
A restaurant owner stood directly in the center of their dining space at coordinates (${centerX}m, ${centerY}m) and took TWO photos to map the entire room:

PHOTO 1 (Front View):
- The owner was facing FORWARD (towards the main dining room, front windows, or entrance).
- This view represents the region between Y = 0.5m and Y = ${centerY}m.
- Foreground objects are closer to the center (${centerX}, ${centerY}); background objects are farther towards Y = 0.
- Left side of the photo corresponds to X < ${centerX}; right side of the photo corresponds to X > ${centerX}.

PHOTO 2 (Back View):
- The owner turned 180° around on the spot, facing BACKWARD (towards the bar, kitchen pass, rear dining, or restrooms).
- This view represents the region between Y = ${centerY}m and Y = ${height - 0.5}m.
- Foreground objects are closer to the center; background objects are towards Y = ${height}.
- Because the observer turned 180°, what is on their left in this photo corresponds to the right side of the floor plan (X > ${centerX}), and what is on their right corresponds to the left side (X < ${centerX}).

VENUE DIMENSIONS:
- Total Floor Width: ${width} meters (X axis: 0 to ${width})
- Total Floor Height: ${height} meters (Y axis: 0 to ${height})
- Top-Left Origin: (0, 0)
${notes ? `- Owner's Special Notes: "${notes}"` : ""}

AVAILABLE RESTIVO 2D SVG CATALOG OBJECTS:
Use ONLY these exact types for objects:
1. "ROUND_TABLE": Circular dining table (standard width: 0.9m to 1.2m, height: same as width, capacity: 2 to 6).
2. "SQUARE_TABLE": Square dining table (standard width: 0.9m, height: 0.9m, capacity: 2 to 4).
3. "RECTANGLE_TABLE": Long dining table (standard width: 1.6m, height: 0.85m, capacity: 4 to 8).
4. "BAR_TABLE": High-top cocktail table (standard width: 0.65m, height: 0.65m, capacity: 2).
5. "BOOTH": Built-in restaurant dining booth (standard width: 1.6m, height: 0.9m, capacity: 4).
6. "BENCH": Long seating bench against walls (standard width: 1.8m, height: 0.48m, capacity: 3).
7. "BAR": Drinks / service bar counter (standard width: 3.2m, height: 1.15m, capacity: 6).
8. "KITCHEN": Kitchen pass / food prep station (standard width: 3.4m, height: 2.6m).
9. "RECEPTION": Hostess / greeting stand (standard width: 1.8m, height: 0.7m).
10. "WALL": Partition or divider wall.
11. "DOOR": Entrance or exit door.
12. "WINDOW": Exterior window.
13. "COLUMN": Architectural pillar / column (standard 0.4m x 0.4m).

SPATIAL LAYOUT RULES:
1. Coordinate bounds: Every object's (x, y) must strictly lie within [0.6m, ${width - 0.6}m] and [0.6m, ${height - 0.6}m].
2. Spacing: Maintain realistic circulation aisles (at least 0.8m to 1.0m between tables).
3. Rotation: Expressed in degrees (0, 90, 180, 270).
4. Tables must be numbered sequentially (T1, T2, T3...) in metadata.tableNumber.
5. Provide a realistic capacity for every table in metadata.capacity (e.g. 2, 4, 6).

OUTPUT FORMAT:
Respond with ONLY valid JSON strictly matching this schema:
{
  "summary": {
    "tableCount": number,
    "seatCount": number,
    "layoutDescription": string,
    "detectedZones": ["Front Dining", "Bar Lounge", "Booth Row", etc.]
  },
  "objects": [
    {
      "type": "ROUND_TABLE",
      "x": 4.5,
      "y": 3.2,
      "width": 1.0,
      "height": 1.0,
      "rotation": 0,
      "metadata": {
        "capacity": 4,
        "tableNumber": "T1"
      }
    }
  ]
}
`.trim();
}

/**
 * Generate matching chairs positioned neatly around a table.
 */
function generateChairsForTable(table: FloorObject): FloorObject[] {
  const chairs: FloorObject[] = [];
  const capacity = (table.metadata?.capacity as number) || 4;
  const { x, y, width, height, type } = table;

  if (type === "ROUND_TABLE" || type === "BAR_TABLE") {
    const radius = Math.max(width, height) / 2 + 0.35;
    for (let i = 0; i < capacity; i++) {
      const angle = (i * 2 * Math.PI) / capacity;
      const chairX = x + Math.cos(angle) * radius;
      const chairY = y + Math.sin(angle) * radius;
      // Rotation in degrees facing towards table center
      const rotationDeg = Math.round(((angle + Math.PI / 2) * 180) / Math.PI) % 360;
      chairs.push(
        createFloorObject("CHAIR", {
          x: Number(chairX.toFixed(2)),
          y: Number(chairY.toFixed(2)),
          width: 0.45,
          height: 0.5,
          rotation: rotationDeg,
          zIndex: 1,
          metadata: { parentTable: table.metadata?.tableNumber || table.id },
        }),
      );
    }
  } else if (type === "RECTANGLE_TABLE") {
    // Top and bottom sides
    const halfH = height / 2 + 0.32;
    const halfW = width / 2;
    const chairsPerSide = Math.max(1, Math.floor((capacity - 2) / 2));
    const step = width / (chairsPerSide + 1);

    for (let i = 1; i <= chairsPerSide; i++) {
      const offsetX = -halfW + i * step;
      // Top chair facing down
      chairs.push(
        createFloorObject("CHAIR", {
          x: Number((x + offsetX).toFixed(2)),
          y: Number((y - halfH).toFixed(2)),
          width: 0.45,
          height: 0.5,
          rotation: 180,
          zIndex: 1,
          metadata: { parentTable: table.metadata?.tableNumber || table.id },
        }),
      );
      // Bottom chair facing up
      chairs.push(
        createFloorObject("CHAIR", {
          x: Number((x + offsetX).toFixed(2)),
          y: Number((y + halfH).toFixed(2)),
          width: 0.45,
          height: 0.5,
          rotation: 0,
          zIndex: 1,
          metadata: { parentTable: table.metadata?.tableNumber || table.id },
        }),
      );
    }

    // Left and right heads of table if capacity allows
    if (capacity > chairsPerSide * 2) {
      const sideOffset = halfW + 0.35;
      chairs.push(
        createFloorObject("CHAIR", {
          x: Number((x - sideOffset).toFixed(2)),
          y: Number(y.toFixed(2)),
          width: 0.45,
          height: 0.5,
          rotation: 90,
          zIndex: 1,
          metadata: { parentTable: table.metadata?.tableNumber || table.id },
        }),
      );
      if (capacity > chairsPerSide * 2 + 1) {
        chairs.push(
          createFloorObject("CHAIR", {
            x: Number((x + sideOffset).toFixed(2)),
            y: Number(y.toFixed(2)),
            width: 0.45,
            height: 0.5,
            rotation: 270,
            zIndex: 1,
            metadata: { parentTable: table.metadata?.tableNumber || table.id },
          }),
        );
      }
    }
  } else if (type === "SQUARE_TABLE") {
    const offset = Math.max(width, height) / 2 + 0.32;
    const positions = [
      { dx: 0, dy: -offset, rot: 180 },
      { dx: 0, dy: offset, rot: 0 },
      { dx: -offset, dy: 0, rot: 90 },
      { dx: offset, dy: 0, rot: 270 },
    ];
    for (let i = 0; i < Math.min(capacity, 4); i++) {
      const p = positions[i];
      chairs.push(
        createFloorObject("CHAIR", {
          x: Number((x + p.dx).toFixed(2)),
          y: Number((y + p.dy).toFixed(2)),
          width: 0.45,
          height: 0.5,
          rotation: p.rot,
          zIndex: 1,
          metadata: { parentTable: table.metadata?.tableNumber || table.id },
        }),
      );
    }
  }

  return chairs;
}

/**
 * Primary Gemini Vision caller with fast fallback chain.
 */
async function callGeminiVision(
  parts: GeminiPart[],
  apiKey: string,
): Promise<string> {
  const candidateModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const payload = await response.json();
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const errDetails = await response.text().catch(() => "");
        console.warn(`[GeminiFloor] Model ${model} returned ${response.status}:`, errDetails.slice(0, 150));
        lastError = new Error(`Model ${model} failed with ${response.status}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[GeminiFloor] Model ${model} threw error:`, msg);
      lastError = err instanceof Error ? err : new Error(msg);
    }
  }

  throw lastError || new Error("All Gemini Vision models failed to respond.");
}

/**
 * Main export: Analyzes dual photos (front and back) and returns
 * structured 2D floor objects ready to be rendered and edited.
 */
export async function generateFloorPlanFromImages(
  input: GenerateFloorPlanInput,
): Promise<GenerateFloorPlanResult> {
  const apiKey =
    process.env.geminiapikey ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is not configured in .env (geminiapikey / GEMINI_API_KEY).");
  }

  const { frontImage, backImage, floorWidth = 16, floorHeight = 10, notes, generateChairs = true } = input;

  const parsedFront = parseBase64Image(frontImage);
  const parsedBack = parseBase64Image(backImage);

  if (!parsedFront) {
    throw new Error("Front view photo is missing or invalid base64 format.");
  }
  if (!parsedBack) {
    throw new Error("Back view photo is missing or invalid base64 format.");
  }

  const promptText = buildGeminiPrompt(floorWidth, floorHeight, notes);

  const parts: GeminiPart[] = [
    { text: promptText },
    {
      inlineData: {
        mimeType: parsedFront.mimeType,
        data: parsedFront.data,
      },
    },
    {
      inlineData: {
        mimeType: parsedBack.mimeType,
        data: parsedBack.data,
      },
    },
  ];

  const rawJson = await callGeminiVision(parts, apiKey);

  let parsed: RawGeminiResponse;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    console.error("[GeminiFloor] Failed to parse JSON response:", rawJson);
    throw new Error("Gemini returned an invalid JSON response. Please try again with clearer photos.");
  }

  const rawObjects = Array.isArray(parsed.objects) ? parsed.objects : [];
  const processedObjects: FloorObject[] = [];
  const generatedChairs: FloorObject[] = [];

  let tableIndex = 1;

  for (const raw of rawObjects) {
    const rawType = (raw.type || "").toUpperCase().trim();
    if (!isFloorObjectType(rawType)) {
      console.warn(`[GeminiFloor] Skipping unrecognized object type: ${raw.type}`);
      continue;
    }

    const type = rawType as FloorObjectType;

    // Clamp coordinates safely within the floor boundaries
    const safeMargin = 0.5;
    const clampedX = Math.max(safeMargin, Math.min(floorWidth - safeMargin, Number(raw.x) || floorWidth / 2));
    const clampedY = Math.max(safeMargin, Math.min(floorHeight - safeMargin, Number(raw.y) || floorHeight / 2));

    const metadata: Record<string, unknown> = { ...(raw.metadata || {}) };

    if (type.includes("TABLE")) {
      if (!metadata.tableNumber) {
        metadata.tableNumber = `T${tableIndex++}`;
      }
      if (!metadata.capacity) {
        metadata.capacity = type === "ROUND_TABLE" || type === "SQUARE_TABLE" ? 4 : type === "RECTANGLE_TABLE" ? 6 : 2;
      }
    }

    const floorObj = createFloorObject(type, {
      x: Number(clampedX.toFixed(2)),
      y: Number(clampedY.toFixed(2)),
      width: raw.width ? Math.max(0.4, Number(raw.width)) : undefined,
      height: raw.height ? Math.max(0.4, Number(raw.height)) : undefined,
      rotation: Number(raw.rotation) || 0,
      zIndex: type.includes("TABLE") || type === "BAR" || type === "KITCHEN" ? 2 : 1,
      metadata,
    });

    processedObjects.push(floorObj);

    // If requested, generate matching chairs for this table
    if (generateChairs && type.includes("TABLE")) {
      const tableChairs = generateChairsForTable(floorObj);
      generatedChairs.push(...tableChairs);
    }
  }

  // Combine tables/furniture and chairs
  const allObjects = [...processedObjects, ...generatedChairs];

  // Calculate accurate summary
  const tableObjects = processedObjects.filter((o) => o.type.includes("TABLE"));
  const tableCount = tableObjects.length;
  const seatCount = tableObjects.reduce(
    (sum, t) => sum + ((t.metadata?.capacity as number) || (t.type === "RECTANGLE_TABLE" ? 6 : 4)),
    0,
  );

  const tablesByType: Partial<Record<FloorObjectType, number>> = {};
  for (const t of tableObjects) {
    tablesByType[t.type] = (tablesByType[t.type] || 0) + 1;
  }

  return {
    ok: true,
    summary: {
      tableCount,
      seatCount,
      layoutDescription:
        parsed.summary?.layoutDescription ||
        `Identified ${tableCount} tables with estimated ${seatCount} seats across front and rear dining areas.`,
      detectedZones: parsed.summary?.detectedZones || ["Front Dining", "Rear Dining / Service"],
      tablesByType,
    },
    objects: allObjects,
  };
}
