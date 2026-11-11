import "temporal-polyfill/full/global";
import mongoose, { type Model } from "mongoose";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as models from "./models/index.ts";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  (process.env.DATABASE_URL?.startsWith("mongodb") ? process.env.DATABASE_URL : "") ||
  "mongodb://127.0.0.1:27017/restivo";

interface MongoGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  status: "connected" | "disconnected" | "checking";
  lastCheck: number;
}

const globalForMongo = globalThis as unknown as { __mongo: MongoGlobal | undefined };

if (!globalForMongo.__mongo) {
  globalForMongo.__mongo = { conn: null, promise: null, status: "checking", lastCheck: 0 };
}

export async function connectMongo(): Promise<typeof mongoose> {
  const cached = globalForMongo.__mongo!;

  if (cached.conn && mongoose.connection.readyState === 1) {
    cached.status = "connected";
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      cached.conn = m;
      cached.status = "connected";
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    cached.status = "connected";
  } catch (e) {
    cached.promise = null;
    cached.status = "disconnected";
    cached.lastCheck = Date.now();
    console.error("[MongoDB] Connection error:", e);
    throw e;
  }

  return cached.conn;
}

export async function isMongoConnected(): Promise<boolean> {
  const cached = globalForMongo.__mongo!;

  if (cached.status === "connected" && mongoose.connection.readyState === 1) {
    return true;
  }

  // Si Mongo est déconnecté, attendre 5 secondes avant de réessayer
  if (cached.status === "disconnected" && Date.now() - (cached.lastCheck || 0) < 5000) {
    return false;
  }

  try {
    cached.lastCheck = Date.now();
    await connectMongo();
    cached.status = "connected";
    return true;
  } catch (e) {
    cached.status = "disconnected";
    cached.lastCheck = Date.now();
    return false;
  }
}

// --------------------------------------------------------------------------
// Local JSON Storage Engine (High-speed zero-latency fallback)
// --------------------------------------------------------------------------
const DB_JSON_PATH = path.join(process.cwd(), "data", "db.json");

let cachedDbJson: { mtime: number; data: Record<string, any[]> } | null = null;

function loadDbJson(): Record<string, any[]> {
  try {
    if (!fs.existsSync(DB_JSON_PATH)) return {};
    const stat = fs.statSync(DB_JSON_PATH);
    if (cachedDbJson && cachedDbJson.mtime === stat.mtimeMs) {
      return cachedDbJson.data;
    }
    const content = fs.readFileSync(DB_JSON_PATH, "utf-8");
    const parsed = JSON.parse(content);
    cachedDbJson = { mtime: stat.mtimeMs, data: parsed };
    return parsed;
  } catch (e) {
    return cachedDbJson?.data || {};
  }
}

function getJsonTable(tableName: string): any[] {
  const current = loadDbJson();
  return current[tableName] || [];
}

function saveJsonTable(tableName: string, rows: any[]): void {
  try {
    const current = loadDbJson();
    current[tableName] = rows;
    fs.writeFileSync(DB_JSON_PATH, JSON.stringify(current, null, 2), "utf-8");
    const stat = fs.statSync(DB_JSON_PATH);
    cachedDbJson = { mtime: stat.mtimeMs, data: current };
  } catch (e) {
    // In-memory fallback if filesystem is read-only (Vercel)
    if (!cachedDbJson) {
      cachedDbJson = { mtime: Date.now(), data: loadDbJson() };
    }
    cachedDbJson.data[tableName] = rows;
  }
}

function isTemporal(val: any): boolean {
  if (!val || typeof val !== "object") return false;
  const tag = (val as any)[Symbol.toStringTag];
  if (typeof tag === "string" && tag.startsWith("Temporal.")) return true;
  if (typeof (val as any).epochMilliseconds === "number") return true;
  if (typeof (val as any).epochNanoseconds === "bigint") return true;
  const name = val.constructor?.name;
  if (
    name === "Instant" ||
    name === "PlainDate" ||
    name === "PlainDateTime" ||
    name === "ZonedDateTime" ||
    name === "Duration"
  ) {
    return true;
  }
  return false;
}

