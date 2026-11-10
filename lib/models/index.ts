import mongoose, { Schema, type Model } from "mongoose";
import { randomUUID } from "node:crypto";

function getOrCreateModel<T>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

// --------------------------------------------------------------------------
// USER
// --------------------------------------------------------------------------
const UserSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    emailVerifiedAt: { type: Date, default: null },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED", "DELETED"], default: "ACTIVE" },
    managementRole: { type: String, enum: ["OWNER", "MANAGER", "STAFF", null], default: null },
  },
  { timestamps: true }
);
UserSchema.index({ status: 1 });
UserSchema.index({ managementRole: 1 });

// --------------------------------------------------------------------------
// PROFILE
// --------------------------------------------------------------------------
const ProfileSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, unique: true },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    displayName: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    phone: { type: String, default: null },
    bio: { type: String, default: null },
  },
  { timestamps: true }
);

// --------------------------------------------------------------------------
// RESTAURANT
// --------------------------------------------------------------------------
const RestaurantSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    ownerId: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    logoUrl: { type: String, default: null },
    coverUrl: { type: String, default: null },
    cuisine: { type: String, default: null },
    priceLevel: { type: Number, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    website: { type: String, default: null },
    address: { type: String, default: null },
    city: { type: String, default: null },
    country: { type: String, default: null },
    postalCode: { type: String, default: null },
    latitude: { type: Schema.Types.Mixed, default: null },
    longitude: { type: Schema.Types.Mixed, default: null },
    currency: { type: String, default: "TND" },
    timezone: { type: String, default: "UTC" },
    status: { type: String, enum: ["DRAFT", "ACTIVE", "SUSPENDED", "ARCHIVED"], default: "DRAFT" },
  },
  { timestamps: true }
);
RestaurantSchema.index({ ownerId: 1 });
RestaurantSchema.index({ status: 1 });
RestaurantSchema.index({ city: 1 });
RestaurantSchema.index({ country: 1 });

// --------------------------------------------------------------------------
// RESTAURANT MEMBERSHIP
// --------------------------------------------------------------------------
const RestaurantMembershipSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true },
    restaurantId: { type: String, required: true },
    role: { type: String, enum: ["OWNER", "MANAGER", "STAFF"], required: true },
    status: { type: String, enum: ["PENDING", "ACTIVE", "SUSPENDED", "REMOVED"], default: "PENDING" },
    joinedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
RestaurantMembershipSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });
RestaurantMembershipSchema.index({ restaurantId: 1, role: 1 });
RestaurantMembershipSchema.index({ restaurantId: 1, status: 1 });
RestaurantMembershipSchema.index({ userId: 1, status: 1 });

// --------------------------------------------------------------------------
// RESTAURANT MEMBERSHIP REQUEST
// --------------------------------------------------------------------------
const RestaurantMembershipRequestSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true },
    restaurantId: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "DECLINED", "CANCELLED"], default: "PENDING" },
    message: { type: String, default: null },
    reviewedById: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
RestaurantMembershipRequestSchema.index({ restaurantId: 1, status: 1 });
RestaurantMembershipRequestSchema.index({ userId: 1, status: 1 });

// --------------------------------------------------------------------------
// BUSINESS HOURS
// --------------------------------------------------------------------------
const BusinessHoursSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    restaurantId: { type: String, required: true },
    dayOfWeek: { type: Number, required: true },
    isClosed: { type: Boolean, default: false },
    openTime: { type: String, default: null },
    closeTime: { type: String, default: null },
  },
  { timestamps: true }
);
BusinessHoursSchema.index({ restaurantId: 1, dayOfWeek: 1 }, { unique: true });
BusinessHoursSchema.index({ restaurantId: 1 });

// --------------------------------------------------------------------------
// FLOOR
// --------------------------------------------------------------------------
const FloorSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    restaurantId: { type: String, required: true },
    name: { type: String, required: true },
    level: { type: Number, default: 0 },
    width: { type: Schema.Types.Mixed, required: true },
    height: { type: Schema.Types.Mixed, required: true },
    backgroundImageUrl: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
FloorSchema.index({ restaurantId: 1, sortOrder: 1 });

