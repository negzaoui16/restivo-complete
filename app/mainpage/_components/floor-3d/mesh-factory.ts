import * as THREE from "three";
import type { FloorObject } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";
import type { MaterialPalette } from "./materials";

export type TableVisualState = "default" | "hovered" | "selected" | "free" | "taken" | "too_small";

export interface MeshFactoryOptions {
  palette: MaterialPalette;
  state?: TableVisualState;
  showLabels?: boolean;
}

export function createFloorObjectMesh(object: FloorObject, options: MeshFactoryOptions): THREE.Group {
  const group = new THREE.Group();
  group.name = `floor-obj-${object.id}`;
  group.userData = {
    id: object.id,
    type: object.type,
    isTable: isTableType(object.type),
    capacity: (object.metadata?.capacity as number) ?? defaultCapacity(object.type),
    name: (object.metadata?.name as string) ?? object.id,
  };

  const { palette, state = "default" } = options;

  switch (object.type) {
    case "ROUND_TABLE":
      buildRoundTable(group, object, palette, state);
      break;
    case "SQUARE_TABLE":
      buildSquareTable(group, object, palette, state);
      break;
    case "RECTANGLE_TABLE":
      buildRectangleTable(group, object, palette, state);
      break;
    case "BAR_TABLE":
      buildBarTable(group, object, palette, state);
      break;
    case "CHAIR":
      buildSingleChair(group, object, palette);
      break;
    case "BENCH":
      buildBench(group, object, palette);
      break;
    case "BOOTH":
      buildBooth(group, object, palette);
      break;
    case "WALL":
      buildWall(group, object, palette);
      break;
    case "DOOR":
      buildDoor(group, object, palette);
      break;
    case "WINDOW":
      buildWindow(group, object, palette);
      break;
    case "COLUMN":
      buildColumn(group, object, palette);
      break;
    case "KITCHEN":
      buildKitchen(group, object, palette);
      break;
    case "BAR":
      buildBar(group, object, palette);
      break;
    case "TOILET":
      buildToilet(group, object, palette);
      break;
    case "STORAGE":
      buildStorage(group, object, palette);
      break;
    case "RECEPTION":
      buildReception(group, object, palette);
      break;
    case "STAIRS":
      buildStairs(group, object, palette);
      break;
    default:
      buildGenericBox(group, object, palette);
      break;
  }

  // Add selection / status ring if applicable
  if (state !== "default") {
    addStatusRing(group, object, palette, state);
  }

  return group;
}

export function isTableType(type: string): boolean {
  return type === "ROUND_TABLE" || type === "SQUARE_TABLE" || type === "RECTANGLE_TABLE" || type === "BAR_TABLE";
}

function defaultCapacity(type: string): number {
  switch (type) {
    case "ROUND_TABLE":
    case "SQUARE_TABLE":
      return 4;
    case "RECTANGLE_TABLE":
      return 6;
    case "BAR_TABLE":
      return 2;
    default:
      return 2;
  }
}

// ─── Status Indicator Ring ───────────────────────────────────────────────────

function addStatusRing(group: THREE.Group, object: FloorObject, palette: MaterialPalette, state: TableVisualState) {
  const radius = Math.max(object.width, object.height) * 0.65;
  const ringGeo = new THREE.RingGeometry(radius, radius + 0.08, 32);
  ringGeo.rotateX(-Math.PI / 2);

  let material: THREE.Material = palette.hoverGlow;
  if (state === "selected") material = palette.selectedGlow;
  else if (state === "free") material = palette.availableIndicator;
  else if (state === "taken") material = palette.bookedIndicator;

  const ring = new THREE.Mesh(ringGeo, material);
  ring.position.y = 0.015;
  group.add(ring);
}

// ─── Round Table ─────────────────────────────────────────────────────────────

function buildRoundTable(
  group: THREE.Group,
  object: FloorObject,
  palette: MaterialPalette,
  state: TableVisualState,
) {
  const radius = object.width / 2;
  const tableHeight = 0.74;
  const topThickness = 0.04;

  const woodMat = state === "selected" ? palette.selectedGlow : palette.woodOak;

  // Tabletop
  const topGeo = new THREE.CylinderGeometry(radius, radius, topThickness, 32);
  const topMesh = new THREE.Mesh(topGeo, woodMat);
  topMesh.position.y = tableHeight - topThickness / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // Central Pillar
  const pillarGeo = new THREE.CylinderGeometry(0.045, 0.045, tableHeight - topThickness, 16);
  const pillarMesh = new THREE.Mesh(pillarGeo, palette.metalDark);
  pillarMesh.position.y = (tableHeight - topThickness) / 2;
  pillarMesh.castShadow = true;
  group.add(pillarMesh);

  // Base Plate
  const baseGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.6, 0.02, 32);
  const baseMesh = new THREE.Mesh(baseGeo, palette.metalDark);
  baseMesh.position.y = 0.01;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Chairs around table
  const capacity = (object.metadata?.capacity as number) ?? 4;
  const chairDist = radius + 0.28;
  for (let i = 0; i < capacity; i++) {
    const angle = (i * 2 * Math.PI) / capacity;
    const chair = createMiniChair(palette);
    chair.position.set(Math.cos(angle) * chairDist, 0, Math.sin(angle) * chairDist);
    chair.rotation.y = -angle + Math.PI / 2;
    group.add(chair);
  }
}

// ─── Square Table ────────────────────────────────────────────────────────────

