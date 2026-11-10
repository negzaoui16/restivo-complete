import { db } from "@/lib/db";
import { advisoryXactLock } from "@/lib/locks";
import { publishBlocker, type PublishFloor } from "@/lib/restaurants/publish";
import { deactivationBlocker, holdsTable } from "./active";
import { isPgForeignKeyViolation, isPgUniqueViolation } from "@/lib/auth/errors";
import { RestaurantError } from "@/lib/restaurants/errors";
import { isFloorObjectType, objectCapacity, type FloorObject } from "@/app/mainpage/restaurants/tables/_components/floor-plan/floor-object";
import {
  editorObjectFromStored,
  editorObjectFromTable,
  isTableSymbol,
  metersFromStorage,
  objectData,
  storedKind,
  storedTableKind,
  tableLabel,
} from "./map";
import type { PublicFloor } from "./types";
import type { CreateFloorBody, SaveLayoutBody, UpdateFloorBody } from "./validation";

type Orm = typeof db.orm;

export async function listFloors(restaurantId: string): Promise<PublicFloor[]> {
  const floors = await db.orm.public.Floor.where({ restaurantId }).all();
  const sorted = [...floors].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return Promise.all(sorted.map((floor) => loadFloor(db.orm, floor)));
}

export async function createFloor(
  userId: string,
  restaurantId: string,
  input: CreateFloorBody,
): Promise<PublicFloor> {
  await assertUniqueName(restaurantId, input.name);
  const existing = await db.orm.public.Floor.where({ restaurantId }).all();
  const created = await db.orm.public.Floor.create({
    restaurantId,
    name: input.name,
    level: existing.length,
    width: decimal(input.width),
    height: decimal(input.height),
    sortOrder: existing.length,
    isActive: true,
  });
  await writeAudit(userId, restaurantId, "CREATE", "Floor", created.id, { name: created.name });
  return loadFloor(db.orm, created);
}

export async function updateFloor(
  userId: string,
  restaurantId: string,
  floorId: string,
  input: UpdateFloorBody,
): Promise<PublicFloor> {
  const floor = await requireFloor(restaurantId, floorId);
  if (input.name && input.name.toLowerCase() !== floor.name.toLowerCase()) {
    await assertUniqueName(restaurantId, input.name);
  }
  await db.orm.public.Floor.where({ id: floor.id }).update({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.width !== undefined ? { width: decimal(input.width) } : {}),
    ...(input.height !== undefined ? { height: decimal(input.height) } : {}),
  });
  await writeAudit(userId, restaurantId, "UPDATE", "Floor", floor.id, input);
  const updated = await requireFloor(restaurantId, floor.id);
  return loadFloor(db.orm, updated);
}

export async function deleteFloor(userId: string, restaurantId: string, floorId: string): Promise<PublicFloor[]> {
  const floor = await requireFloor(restaurantId, floorId);
  const tables = await db.orm.public.Table.where({ floorId: floor.id }).all();
  await assertTablesAreFree(tables.map((table) => table.id));
  await db.orm.public.Floor.where({ id: floor.id }).delete();
  await writeAudit(userId, restaurantId, "DELETE", "Floor", floor.id, { name: floor.name });
  return listFloors(restaurantId);
}

export async function duplicateFloor(userId: string, restaurantId: string, floorId: string): Promise<PublicFloor> {
  const source = await requireFloor(restaurantId, floorId);
  const loaded = await loadFloor(db.orm, source);
  const copy = await createFloor(userId, restaurantId, {
    name: await copyName(restaurantId, source.name),
    width: loaded.width,
    height: loaded.height,
  });
  return saveLayout(userId, restaurantId, copy.id, {
    objects: loaded.objects.map(withNewId),
    publish: source.isActive,
  });
}

/**
 * Switches a floor on or off. A floor that holds an upcoming or current reservation
 * on one of its tables stays on, and so does the last floor that keeps a published
 * restaurant bookable. The tables are locked in a fixed order (as bookings lock them)
 * so a booking cannot slip in between the check and the update.
 */