// --------------------------------------------------------------------------
// TABLE
// --------------------------------------------------------------------------
const TableSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    floorId: { type: String, required: true },
    name: { type: String, required: true },
    number: { type: Number, default: null },
    type: { type: String, enum: ["STANDARD", "BOOTH", "BAR", "OUTDOOR", "PRIVATE", "OTHER"], default: "STANDARD" },
    capacity: { type: Number, required: true },
    minCapacity: { type: Number, default: null },
    x: { type: Schema.Types.Mixed, required: true },
    y: { type: Schema.Types.Mixed, required: true },
    width: { type: Schema.Types.Mixed, required: true },
    height: { type: Schema.Types.Mixed, required: true },
    rotation: { type: Schema.Types.Mixed, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
TableSchema.index({ floorId: 1, name: 1 }, { unique: true });
TableSchema.index({ floorId: 1 });
TableSchema.index({ floorId: 1, isActive: 1 });

// --------------------------------------------------------------------------
// FLOOR OBJECT
// --------------------------------------------------------------------------
const FloorObjectSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    floorId: { type: String, required: true },
    type: {
      type: String,
      enum: ["TABLE", "CHAIR", "BAR", "WALL", "DOOR", "WINDOW", "SOFA", "COUNTER", "DECORATION", "OTHER"],
      required: true,
    },
    name: { type: String, default: null },
    x: { type: Schema.Types.Mixed, required: true },
    y: { type: Schema.Types.Mixed, required: true },
    width: { type: Schema.Types.Mixed, required: true },
    height: { type: Schema.Types.Mixed, required: true },
    rotation: { type: Schema.Types.Mixed, default: 0 },
    scaleX: { type: Schema.Types.Mixed, default: 1 },
    scaleY: { type: Schema.Types.Mixed, default: 1 },
    zIndex: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
    data: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
FloorObjectSchema.index({ floorId: 1, zIndex: 1 });

// --------------------------------------------------------------------------
// MENU
// --------------------------------------------------------------------------
const MenuSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    restaurantId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);
MenuSchema.index({ restaurantId: 1 });
MenuSchema.index({ restaurantId: 1, isPublished: 1 });

// --------------------------------------------------------------------------
// MENU CATEGORY
// --------------------------------------------------------------------------
const MenuCategorySchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    menuId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    imageUrl: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
MenuCategorySchema.index({ menuId: 1, sortOrder: 1 });

// --------------------------------------------------------------------------
// MENU ITEM
// --------------------------------------------------------------------------
const MenuItemSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    categoryId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    imageUrl: { type: String, default: null },
    model3dUrl: { type: String, default: null },
    price: { type: Schema.Types.Mixed, required: true },
    preparationTime: { type: Number, default: null },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
MenuItemSchema.index({ categoryId: 1, sortOrder: 1 });
MenuItemSchema.index({ categoryId: 1, isAvailable: 1 });

// --------------------------------------------------------------------------
// PROMOTION
// --------------------------------------------------------------------------
const PromotionSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    restaurantId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    type: { type: String, enum: ["PERCENTAGE", "FIXED_AMOUNT"], required: true },
    value: { type: Schema.Types.Mixed, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
PromotionSchema.index({ restaurantId: 1, isActive: 1 });
PromotionSchema.index({ startsAt: 1, endsAt: 1 });

// --------------------------------------------------------------------------
// PROMOTION ITEM
// --------------------------------------------------------------------------
const PromotionItemSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    promotionId: { type: String, required: true },
    menuItemId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
PromotionItemSchema.index({ promotionId: 1, menuItemId: 1 }, { unique: true });

// --------------------------------------------------------------------------
// RESERVATION
// --------------------------------------------------------------------------
const ReservationSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    reservationCode: { type: String, required: true, unique: true },
    restaurantId: { type: String, required: true },
    customerId: { type: String, required: true },
    tableId: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    guestCount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"],
      default: "PENDING",
    },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);
ReservationSchema.index({ restaurantId: 1, startsAt: 1 });
ReservationSchema.index({ restaurantId: 1, status: 1 });
ReservationSchema.index({ customerId: 1, startsAt: 1 });
ReservationSchema.index({ tableId: 1, startsAt: 1 });

// --------------------------------------------------------------------------
// ORDER
// --------------------------------------------------------------------------
const OrderSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    restaurantId: { type: String, required: true },
    customerId: { type: String, required: true },
    reservationId: { type: String, default: null },
    tableId: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },
    notes: { type: String, default: null },
    subtotal: { type: Schema.Types.Mixed, required: true },
    discount: { type: Schema.Types.Mixed, default: 0 },
    total: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);
OrderSchema.index({ restaurantId: 1, createdAt: 1 });
OrderSchema.index({ restaurantId: 1, status: 1 });
OrderSchema.index({ customerId: 1, createdAt: 1 });
OrderSchema.index({ reservationId: 1 });
OrderSchema.index({ tableId: 1 });

// --------------------------------------------------------------------------
// ORDER ITEM
// --------------------------------------------------------------------------
const OrderItemSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    orderId: { type: String, required: true },
    menuItemId: { type: String, default: null },
    nameSnapshot: { type: String, required: true },
    priceSnapshot: { type: Schema.Types.Mixed, required: true },
    quantity: { type: Number, required: true },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);
OrderItemSchema.index({ orderId: 1 });
OrderItemSchema.index({ menuItemId: 1 });