function buildSquareTable(
  group: THREE.Group,
  object: FloorObject,
  palette: MaterialPalette,
  state: TableVisualState,
) {
  const w = object.width;
  const d = object.height;
  const tableHeight = 0.74;
  const topThickness = 0.04;

  const woodMat = state === "selected" ? palette.selectedGlow : palette.woodOak;

  // Top
  const topGeo = new THREE.BoxGeometry(w, topThickness, d);
  const topMesh = new THREE.Mesh(topGeo, woodMat);
  topMesh.position.y = tableHeight - topThickness / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // 4 Legs
  const legThickness = 0.05;
  const legHeight = tableHeight - topThickness;
  const legGeo = new THREE.BoxGeometry(legThickness, legHeight, legThickness);
  const legOffsetW = w / 2 - legThickness * 1.2;
  const legOffsetD = d / 2 - legThickness * 1.2;

  const legPositions = [
    [-legOffsetW, -legOffsetD],
    [legOffsetW, -legOffsetD],
    [-legOffsetW, legOffsetD],
    [legOffsetW, legOffsetD],
  ];

  legPositions.forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, palette.metalDark);
    leg.position.set(x, legHeight / 2, z);
    leg.castShadow = true;
    group.add(leg);
  });

  // 4 Chairs (one on each side)
  const capacity = (object.metadata?.capacity as number) ?? 4;
  const chairDist = Math.max(w, d) / 2 + 0.28;
  for (let i = 0; i < Math.min(capacity, 4); i++) {
    const angle = (i * Math.PI) / 2;
    const chair = createMiniChair(palette);
    chair.position.set(Math.cos(angle) * chairDist, 0, Math.sin(angle) * chairDist);
    chair.rotation.y = -angle + Math.PI / 2;
    group.add(chair);
  }
}

// ─── Rectangle Table ─────────────────────────────────────────────────────────

function buildRectangleTable(
  group: THREE.Group,
  object: FloorObject,
  palette: MaterialPalette,
  state: TableVisualState,
) {
  const w = object.width;
  const d = object.height;
  const tableHeight = 0.74;
  const topThickness = 0.04;

  const woodMat = state === "selected" ? palette.selectedGlow : palette.woodOak;

  // Top
  const topGeo = new THREE.BoxGeometry(w, topThickness, d);
  const topMesh = new THREE.Mesh(topGeo, woodMat);
  topMesh.position.y = tableHeight - topThickness / 2;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // 4 Legs
  const legThickness = 0.06;
  const legHeight = tableHeight - topThickness;
  const legGeo = new THREE.BoxGeometry(legThickness, legHeight, legThickness);
  const legOffsetW = w / 2 - legThickness * 1.5;
  const legOffsetD = d / 2 - legThickness * 1.5;

  [
    [-legOffsetW, -legOffsetD],
    [legOffsetW, -legOffsetD],
    [-legOffsetW, legOffsetD],
    [legOffsetW, legOffsetD],
  ].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, palette.woodWalnut);
    leg.position.set(x, legHeight / 2, z);
    leg.castShadow = true;
    group.add(leg);
  });

  // Chairs along long sides
  const capacity = (object.metadata?.capacity as number) ?? 6;
  const chairsPerSide = Math.max(1, Math.floor(capacity / 2));
  const spacing = (w * 0.75) / Math.max(1, chairsPerSide - 1 || 1);
  const chairOffsetZ = d / 2 + 0.28;

  for (let i = 0; i < chairsPerSide; i++) {
    const x = -w * 0.375 + i * spacing;
    // Top side
    const chairTop = createMiniChair(palette);
    chairTop.position.set(x, 0, -chairOffsetZ);
    chairTop.rotation.y = Math.PI;
    group.add(chairTop);

    // Bottom side
    const chairBottom = createMiniChair(palette);
    chairBottom.position.set(x, 0, chairOffsetZ);
    chairBottom.rotation.y = 0;
    group.add(chairBottom);
  }
}

// ─── Bar Table ───────────────────────────────────────────────────────────────

function buildBarTable(
  group: THREE.Group,
  object: FloorObject,
  palette: MaterialPalette,
  state: TableVisualState,
) {
  const radius = object.width / 2;
  const tableHeight = 1.05;
  const topThickness = 0.035;

  const woodMat = state === "selected" ? palette.selectedGlow : palette.woodWalnut;

  // High Top
  const topGeo = new THREE.CylinderGeometry(radius, radius, topThickness, 32);
  const topMesh = new THREE.Mesh(topGeo, woodMat);
  topMesh.position.y = tableHeight - topThickness / 2;
  topMesh.castShadow = true;
  group.add(topMesh);

  // Slim Metal Stem
  const stemGeo = new THREE.CylinderGeometry(0.035, 0.035, tableHeight, 16);
  const stemMesh = new THREE.Mesh(stemGeo, palette.metalDark);
  stemMesh.position.y = tableHeight / 2;
  stemMesh.castShadow = true;
  group.add(stemMesh);

  // Footrest Ring
  const footRingGeo = new THREE.TorusGeometry(0.18, 0.015, 8, 24);
  footRingGeo.rotateX(Math.PI / 2);
  const footRing = new THREE.Mesh(footRingGeo, palette.metalChrome);
  footRing.position.y = 0.28;
  group.add(footRing);

  // Base
  const baseGeo = new THREE.CylinderGeometry(radius * 0.6, radius * 0.65, 0.02, 32);
  const baseMesh = new THREE.Mesh(baseGeo, palette.metalDark);
  baseMesh.position.y = 0.01;
  group.add(baseMesh);

  // 2 Bar Stools
  const stoolDist = radius + 0.26;
  [-1, 1].forEach((dir) => {
    const stool = createBarStool(palette);
    stool.position.set(dir * stoolDist, 0, 0);
    stool.rotation.y = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(stool);
  });
}