function normalizeInput(input: any): any {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(normalizeInput);

  if (isTemporal(input)) {
    if (typeof input.epochMilliseconds === "number") {
      return new Date(input.epochMilliseconds);
    }
    return new Date(input.toString());
  }

  if (input instanceof Date) return input;

  if (typeof input === "object") {
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(input)) {
      if (val === undefined) continue;
      res[key] = normalizeInput(val);
    }
    return res;
  }

  return input;
}

function normalizeFilter(filter: Record<string, any>): Record<string, any> {
  if (!filter || typeof filter !== "object") return {};
  const res: Record<string, any> = {};

  for (const [key, val] of Object.entries(filter)) {
    if (val === undefined) continue;
    if (key === "id") {
      res.$or = [{ id: val }, { _id: val }];
    } else {
      res[key] = normalizeInput(val);
    }
  }

  return res;
}

function serializeDoc<T = any>(doc: any): T {
  if (doc === null || doc === undefined) return doc;
  if (Array.isArray(doc)) return doc.map(serializeDoc) as unknown as T;

  if (doc instanceof Date) {
    return doc.toISOString() as unknown as T;
  }

  if (typeof doc !== "object") return doc;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === "__v") continue;
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value.map(serializeDoc);
    } else if (
      value !== null &&
      typeof value === "object" &&
      typeof (value as any).getMonth === "function"
    ) {
      result[key] = (value as Date).toISOString();
    } else if (value !== null && typeof value === "object") {
      result[key] = serializeDoc(value);
    } else {
      result[key] = value;
    }
  }

  if (!result.id && result._id) {
    result.id = String(result._id);
  }

  return result as T;
}

export class ModelAdapter<T = any> {
  private model: Model<any>;
  private tableName: string;

  constructor(model: Model<any>, tableName: string) {
    this.model = model;
    this.tableName = tableName;
  }

  async create(data: any): Promise<T> {
    const id = data.id || randomUUID();
    const payload = normalizeInput({
      ...data,
      id,
      _id: id,
    });

    const isConnected = await isMongoConnected();
    if (isConnected) {
      try {
        const created = await this.model.create(payload);
        const obj = created.toObject ? created.toObject() : created;
        return serializeDoc<T>(obj);
      } catch (e) {
        console.error(`[ModelAdapter: ${this.tableName}] Mongo create error:`, e);
      }
    } else {
      console.warn(`[ModelAdapter: ${this.tableName}] Mongo not connected during create.`);
    }

    const rows = getJsonTable(this.tableName);
    const serialized = serializeDoc<T>(payload);
    rows.push(serialized);
    saveJsonTable(this.tableName, rows);
    return serialized;
  }

  async all(): Promise<T[]> {
    return this.where({}).all();
  }

  async first(): Promise<T | null> {
    return this.where({}).first();
  }