// --------------------------------------------------------------------------
// REVIEW
// --------------------------------------------------------------------------
const ReviewSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    customerId: { type: String, required: true },
    restaurantId: { type: String, required: true },
    reservationId: { type: String, required: true, unique: true },
    rating: { type: Number, required: true },
    comment: { type: String, default: null },
    status: { type: String, enum: ["PENDING", "PUBLISHED", "HIDDEN"], default: "PENDING" },
  },
  { timestamps: true }
);
ReviewSchema.index({ restaurantId: 1, status: 1 });
ReviewSchema.index({ customerId: 1 });

// --------------------------------------------------------------------------
// FAVORITE
// --------------------------------------------------------------------------
const FavoriteSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true },
    restaurantId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
FavoriteSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });
FavoriteSchema.index({ restaurantId: 1 });

// --------------------------------------------------------------------------
// NOTIFICATION
// --------------------------------------------------------------------------
const NotificationSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true },
    restaurantId: { type: String, default: null },
    type: { type: String, enum: ["RESERVATION", "ORDER", "STAFF_REQUEST", "REVIEW", "SYSTEM"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: null },
    readAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
NotificationSchema.index({ userId: 1, readAt: 1 });
NotificationSchema.index({ restaurantId: 1, createdAt: 1 });

// --------------------------------------------------------------------------
// MEDIA
// --------------------------------------------------------------------------
const MediaSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    ownerId: { type: String, required: true },
    restaurantId: { type: String, default: null },
    url: { type: String, required: true },
    storageKey: { type: String, required: true },
    type: { type: String, enum: ["IMAGE", "VIDEO", "OTHER"], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
MediaSchema.index({ ownerId: 1 });
MediaSchema.index({ restaurantId: 1 });

// --------------------------------------------------------------------------
// AUDIT LOG
// --------------------------------------------------------------------------
const AuditLogSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    id: { type: String, default: () => randomUUID() },
    userId: { type: String, default: null },
    restaurantId: { type: String, default: null },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "ACCEPT", "DECLINE", "CANCEL", "CONFIRM", "STATUS_CHANGE"],
      required: true,
    },
    entityType: { type: String, required: true },
    entityId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
AuditLogSchema.index({ restaurantId: 1, createdAt: 1 });
AuditLogSchema.index({ userId: 1, createdAt: 1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

// Ensure id and _id consistency on all schemas
const allSchemas = [
  UserSchema,
  ProfileSchema,
  RestaurantSchema,
  RestaurantMembershipSchema,
  RestaurantMembershipRequestSchema,
  BusinessHoursSchema,
  FloorSchema,
  TableSchema,
  FloorObjectSchema,
  MenuSchema,
  MenuCategorySchema,
  MenuItemSchema,
  PromotionSchema,
  PromotionItemSchema,
  ReservationSchema,
  OrderSchema,
  OrderItemSchema,
  ReviewSchema,
  FavoriteSchema,
  NotificationSchema,
  MediaSchema,
  AuditLogSchema,
];

for (const s of allSchemas) {
  s.pre("validate", function () {
    if (!this._id && this.id) this._id = this.id;
    if (!this.id && this._id) this.id = this._id;
    if (!this._id && !this.id) {
      const generated = randomUUID();
      this._id = generated;
      this.id = generated;
    }
  });
}

export const User = getOrCreateModel("User", UserSchema);
export const Profile = getOrCreateModel("Profile", ProfileSchema);
export const Restaurant = getOrCreateModel("Restaurant", RestaurantSchema);
export const RestaurantMembership = getOrCreateModel("RestaurantMembership", RestaurantMembershipSchema);
export const RestaurantMembershipRequest = getOrCreateModel("RestaurantMembershipRequest", RestaurantMembershipRequestSchema);
export const BusinessHours = getOrCreateModel("BusinessHours", BusinessHoursSchema);
export const Floor = getOrCreateModel("Floor", FloorSchema);
export const Table = getOrCreateModel("Table", TableSchema);
export const FloorObject = getOrCreateModel("FloorObject", FloorObjectSchema);
export const Menu = getOrCreateModel("Menu", MenuSchema);
export const MenuCategory = getOrCreateModel("MenuCategory", MenuCategorySchema);
export const MenuItem = getOrCreateModel("MenuItem", MenuItemSchema);
export const Promotion = getOrCreateModel("Promotion", PromotionSchema);
export const PromotionItem = getOrCreateModel("PromotionItem", PromotionItemSchema);
export const Reservation = getOrCreateModel("Reservation", ReservationSchema);
export const Order = getOrCreateModel("Order", OrderSchema);
export const OrderItem = getOrCreateModel("OrderItem", OrderItemSchema);
export const Review = getOrCreateModel("Review", ReviewSchema);
export const Favorite = getOrCreateModel("Favorite", FavoriteSchema);
export const Notification = getOrCreateModel("Notification", NotificationSchema);
export const Media = getOrCreateModel("Media", MediaSchema);
export const AuditLog = getOrCreateModel("AuditLog", AuditLogSchema);