// ─── Helper: Chair Mesh ──────────────────────────────────────────────────────

function createMiniChair(palette: MaterialPalette): THREE.Group {
  const chair = new THREE.Group();

  const seatHeight = 0.44;
  const seatSize = 0.38;
  const cushionThickness = 0.04;

  // Seat Cushion
  const seatGeo = new THREE.BoxGeometry(seatSize, cushionThickness, seatSize);
  const seatMesh = new THREE.Mesh(seatGeo, palette.cushionTerracotta);
  seatMesh.position.y = seatHeight - cushionThickness / 2;
  seatMesh.castShadow = true;
  chair.add(seatMesh);

  // 4 Legs
  const legThick = 0.025;
  const legHeight = seatHeight - cushionThickness;
  const legGeo = new THREE.BoxGeometry(legThick, legHeight, legThick);
  const offset = seatSize / 2 - 0.03;

  [
    [-offset, -offset],
    [offset, -offset],
    [-offset, offset],
    [offset, offset],
  ].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, palette.metalDark);
    leg.position.set(x, legHeight / 2, z);
    leg.castShadow = true;
    chair.add(leg);
  });

  // Backrest
  const backHeight = 0.38;
  const backGeo = new THREE.BoxGeometry(seatSize, backHeight, 0.03);
  const backMesh = new THREE.Mesh(backGeo, palette.woodOak);
  backMesh.position.set(0, seatHeight + backHeight / 2, offset);
  backMesh.castShadow = true;
  chair.add(backMesh);

  return chair;
}

function createBarStool(palette: MaterialPalette): THREE.Group {
  const stool = new THREE.Group();
  const height = 0.72;
  const seatRadius = 0.18;

  // Round Cushion
  const seatGeo = new THREE.CylinderGeometry(seatRadius, seatRadius, 0.05, 24);
  const seatMesh = new THREE.Mesh(seatGeo, palette.cushionCharcoal);
  seatMesh.position.y = height;
  seatMesh.castShadow = true;
  stool.add(seatMesh);

  // Metal Pillar
  const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, height, 16);
  const stemMesh = new THREE.Mesh(stemGeo, palette.metalDark);
  stemMesh.position.y = height / 2;
  stool.add(stemMesh);

  // Footrest
  const footGeo = new THREE.TorusGeometry(0.13, 0.012, 8, 20);
  footGeo.rotateX(Math.PI / 2);
  const foot = new THREE.Mesh(footGeo, palette.metalChrome);
  foot.position.y = 0.25;
  stool.add(foot);

  // Base
  const baseGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.02, 24);
  const base = new THREE.Mesh(baseGeo, palette.metalDark);
  base.position.y = 0.01;
  stool.add(base);

  return stool;
}

// ─── Single Chair & Bench & Booth ───────────────────────────────────────────

function buildSingleChair(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const chair = createMiniChair(palette);
  chair.scale.set(1.15, 1.15, 1.15);
  group.add(chair);
}

function buildBench(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const height = 0.45;

  const seatGeo = new THREE.BoxGeometry(w, 0.06, d);
  const seat = new THREE.Mesh(seatGeo, palette.cushionTerracotta);
  seat.position.y = height;
  seat.castShadow = true;
  group.add(seat);

  const baseGeo = new THREE.BoxGeometry(w * 0.95, height - 0.06, d * 0.85);
  const base = new THREE.Mesh(baseGeo, palette.woodOak);
  base.position.y = (height - 0.06) / 2;
  base.castShadow = true;
  group.add(base);
}

function buildBooth(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const seatHeight = 0.46;
  const backHeight = 1.05;

  // Backrest (high luxury upholstered divider)
  const backGeo = new THREE.BoxGeometry(w, backHeight, d * 0.25);
  const back = new THREE.Mesh(backGeo, palette.cushionCharcoal);
  back.position.set(0, backHeight / 2, -d * 0.35);
  back.castShadow = true;
  group.add(back);

  // Seat
  const seatGeo = new THREE.BoxGeometry(w, 0.1, d * 0.65);
  const seat = new THREE.Mesh(seatGeo, palette.cushionTerracotta);
  seat.position.set(0, seatHeight, 0.05);
  seat.castShadow = true;
  group.add(seat);

  // Wooden Base
  const baseGeo = new THREE.BoxGeometry(w * 0.98, seatHeight - 0.05, d * 0.85);
  const base = new THREE.Mesh(baseGeo, palette.woodWalnut);
  base.position.set(0, (seatHeight - 0.05) / 2, -0.02);
  group.add(base);
}

// ─── Architecture: Wall, Door, Window, Column, Stairs ────────────────────────

function buildWall(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const wallHeight = 1.5;

  const wallGeo = new THREE.BoxGeometry(w, wallHeight, d);
  const wall = new THREE.Mesh(wallGeo, palette.wall);
  wall.position.y = wallHeight / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Top molding
  const isVertical = d > w;
  const capW = isVertical ? w * 1.15 : w * 1.02;
  const capD = isVertical ? d * 1.02 : d * 1.15;
  const capGeo = new THREE.BoxGeometry(capW, 0.05, capD);
  const cap = new THREE.Mesh(capGeo, palette.wallTop);
  cap.position.y = wallHeight + 0.025;
  group.add(cap);
}