export async function setFloorActive(
  userId: string,
  restaurantId: string,
  floorId: string,
  isActive: boolean,
): Promise<PublicFloor[]> {
  const floor = await requireFloor(restaurantId, floorId);
  if (floor.isActive === isActive) return listFloors(restaurantId);

  await db.transaction(async (tx) => {
    if (!isActive) {
      const tables = await tx.orm.public.Table.where({ floorId: floor.id }).all();
      for (const id of tables.map((table) => table.id).sort()) {
        await advisoryXactLock(tx, `reservation-table:${id}`);
      }

      const nowMs = Date.now();
      let holding = 0;
      for (const table of tables) {
        const rows = await tx.orm.public.Reservation.where({ tableId: table.id }).all();
        holding += rows.filter((row) => holdsTable(row.status, Date.parse(String(row.endsAt)), nowMs)).length;
      }

      const restaurant = await tx.orm.public.Restaurant.where({ id: restaurantId }).first();
      const others = (await tx.orm.public.Floor.where({ restaurantId }).all()).filter((other) => other.id !== floor.id);
      const summary: PublishFloor[] = [];
      for (const other of others) {
        const active = await tx.orm.public.Table.where({ floorId: other.id, isActive: true }).all();
        summary.push({ isActive: other.isActive, activeTableCount: active.length });
      }

      const blocker = deactivationBlocker({
        restaurantStatus: restaurant?.status ?? "DRAFT",
        holdingReservations: holding,
        othersKeepItPublishable: publishBlocker(summary) === null,
      });
      if (blocker === "HAS_RESERVATIONS") {
        throw new RestaurantError(
          "FLOOR_HAS_RESERVATIONS",
          `${holding} upcoming or current ${holding === 1 ? "reservation is" : "reservations are"} on this floor. Move or cancel ${holding === 1 ? "it" : "them"} first.`,
        );
      }
      if (blocker === "LAST_ACTIVE_FLOOR") throw new RestaurantError("LAST_ACTIVE_FLOOR");
    }

    await tx.orm.public.Floor.where({ id: floor.id }).update({ isActive });
    await tx.orm.public.AuditLog.create({
      userId,
      restaurantId,
      action: "STATUS_CHANGE",
      entityType: "Floor",
      entityId: floor.id,
      metadata: { name: floor.name, isActive },
    });
  });

  return listFloors(restaurantId);
}

export async function reorderFloor(userId: string, restaurantId: string, floorId: string): Promise<PublicFloor[]> {
  const floors = await listFloors(restaurantId);
  const index = floors.findIndex((floor) => floor.id === floorId);
  const next = floors[index + 1];
  if (index < 0 || !next) return floors;

  await db.orm.public.Floor.where({ id: floors[index].id }).update({ sortOrder: next.sortOrder });
  await db.orm.public.Floor.where({ id: next.id }).update({ sortOrder: floors[index].sortOrder });
  await writeAudit(userId, restaurantId, "UPDATE", "Floor", floorId, { reorder: true });
  return listFloors(restaurantId);
}

export async function saveLayout(
  userId: string,
  restaurantId: string,
  floorId: string,
  input: SaveLayoutBody,
): Promise<PublicFloor> {
  const floor = await requireFloor(restaurantId, floorId);
  const objects = input.objects.map(asEditorObject);
  const seating = objects.filter((object) => isTableSymbol(object.type));

  try {
    await db.transaction(async (tx) => {
      await replaceLayout(tx.orm, floor.id, objects, seating);
      if (input.publish) {
        await tx.orm.public.Floor.where({ id: floor.id }).update({ isActive: true });
      }
    });
  } catch (err) {
    if (err instanceof RestaurantError) throw err;
    if (isPgUniqueViolation(err)) {
      throw new RestaurantError("CONFLICT", "Two tables on this floor share the same name.");
    }
    if (isForeignKeyViolation(err)) {
      throw new RestaurantError("CONFLICT", "A table with reservations cannot be removed.");
    }
    throw err;
  }

  await writeAudit(userId, restaurantId, input.publish ? "STATUS_CHANGE" : "UPDATE", "Floor", floor.id, {
    objects: objects.length,
    publish: Boolean(input.publish),
  });
  const updated = await requireFloor(restaurantId, floor.id);
  return loadFloor(db.orm, updated);
}

async function replaceLayout(orm: Orm, floorId: string, objects: FloorObject[], seating: FloorObject[]) {
  const currentTables = await orm.public.Table.where({ floorId }).all();
  const kept = new Set(seating.map((object) => object.id));
  const removed = currentTables.filter((table) => !kept.has(table.id));
  await assertTablesAreFree(removed.map((table) => table.id), orm);

  const storedObjects = await orm.public.FloorObject.where({ floorId }).all();
  for (const row of storedObjects) {
    await orm.public.FloorObject.where({ id: row.id }).delete();
  }
  for (const table of removed) {
    await orm.public.Table.where({ id: table.id }).delete();
  }

  const names = new Set<string>();
  for (const [index, object] of seating.entries()) {
    const payload = tablePayload(floorId, object, index, names);
    const existing = currentTables.find((table) => table.id === object.id);
    if (existing) {
      await orm.public.Table.where({ id: object.id }).update(payload);
    } else {
      await orm.public.Table.create({ id: object.id, ...payload });
    }
  }

  for (const object of objects) {
    await orm.public.FloorObject.create({
      id: object.id,
      floorId,
      type: storedKind(object.type),
      name: readLabel(object),
      x: decimal(object.x),
      y: decimal(object.y),
      width: decimal(object.width),
      height: decimal(object.height),
      rotation: decimal(object.rotation),
      scaleX: "1",
      scaleY: "1",
      zIndex: object.zIndex,
      isVisible: !object.locked,
      data: JSON.parse(JSON.stringify(objectData(object))),
    });
  }
}