  where(filter: Record<string, any>) {
    const mongoFilter = normalizeFilter(filter);
    const model = this.model;
    const tableName = this.tableName;

    const matchesFilter = (item: any): boolean => {
      for (const [k, v] of Object.entries(filter)) {
        if (v === undefined) continue;
        if (k === "id") {
          if (item.id !== v && item._id !== v) return false;
        } else if (k === "slug") {
          if (item.slug !== v) return false;
        } else if (k === "email") {
          if ((item.email || "").toLowerCase() !== String(v).toLowerCase()) return false;
        } else if (typeof v === "object" && v !== null && "$in" in v) {
          if (!Array.isArray(v.$in) || !v.$in.includes(item[k])) return false;
        } else if (item[k] !== v) {
          return false;
        }
      }
      return true;
    };

    return {
      first: async (): Promise<T | null> => {
        const isConnected = await isMongoConnected();
        if (isConnected) {
          try {
            const doc = await model.findOne(mongoFilter).lean().exec();
            if (doc) return serializeDoc<T>(doc);
          } catch (e) {
            // fallback
          }
        }
        const rows = getJsonTable(tableName);
        const match = rows.find(matchesFilter);
        return match ? serializeDoc<T>(match) : null;
      },
      all: async (): Promise<T[]> => {
        const isConnected = await isMongoConnected();
        if (isConnected) {
          try {
            const docs = await model.find(mongoFilter).lean().exec();
            if (docs && docs.length > 0) return docs.map((d) => serializeDoc<T>(d));
          } catch (e) {
            // fallback
          }
        }
        const rows = getJsonTable(tableName);
        const matches = rows.filter(matchesFilter);
        return matches.map((d) => serializeDoc<T>(d));
      },
      update: async (changes: any): Promise<T | null> => {
        const payload = normalizeInput(changes);
        const isConnected = await isMongoConnected();
        if (isConnected) {
          try {
            const updated = await model
              .findOneAndUpdate(mongoFilter, { $set: payload }, { returnDocument: "after" })
              .lean()
              .exec();
            await model.updateMany(mongoFilter, { $set: payload }).exec();
            if (updated) return serializeDoc<T>(updated);
          } catch (e) {
            // fallback
          }
        }
        const rows = getJsonTable(tableName);
        let updatedItem: any = null;
        for (let i = 0; i < rows.length; i++) {
          if (matchesFilter(rows[i])) {
            rows[i] = { ...rows[i], ...payload, updatedAt: new Date().toISOString() };
            if (!updatedItem) updatedItem = rows[i];
          }
        }
        if (updatedItem) {
          saveJsonTable(tableName, rows);
        }
        return updatedItem ? serializeDoc<T>(updatedItem) : null;
      },
      delete: async (): Promise<{ deletedCount?: number }> => {
        const isConnected = await isMongoConnected();
        if (isConnected) {
          try {
            const res = await model.deleteMany(mongoFilter).exec();
            return { deletedCount: res.deletedCount };
          } catch (e) {
            // fallback
          }
        }
        const rows = getJsonTable(tableName);
        const initialLen = rows.length;
        const kept = rows.filter((r) => !matchesFilter(r));
        saveJsonTable(tableName, kept);
        return { deletedCount: initialLen - kept.length };
      },
    };
  }
}

const ormPublic = {
  User: new ModelAdapter(models.User, "User"),
  Profile: new ModelAdapter(models.Profile, "Profile"),
  Restaurant: new ModelAdapter(models.Restaurant, "Restaurant"),
  RestaurantMembership: new ModelAdapter(models.RestaurantMembership, "RestaurantMembership"),
  RestaurantMembershipRequest: new ModelAdapter(models.RestaurantMembershipRequest, "RestaurantMembershipRequest"),
  BusinessHours: new ModelAdapter(models.BusinessHours, "BusinessHours"),
  Floor: new ModelAdapter(models.Floor, "Floor"),
  Table: new ModelAdapter(models.Table, "Table"),
  FloorObject: new ModelAdapter(models.FloorObject, "FloorObject"),
  Menu: new ModelAdapter(models.Menu, "Menu"),
  MenuCategory: new ModelAdapter(models.MenuCategory, "MenuCategory"),
  MenuItem: new ModelAdapter(models.MenuItem, "MenuItem"),
  Promotion: new ModelAdapter(models.Promotion, "Promotion"),
  PromotionItem: new ModelAdapter(models.PromotionItem, "PromotionItem"),
  Reservation: new ModelAdapter(models.Reservation, "Reservation"),
  Order: new ModelAdapter(models.Order, "Order"),
  OrderItem: new ModelAdapter(models.OrderItem, "OrderItem"),
  Review: new ModelAdapter(models.Review, "Review"),
  Favorite: new ModelAdapter(models.Favorite, "Favorite"),
  Notification: new ModelAdapter(models.Notification, "Notification"),
  Media: new ModelAdapter(models.Media, "Media"),
  AuditLog: new ModelAdapter(models.AuditLog, "AuditLog"),
};

export const db = {
  orm: {
    public: ormPublic,
  },
  transaction: async <R>(fn: (tx: any) => Promise<R>): Promise<R> => {
    return fn(db);
  },
  close: async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  },
  models,
  mongoose,
};

export * from "./models/index.ts";