function buildDoor(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const height = 1.55;
  const leaf = Math.max(0.08, Math.min(w, d) * 0.96);

  // Position frame along the wall plane (at d / 2 - 0.1m, matching outer wall thickness)
  const frameZ = d / 2 - 0.1;
  const postThick = 0.06;
  const hingeX = -w / 2 + postThick;
  const postGeo = new THREE.BoxGeometry(postThick, height, 0.08);

  const leftPost = new THREE.Mesh(postGeo, palette.doorFrame);
  leftPost.position.set(-w / 2 + postThick / 2, height / 2, frameZ);
  group.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, palette.doorFrame);
  rightPost.position.set(w / 2 - postThick / 2, height / 2, frameZ);
  group.add(rightPost);

  const headerGeo = new THREE.BoxGeometry(w, 0.06, 0.08);
  const header = new THREE.Mesh(headerGeo, palette.doorFrame);
  header.position.set(0, height - 0.03, frameZ);
  group.add(header);

  // Floor Swing Arc (Architectural indicator matching 2D blueprint)
  const arcCurve = new THREE.EllipseCurve(
    hingeX,
    frameZ,
    leaf,
    leaf,
    -Math.PI / 2,
    0,
    false,
    0
  );
  const arcPoints = arcCurve.getPoints(24);
  const arcGeo = new THREE.BufferGeometry().setFromPoints(
    arcPoints.map((p) => new THREE.Vector3(p.x, 0.006, p.y))
  );
  const arcLine = new THREE.Line(
    arcGeo,
    new THREE.LineDashedMaterial({ color: 0x9e9185, dashSize: 0.08, gapSize: 0.04 })
  );
  arcLine.computeLineDistances();
  group.add(arcLine);

  // Open Door Panel (angled ~56 degrees into room)
  const panelW = leaf;
  const panelH = height * 0.94;
  const panelGeo = new THREE.BoxGeometry(panelW, panelH, 0.035);
  panelGeo.translate(panelW / 2, 0, 0); // hinge pivot
  const panel = new THREE.Mesh(panelGeo, palette.doorPanel);
  panel.position.set(hingeX, panelH / 2, frameZ);
  panel.rotation.y = -Math.PI / 3.2;
  panel.castShadow = true;
  group.add(panel);

  // Lever Handle
  const handleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8);
  handleGeo.rotateZ(Math.PI / 2);
  const handle = new THREE.Mesh(handleGeo, palette.metalGold);
  handle.position.set(panelW * 0.88, 0.85, 0.03);
  panel.add(handle);
}

function buildWindow(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const isVertical = d > w;
  const length = isVertical ? d : w;
  const thick = isVertical ? w : d;
  const wallThick = Math.max(0.12, thick);
  const sillHeight = 0.70;
  const windowHeight = 1.05;
  const lintelH = 0.35;

  if (isVertical) {
    // Vertical Window (along Z axis, for Left / Right walls)
    // Lower Sill Wall
    const sillGeo = new THREE.BoxGeometry(wallThick, sillHeight, length);
    const sill = new THREE.Mesh(sillGeo, palette.wall);
    sill.position.y = sillHeight / 2;
    sill.castShadow = true;
    group.add(sill);

    // Top Lintel Wall
    const lintelGeo = new THREE.BoxGeometry(wallThick, lintelH, length);
    const lintel = new THREE.Mesh(lintelGeo, palette.wall);
    lintel.position.y = sillHeight + windowHeight + lintelH / 2;
    lintel.castShadow = true;
    group.add(lintel);

    // Window Frame Surround
    const frameGeo = new THREE.BoxGeometry(0.06, windowHeight, length * 0.98);
    const frame = new THREE.Mesh(frameGeo, palette.doorFrame);
    frame.position.y = sillHeight + windowHeight / 2;
    group.add(frame);

    // Translucent Glass Pane
    const glassGeo = new THREE.BoxGeometry(0.015, windowHeight * 0.92, length * 0.92);
    const glass = new THREE.Mesh(glassGeo, palette.glass);
    glass.position.y = sillHeight + windowHeight / 2;
    group.add(glass);

    // Center Mullion / Divider Bar
    const mullionGeo = new THREE.BoxGeometry(0.03, windowHeight * 0.92, 0.025);
    const mullion = new THREE.Mesh(mullionGeo, palette.doorFrame);
    mullion.position.y = sillHeight + windowHeight / 2;
    group.add(mullion);
  } else {
    // Horizontal Window (along X axis, for Top / Bottom walls)
    // Lower Sill Wall
    const sillGeo = new THREE.BoxGeometry(length, sillHeight, wallThick);
    const sill = new THREE.Mesh(sillGeo, palette.wall);
    sill.position.y = sillHeight / 2;
    sill.castShadow = true;
    group.add(sill);

    // Top Lintel Wall
    const lintelGeo = new THREE.BoxGeometry(length, lintelH, wallThick);
    const lintel = new THREE.Mesh(lintelGeo, palette.wall);
    lintel.position.y = sillHeight + windowHeight + lintelH / 2;
    lintel.castShadow = true;
    group.add(lintel);

    // Window Frame Surround
    const frameGeo = new THREE.BoxGeometry(length * 0.98, windowHeight, 0.06);
    const frame = new THREE.Mesh(frameGeo, palette.doorFrame);
    frame.position.y = sillHeight + windowHeight / 2;
    group.add(frame);

    // Translucent Glass Pane
    const glassGeo = new THREE.BoxGeometry(length * 0.92, windowHeight * 0.92, 0.015);
    const glass = new THREE.Mesh(glassGeo, palette.glass);
    glass.position.y = sillHeight + windowHeight / 2;
    group.add(glass);

    // Center Mullion / Divider Bar
    const mullionGeo = new THREE.BoxGeometry(0.025, windowHeight * 0.92, 0.03);
    const mullion = new THREE.Mesh(mullionGeo, palette.doorFrame);
    mullion.position.y = sillHeight + windowHeight / 2;
    group.add(mullion);
  }
}