function tablePayload(floorId: string, object: FloorObject, index: number, names: Set<string>) {
  const name = uniqueName(tableLabel(object, index), names);
  return {
    floorId,
    name,
    number: index + 1,
    type: storedTableKind(object.type),
    capacity: Math.max(1, Math.round(objectCapacity(object) ?? 1)),
    minCapacity: null,
    x: decimal(object.x),
    y: decimal(object.y),
    width: decimal(object.width),
    height: decimal(object.height),
    rotation: decimal(object.rotation),
    isActive: true,
  };
}

async function loadFloor(orm: Orm, floor: {
  id: string;
  restaurantId: string;
  name: string;
  level: number;
  width: unknown;
  height: unknown;
  sortOrder: number;
  isActive: boolean;
}): Promise<PublicFloor> {
  const [storedObjects, tables] = await Promise.all([
    orm.public.FloorObject.where({ floorId: floor.id }).all(),
    orm.public.Table.where({ floorId: floor.id }).all(),
  ]);
  const fromObjects = storedObjects
    .map(editorObjectFromStored)
    .filter((object): object is FloorObject => object !== null)
    .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
  const objects = fromObjects.length > 0 ? fromObjects : tables.map(editorObjectFromTable);
  const seating = objects.filter((object) => isTableSymbol(object.type));

  return {
    id: floor.id,
    restaurantId: floor.restaurantId,
    name: floor.name,
    level: floor.level,
    width: metersFromStorage(floor.width),
    height: metersFromStorage(floor.height),
    sortOrder: floor.sortOrder,
    isActive: floor.isActive,
    objects,
    tableCount: seating.length,
    seatCount: seating.reduce((sum, object) => sum + (objectCapacity(object) ?? 0), 0),
  };
}

async function requireFloor(restaurantId: string, floorId: string) {
  const floor = await db.orm.public.Floor.where({ id: floorId }).first();
  if (!floor || floor.restaurantId !== restaurantId) {
    throw new RestaurantError("NOT_FOUND", "Floor not found.");
  }
  return floor;
}

async function assertUniqueName(restaurantId: string, name: string) {
  const floors = await db.orm.public.Floor.where({ restaurantId }).all();
  const taken = floors.some((floor) => floor.name.toLowerCase() === name.toLowerCase());
  if (taken) throw new RestaurantError("CONFLICT", "This restaurant already has a floor with that name.");
}

async function copyName(restaurantId: string, name: string) {
  const base = `${name} copy`.slice(0, 60);
  const floors = await db.orm.public.Floor.where({ restaurantId }).all();
  const names = new Set(floors.map((floor) => floor.name.toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  let index = 2;
  while (names.has(`${base} ${index}`.toLowerCase())) index += 1;
  return `${base} ${index}`;
}

async function assertTablesAreFree(tableIds: string[], orm: Orm = db.orm) {
  for (const tableId of tableIds) {
    const reservation = await orm.public.Reservation.where({ tableId }).first();
    if (reservation) {
      throw new RestaurantError("CONFLICT", "A table with reservations cannot be removed.");
    }
  }
}

async function writeAudit(
  userId: string,
  restaurantId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE",
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) {
  await db.orm.public.AuditLog.create({
    userId,
    restaurantId,
    action,
    entityType,
    entityId,
    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
  });
}

function asEditorObject(object: SaveLayoutBody["objects"][number]): FloorObject {
  if (!isFloorObjectType(object.type)) {
    throw new RestaurantError("VALIDATION_ERROR", "Unknown floor object.");
  }
  return { ...object, type: object.type };
}

function withNewId(object: FloorObject): FloorObject {
  return { ...object, id: crypto.randomUUID() };
}

function uniqueName(preferred: string, used: Set<string>) {
  const base = preferred.trim() || "Table";
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let index = 2;
  while (used.has(`${base} ${index}`)) index += 1;
  const name = `${base} ${index}`;
  used.add(name);
  return name;
}

function readLabel(object: FloorObject) {
  const label = object.metadata?.label;
  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function decimal(value: number) {
  return String(Math.round(value * 100) / 100);
}

function isForeignKeyViolation(err: unknown) {
  return isPgForeignKeyViolation(err);
}