function buildColumn(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const radius = Math.min(object.width, object.height) / 2;
  const colHeight = 2.2;

  const colGeo = new THREE.CylinderGeometry(radius, radius, colHeight, 24);
  const column = new THREE.Mesh(colGeo, palette.column);
  column.position.y = colHeight / 2;
  column.castShadow = true;
  column.receiveShadow = true;
  group.add(column);

  // Plinth base
  const baseGeo = new THREE.BoxGeometry(radius * 2.3, 0.08, radius * 2.3);
  const base = new THREE.Mesh(baseGeo, palette.wallTop);
  base.position.y = 0.04;
  group.add(base);
}

function buildStairs(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const steps = 6;
  const stepHeight = 0.12;
  const stepDepth = d / steps;

  for (let i = 0; i < steps; i++) {
    const currentHeight = (i + 1) * stepHeight;
    const stepGeo = new THREE.BoxGeometry(w, currentHeight, stepDepth);
    const step = new THREE.Mesh(stepGeo, palette.stairs);
    step.position.set(0, currentHeight / 2, -d / 2 + (i + 0.5) * stepDepth);
    step.castShadow = true;
    group.add(step);
  }
}

// ─── Areas: Kitchen (L-Shape), Bar, Toilet, Reception, Storage ──────────────

function buildKitchen(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const counterDepth = Math.min(0.65, Math.min(w, d) * 0.32);
  const counterH = 0.90;
  const topThickness = 0.04;
  const baseH = counterH - topThickness;

  // 1. Tiled Kitchen Floor Pad
  const floorGeo = new THREE.BoxGeometry(w, 0.015, d);
  const floor = new THREE.Mesh(floorGeo, palette.kitchenTile);
  floor.position.y = 0.008;
  floor.receiveShadow = true;
  group.add(floor);

  // 2. L-Shaped Counter: Top Wing (horizontal run along top edge)
  const topWingZ = -d / 2 + counterDepth / 2;

  const topBaseGeo = new THREE.BoxGeometry(w, baseH, counterDepth);
  const topBase = new THREE.Mesh(topBaseGeo, palette.cabinetMat);
  topBase.position.set(0, baseH / 2, topWingZ);
  topBase.castShadow = true;
  group.add(topBase);

  const topLipGeo = new THREE.BoxGeometry(w * 1.01, topThickness, counterDepth * 1.02);
  const topLip = new THREE.Mesh(topLipGeo, palette.stainlessSteel);
  topLip.position.set(0, counterH - topThickness / 2, topWingZ);
  topLip.castShadow = true;
  group.add(topLip);

  // 3. L-Shaped Counter: Left Wing (vertical run down left edge)
  const leftWingDepth = Math.max(0.2, d - counterDepth);
  const leftWingX = -w / 2 + counterDepth / 2;
  const leftWingZ = -d / 2 + counterDepth + leftWingDepth / 2;

  const leftBaseGeo = new THREE.BoxGeometry(counterDepth, baseH, leftWingDepth);
  const leftBase = new THREE.Mesh(leftBaseGeo, palette.cabinetMat);
  leftBase.position.set(leftWingX, baseH / 2, leftWingZ);
  leftBase.castShadow = true;
  group.add(leftBase);

  const leftLipGeo = new THREE.BoxGeometry(counterDepth * 1.02, topThickness, leftWingDepth * 1.01);
  const leftLip = new THREE.Mesh(leftLipGeo, palette.stainlessSteel);
  leftLip.position.set(leftWingX, counterH - topThickness / 2, leftWingZ);
  leftLip.castShadow = true;
  group.add(leftLip);

  // 4. Stovetop / Cooktop on Top Wing (at X = w * 0.15)
  const stoveW = Math.min(0.72, w * 0.4);
  const stoveD = Math.min(0.48, counterDepth * 0.74);
  const stoveX = Math.min(w / 2 - stoveW / 2 - 0.1, Math.max(-w / 2 + counterDepth + stoveW / 2 + 0.1, w * 0.15));

  const stovePlateGeo = new THREE.BoxGeometry(stoveW, 0.012, stoveD);
  const stovePlate = new THREE.Mesh(stovePlateGeo, palette.cooktopGlass);
  stovePlate.position.set(stoveX, counterH + 0.006, topWingZ);
  group.add(stovePlate);

  // 4 Burner Rings
  const burnerRadius = Math.min(0.08, stoveD * 0.22);
  const bx = stoveW * 0.24;
  const bz = stoveD * 0.24;
  [
    [-bx, -bz],
    [bx, -bz],
    [-bx, bz],
    [bx, bz],
  ].forEach(([ox, oz]) => {
    const burnerGeo = new THREE.CylinderGeometry(burnerRadius, burnerRadius, 0.015, 16);
    const burner = new THREE.Mesh(burnerGeo, palette.metalDark);
    burner.position.set(stoveX + ox, counterH + 0.015, topWingZ + oz);
    group.add(burner);
  });

  // Stainless Extractor Hood above Stove
  const hoodGeo = new THREE.BoxGeometry(stoveW * 1.1, 0.2, stoveD * 1.15);
  const hood = new THREE.Mesh(hoodGeo, palette.stainlessSteel);
  hood.position.set(stoveX, 1.85, topWingZ);
  hood.castShadow = true;
  group.add(hood);

  const chimneyGeo = new THREE.BoxGeometry(stoveW * 0.4, 0.4, stoveD * 0.4);
  const chimney = new THREE.Mesh(chimneyGeo, palette.stainlessSteel);
  chimney.position.set(stoveX, 2.15, topWingZ);
  group.add(chimney);

  // 5. Sink Basin on Left Wing
  const sinkD = Math.min(0.44, leftWingDepth * 0.45);
  const sinkW = Math.min(0.36, counterDepth * 0.65);
  const sinkZ = leftWingZ;

  const sinkBasinGeo = new THREE.BoxGeometry(sinkW, 0.14, sinkD);
  const sinkBasin = new THREE.Mesh(sinkBasinGeo, palette.stainlessSteel);
  sinkBasin.position.set(leftWingX, counterH - 0.07, sinkZ);
  group.add(sinkBasin);

  // Chrome Faucet
  const spoutGeo = new THREE.TorusGeometry(0.08, 0.012, 8, 16, Math.PI);
  spoutGeo.rotateZ(Math.PI / 2);
  const spout = new THREE.Mesh(spoutGeo, palette.metalChrome);
  spout.position.set(leftWingX - 0.04, counterH + 0.12, sinkZ);
  group.add(spout);

  // 6. Low Backsplash Walls along top & left outer edges
  const splashH = 0.35;
  const backSplashGeo = new THREE.BoxGeometry(w, splashH, 0.04);
  const backSplash = new THREE.Mesh(backSplashGeo, palette.wall);
  backSplash.position.set(0, counterH + splashH / 2, -d / 2 + 0.02);
  backSplash.castShadow = true;
  group.add(backSplash);

  const leftSplashGeo = new THREE.BoxGeometry(0.04, splashH, d);
  const leftSplash = new THREE.Mesh(leftSplashGeo, palette.wall);
  leftSplash.position.set(-w / 2 + 0.02, counterH + splashH / 2, 0);
  leftSplash.castShadow = true;
  group.add(leftSplash);
}

function buildBar(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const counterH = 1.05;
  const counterD = d * 0.54;
  const topThickness = 0.06;

  // Counter is positioned along the top half
  const counterZ = -d / 2 + counterD / 2;

  // Front wooden base with fluted paneling
  const baseH = counterH - topThickness;
  const baseGeo = new THREE.BoxGeometry(w, baseH, counterD * 0.92);
  const base = new THREE.Mesh(baseGeo, palette.woodWalnut);
  base.position.set(0, baseH / 2, counterZ);
  base.castShadow = true;
  group.add(base);

  // Polished Stone/Wood Bar Top with Overhang
  const topGeo = new THREE.BoxGeometry(w * 1.02, topThickness, counterD * 1.08);
  const top = new THREE.Mesh(topGeo, palette.counterStone);
  top.position.set(0, counterH - topThickness / 2, counterZ);
  top.castShadow = true;
  group.add(top);

  // Brass Footrail on Customer Side
  const railZ = counterZ + counterD / 2 + 0.06;
  const railGeo = new THREE.CylinderGeometry(0.02, 0.02, w * 0.96, 16);
  railGeo.rotateZ(Math.PI / 2);
  const rail = new THREE.Mesh(railGeo, palette.metalGold);
  rail.position.set(0, 0.20, railZ);
  group.add(rail);

  [-w * 0.38, 0, w * 0.38].forEach((bx) => {
    const bracketGeo = new THREE.BoxGeometry(0.03, 0.20, 0.08);
    const bracket = new THREE.Mesh(bracketGeo, palette.metalGold);
    bracket.position.set(bx, 0.10, railZ - 0.03);
    group.add(bracket);
  });

  // Stools lined up along customer side
  const capacity = (object.metadata?.capacity as number) ?? 4;
  const stoolZ = -d / 2 + d * 0.82;
  const stoolCount = Math.max(1, capacity);
  const spacing = (w * 0.82) / Math.max(1, stoolCount - 1 || 1);

  for (let i = 0; i < stoolCount; i++) {
    const x = stoolCount === 1 ? 0 : -w * 0.41 + i * spacing;
    const stool = createBarStool(palette);
    stool.position.set(x, 0, stoolZ);
    stool.rotation.y = Math.PI; // Face the bar
    group.add(stool);
  }
}

function buildToilet(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const wallH = 1.6;
  const wallThick = 0.04;
  const doorW = Math.min(w * 0.62, d * 0.36, 0.78);

  // 1. Ceramic Tiled Floor Pad
  const floorGeo = new THREE.BoxGeometry(w, 0.015, d);
  const floor = new THREE.Mesh(floorGeo, palette.tileBathroom);
  floor.position.y = 0.008;
  floor.receiveShadow = true;
  group.add(floor);

  // 2. Enclosure Partition Walls
  // Back wall (Z = -d/2)
  const backWallGeo = new THREE.BoxGeometry(w, wallH, wallThick);
  const backWall = new THREE.Mesh(backWallGeo, palette.wall);
  backWall.position.set(0, wallH / 2, -d / 2 + wallThick / 2);
  backWall.castShadow = true;
  group.add(backWall);

  // Left wall (X = -w/2)
  const leftWallGeo = new THREE.BoxGeometry(wallThick, wallH, d);
  const leftWall = new THREE.Mesh(leftWallGeo, palette.wall);
  leftWall.position.set(-w / 2 + wallThick / 2, wallH / 2, 0);
  leftWall.castShadow = true;
  group.add(leftWall);

  // Right wall (X = w/2)
  const rightWallGeo = new THREE.BoxGeometry(wallThick, wallH, d);
  const rightWall = new THREE.Mesh(rightWallGeo, palette.wall);
  rightWall.position.set(w / 2 - wallThick / 2, wallH / 2, 0);
  rightWall.castShadow = true;
  group.add(rightWall);

  // Front wall with door opening (Z = d/2)
  const frontWallW = Math.max(0.1, w - doorW);
  const frontWallX = w / 2 - frontWallW / 2;
  const frontWallGeo = new THREE.BoxGeometry(frontWallW, wallH, wallThick);
  const frontWall = new THREE.Mesh(frontWallGeo, palette.wall);
  frontWall.position.set(frontWallX, wallH / 2, d / 2 - wallThick / 2);
  frontWall.castShadow = true;
  group.add(frontWall);

  // Door header above opening
  const headerGeo = new THREE.BoxGeometry(doorW, wallH * 0.15, wallThick);
  const header = new THREE.Mesh(headerGeo, palette.wall);
  header.position.set(-w / 2 + doorW / 2, wallH * 0.925, d / 2 - wallThick / 2);
  group.add(header);

  // 3. Stall Door (Swung partially open)
  const doorPanelW = doorW * 0.95;
  const doorPanelH = wallH * 0.85;
  const doorPanelGeo = new THREE.BoxGeometry(doorPanelW, doorPanelH, 0.02);
  doorPanelGeo.translate(doorPanelW / 2, 0, 0);
  const doorPanel = new THREE.Mesh(doorPanelGeo, palette.doorPanel);
  doorPanel.position.set(-w / 2 + wallThick, doorPanelH / 2, d / 2 - wallThick / 2);
  doorPanel.rotation.y = -Math.PI / 4;
  doorPanel.castShadow = true;
  group.add(doorPanel);

  // Chrome Lever Handle
  const handleGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8);
  handleGeo.rotateZ(Math.PI / 2);
  const handle = new THREE.Mesh(handleGeo, palette.metalChrome);
  handle.position.set(doorPanelW * 0.85, 0.85, 0.03);
  doorPanel.add(handle);

  // 4. White Porcelain Toilet (WC)
  const tankW = Math.min(0.38, w * 0.35);
  const tankD = 0.16;
  const tankH = 0.38;
  const tankZ = -d / 2 + wallThick + tankD / 2 + 0.02;

  const tankGeo = new THREE.BoxGeometry(tankW, tankH, tankD);
  const tank = new THREE.Mesh(tankGeo, palette.porcelain);
  tank.position.set(0, 0.42 + tankH / 2, tankZ);
  tank.castShadow = true;
  group.add(tank);

  // Chrome Dual-Flush Button
  const flushBtnGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16);
  const flushBtn = new THREE.Mesh(flushBtnGeo, palette.metalChrome);
  flushBtn.position.set(0, 0.42 + tankH + 0.005, tankZ);
  group.add(flushBtn);

  // Toilet Pedestal Base
  const baseW = 0.22;
  const baseD = 0.34;
  const baseH = 0.40;
  const bowlZ = tankZ + tankD / 2 + baseD / 2 - 0.03;

  const pedestalGeo = new THREE.BoxGeometry(baseW, baseH, baseD);
  const pedestal = new THREE.Mesh(pedestalGeo, palette.porcelain);
  pedestal.position.set(0, baseH / 2, bowlZ);
  pedestal.castShadow = true;
  group.add(pedestal);

  // Oval Bowl Rim
  const bowlGeo = new THREE.CylinderGeometry(0.19, 0.16, 0.15, 24);
  bowlGeo.scale(1, 1, 1.25);
  const bowl = new THREE.Mesh(bowlGeo, palette.porcelain);
  bowl.position.set(0, baseH + 0.04, bowlZ + 0.03);
  bowl.castShadow = true;
  group.add(bowl);

  // Toilet Seat Ring
  const seatRingGeo = new THREE.TorusGeometry(0.17, 0.022, 12, 24);
  seatRingGeo.rotateX(Math.PI / 2);
  seatRingGeo.scale(1, 1, 1.25);
  const seatRing = new THREE.Mesh(seatRingGeo, palette.cushionCream);
  seatRing.position.set(0, baseH + 0.12, bowlZ + 0.03);
  group.add(seatRing);

  // Toilet Paper Holder on Right Wall
  const tpHolderGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.14, 8);
  tpHolderGeo.rotateZ(Math.PI / 2);
  const tpHolder = new THREE.Mesh(tpHolderGeo, palette.metalChrome);
  tpHolder.position.set(w / 2 - wallThick - 0.06, 0.65, bowlZ);
  group.add(tpHolder);

  const tpRollGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.11, 16);
  tpRollGeo.rotateZ(Math.PI / 2);
  const tpRoll = new THREE.Mesh(tpRollGeo, palette.cushionCream);
  tpRoll.position.set(w / 2 - wallThick - 0.06, 0.65, bowlZ);
  group.add(tpRoll);

  // 5. Handwash Sink Basin & Mirror
  if (w >= 1.0) {
    const basinGeo = new THREE.BoxGeometry(wallThick + 0.02, 0.14, 0.24);
    const basin = new THREE.Mesh(basinGeo, palette.porcelain);
    basin.position.set(w / 2 - wallThick / 2 - 0.1, 0.82, tankZ + 0.45);
    group.add(basin);

    const fBaseGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8);
    const fBase = new THREE.Mesh(fBaseGeo, palette.metalChrome);
    fBase.position.set(w / 2 - wallThick - 0.04, 0.90, tankZ + 0.45);
    group.add(fBase);

    // Mirror on the wall above sink
    const mirrorGeo = new THREE.BoxGeometry(0.01, 0.45, 0.32);
    const mirror = new THREE.Mesh(mirrorGeo, palette.glass);
    mirror.position.set(w / 2 - wallThick - 0.01, 1.25, tankZ + 0.45);
    group.add(mirror);
  }
}

function buildReception(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const deskH = 1.10;

  // Base desk
  const baseGeo = new THREE.BoxGeometry(w, deskH * 0.92, d * 0.85);
  const base = new THREE.Mesh(baseGeo, palette.woodOak);
  base.position.set(0, (deskH * 0.92) / 2, 0);
  base.castShadow = true;
  group.add(base);

  // Polished Stone Countertop
  const topGeo = new THREE.BoxGeometry(w * 1.04, 0.05, d * 0.92);
  const top = new THREE.Mesh(topGeo, palette.counterStone);
  top.position.set(0, deskH, 0);
  top.castShadow = true;
  group.add(top);

  // Host Display Tablet
  const standGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 12);
  const stand = new THREE.Mesh(standGeo, palette.metalDark);
  stand.position.set(-w * 0.15, deskH + 0.04, 0);
  group.add(stand);

  const tabletGeo = new THREE.BoxGeometry(0.24, 0.16, 0.01);
  tabletGeo.rotateX(-Math.PI / 6);
  const tablet = new THREE.Mesh(tabletGeo, palette.metalDark);
  tablet.position.set(-w * 0.15, deskH + 0.12, 0);
  group.add(tablet);

  // Desk Lamp
  const lampBaseGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.02, 16);
  const lampBase = new THREE.Mesh(lampBaseGeo, palette.metalGold);
  lampBase.position.set(w * 0.32, deskH + 0.01, 0);
  group.add(lampBase);

  const lampStemGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.22, 12);
  const lampStem = new THREE.Mesh(lampStemGeo, palette.metalGold);
  lampStem.position.set(w * 0.32, deskH + 0.12, 0);
  group.add(lampStem);

  const shadeGeo = new THREE.ConeGeometry(0.08, 0.08, 16);
  const shade = new THREE.Mesh(shadeGeo, palette.cushionCream);
  shade.position.set(w * 0.32, deskH + 0.24, 0);
  group.add(shade);
}

function buildStorage(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const w = object.width;
  const d = object.height;
  const h = 1.45;

  // 4 Corner Metal Posts
  const postThick = 0.035;
  const postGeo = new THREE.BoxGeometry(postThick, h, postThick);
  const ox = w / 2 - postThick / 2;
  const oz = d / 2 - postThick / 2;

  [
    [-ox, -oz],
    [ox, -oz],
    [-ox, oz],
    [ox, oz],
  ].forEach(([x, z]) => {
    const post = new THREE.Mesh(postGeo, palette.metalDark);
    post.position.set(x, h / 2, z);
    post.castShadow = true;
    group.add(post);
  });

  // 4 Shelves
  const shelfCount = 4;
  for (let i = 0; i < shelfCount; i++) {
    const sy = 0.12 + (i * (h - 0.2)) / (shelfCount - 1);
    const shelfGeo = new THREE.BoxGeometry(w * 0.98, 0.025, d * 0.98);
    const shelf = new THREE.Mesh(shelfGeo, palette.woodOak);
    shelf.position.set(0, sy, 0);
    shelf.castShadow = true;
    group.add(shelf);

    if (i < 3) {
      const boxW = Math.min(0.38, w * 0.4);
      const boxD = Math.min(0.32, d * 0.8);
      const boxH = 0.20;
      const boxGeo = new THREE.BoxGeometry(boxW, boxH, boxD);

      const box1 = new THREE.Mesh(boxGeo, palette.woodLight);
      box1.position.set(-w * 0.22, sy + boxH / 2 + 0.01, 0);
      box1.castShadow = true;
      group.add(box1);

      if (w > 0.9) {
        const box2 = new THREE.Mesh(boxGeo, palette.woodWalnut);
        box2.position.set(w * 0.22, sy + boxH / 2 + 0.01, 0);
        box2.castShadow = true;
        group.add(box2);
      }
    }
  }
}

function buildGenericBox(group: THREE.Group, object: FloorObject, palette: MaterialPalette) {
  const boxGeo = new THREE.BoxGeometry(object.width, 0.75, object.height);
  const box = new THREE.Mesh(boxGeo, palette.woodOak);
  box.position.y = 0.75 / 2;
  box.castShadow = true;
  group.add(box);
}
