import { Temporal } from "temporal-polyfill";
import { AuthError } from "@/lib/auth/errors";
import { createNotificationIn } from "@/lib/notifications/service";
import { ROLE_CHANGE_MESSAGES, roleChangeIssue } from "./roles";
import { db } from "@/lib/db";
import { RestaurantError } from "@/lib/restaurants/errors";
import type { RestaurantRoster, RosterMember, RosterRequest, RosterReview } from "./types";

type ProfileRow = {
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
};

type MembershipRow = {
  id: string;
  userId: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REMOVED";
  joinedAt: { toString?: () => string } | string | null;
  createdAt: { toString?: () => string } | string | null;
};

type RequestRow = {
  id: string;
  userId: string;
  status: string;
  message: string | null;
  createdAt: { toString?: () => string } | string | null;
};

function personName(profile: ProfileRow | null): string {
  const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  return full || profile?.displayName?.trim() || "Staff member";
}

function instantToString(value: { toString?: () => string } | string | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : (value.toString?.() ?? null);
}

async function namesFor(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds)];
  const profiles = await Promise.all(
    ids.map((userId) => db.orm.public.Profile.where({ userId }).first())
  );
  return new Map(ids.map((id, index) => [id, personName(profiles[index] ?? null)]));
}

function toMember(row: MembershipRow, name: string): RosterMember {
  return {
    id: row.id,
    userId: row.userId,
    name,
    role: row.role === "MANAGER" ? "MANAGER" : "STAFF",
    since: instantToString(row.joinedAt ?? row.createdAt),
  };
}

export async function loadRoster(restaurantId: string): Promise<RestaurantRoster> {
  const [team, requests] = await Promise.all([
    db.orm.public.RestaurantMembership.where({ restaurantId, status: "ACTIVE" }).all(),
    db.orm.public.RestaurantMembershipRequest.where({
      restaurantId,
      status: "PENDING",
    }).all(),
  ]);

  // The owner is not listed: only staff and the managers they named.
  const memberships = team.filter((row) => row.role === "STAFF" || row.role === "MANAGER");
  const names = await namesFor([
    ...memberships.map((row) => row.userId),
    ...requests.map((row) => row.userId),
  ]);

  return {
    members: memberships
      .map((row) => toMember(row, names.get(row.userId) ?? "Staff member"))
      .sort((a, b) => a.name.localeCompare(b.name)),
    requests: requests
      .map((row) => toRequest(row, names.get(row.userId) ?? "Staff member"))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
  };
}

function toRequest(row: RequestRow, name: string): RosterRequest {
  return {
    id: row.id,
    userId: row.userId,
    name,
    message: row.message,
    sentAt: instantToString(row.createdAt) ?? new Date(0).toISOString(),
  };
}

export async function reviewJoinRequest(
  reviewerId: string,
  restaurantId: string,
  requestId: string,
  decision: "ACCEPT" | "DECLINE"
): Promise<RosterReview> {
  const request = await pendingRequest(restaurantId, requestId);
  if (decision === "DECLINE") {
    await declineRequest(reviewerId, restaurantId, request);
    return { requestId, status: "DECLINED", member: null };
  }

  const member = await acceptRequest(reviewerId, restaurantId, request);
  return { requestId, status: "ACCEPTED", member };
}

async function pendingRequest(restaurantId: string, requestId: string): Promise<RequestRow> {
  const request = await db.orm.public.RestaurantMembershipRequest.where({
    id: requestId,
    restaurantId,
  }).first();
  if (!request) {
    throw new RestaurantError("NOT_FOUND", "That request is not for this restaurant.");
  }
  if (request.status !== "PENDING") {
    throw new RestaurantError("CONFLICT", "This request was already reviewed.");
  }
  return request;
}

async function declineRequest(reviewerId: string, restaurantId: string, request: RequestRow) {
  const reviewedAt = Temporal.Now.instant();
  await db.transaction(async (tx) => {
    await assertStillPending(tx, restaurantId, request.id);
    await tx.orm.public.RestaurantMembershipRequest.where({ id: request.id }).update({
      status: "DECLINED",
      reviewedById: reviewerId,
      reviewedAt,
    });
    await tx.orm.public.AuditLog.create({
      userId: reviewerId,
      restaurantId,
      action: "DECLINE",
      entityType: "RestaurantMembershipRequest",
      entityId: request.id,
      metadata: { applicantId: request.userId },
    });
  });
}

async function acceptRequest(
  reviewerId: string,
  restaurantId: string,
  request: RequestRow
): Promise<RosterMember> {
  const [profile, restaurant] = await Promise.all([
    db.orm.public.Profile.where({ userId: request.userId }).first(),
    db.orm.public.Restaurant.where({ id: restaurantId }).first(),
  ]);
  if (restaurant?.ownerId === request.userId) {
    throw new RestaurantError("CONFLICT", "The owner already belongs to this restaurant.");
  }

  const reviewedAt = Temporal.Now.instant();
  const membership = await db.transaction(async (tx) => {
    await assertStillPending(tx, restaurantId, request.id);
    const saved = await placeOnTeam(tx, request.userId, restaurantId, reviewedAt);
    await tx.orm.public.RestaurantMembershipRequest.where({ id: request.id }).update({
      status: "ACCEPTED",
      reviewedById: reviewerId,
      reviewedAt,
    });
    await tx.orm.public.AuditLog.create({
      userId: reviewerId,
      restaurantId,
      action: "ACCEPT",
      entityType: "RestaurantMembershipRequest",
      entityId: request.id,
      metadata: { applicantId: request.userId, membershipId: saved.id },
    });
    return saved;
  });

  return toMember(membership, personName(profile ?? null));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertStillPending(tx: Tx, restaurantId: string, requestId: string) {
  const fresh = await tx.orm.public.RestaurantMembershipRequest.where({
    id: requestId,
    restaurantId,
  }).first();
  if (!fresh || fresh.status !== "PENDING") {
    throw new RestaurantError("CONFLICT", "This request was already reviewed.");
  }
}

async function placeOnTeam(tx: Tx, userId: string, restaurantId: string, joinedAt: Temporal.Instant) {
  const existing = await tx.orm.public.RestaurantMembership.where({ userId, restaurantId }).first();
  if (existing?.status === "ACTIVE" && existing.role !== "STAFF") {
    throw new RestaurantError("CONFLICT", "This person already manages the restaurant.");
  }
  if (existing?.status === "ACTIVE" && existing.role === "STAFF") return existing;

  if (existing) {
    await tx.orm.public.RestaurantMembership.where({ id: existing.id }).update({
      role: "STAFF",
      status: "ACTIVE",
      joinedAt: existing.joinedAt ?? joinedAt,
    });
    return { ...existing, role: "STAFF" as const, status: "ACTIVE" as const, joinedAt: existing.joinedAt ?? joinedAt };
  }

  return tx.orm.public.RestaurantMembership.create({
    userId,
    restaurantId,
    role: "STAFF",
    status: "ACTIVE",
    joinedAt,
  });
}

/**
 * The owner names a staff member manager, or takes the manager role back. The change, its
 * audit entry and the notification to that person share one transaction; the rules are in
 * `roles.ts`. Whether the person can manage restaurants follows from the membership, which
 * access checks read from the database on every request.
 */
export async function changeTeamRole(
  actor: { id: string; role: string },
  restaurantId: string,
  membershipId: string,
  newRole: string
): Promise<RosterMember> {
  const target = await db.orm.public.RestaurantMembership.where({ id: membershipId }).first();
  // A membership of another restaurant looks exactly like a missing one.
  if (!target || target.restaurantId !== restaurantId) {
    throw new RestaurantError("NOT_FOUND", "That team member was not found.");
  }

  const [profile, restaurant] = await Promise.all([
    db.orm.public.Profile.where({ userId: target.userId }).first(),
    db.orm.public.Restaurant.where({ id: restaurantId }).first(),
  ]);

  await db.transaction(async (tx) => {
    const fresh = await tx.orm.public.RestaurantMembership.where({ id: membershipId }).first();
    if (!fresh || fresh.restaurantId !== restaurantId) {
      throw new RestaurantError("NOT_FOUND", "That team member was not found.");
    }

    const issue = roleChangeIssue({
      actorRole: actor.role,
      actorId: actor.id,
      targetId: fresh.userId,
      targetRole: fresh.role,
      targetStatus: fresh.status,
      newRole,
    });
    if (issue === "NOT_OWNER" || issue === "TARGET_IS_OWNER" || issue === "SELF") {
      throw new AuthError("FORBIDDEN", ROLE_CHANGE_MESSAGES[issue]);
    }
    if (issue === "INVALID_ROLE") throw new RestaurantError("VALIDATION_ERROR", ROLE_CHANGE_MESSAGES[issue], "role");
    if (issue) throw new RestaurantError("CONFLICT", ROLE_CHANGE_MESSAGES[issue]);

    await tx.orm.public.RestaurantMembership.where({ id: membershipId }).update({ role: newRole as "MANAGER" | "STAFF" });
    await tx.orm.public.AuditLog.create({
      userId: actor.id,
      restaurantId,
      action: "UPDATE",
      entityType: "RestaurantMembership",
      entityId: membershipId,
      metadata: { memberId: fresh.userId, from: fresh.role, to: newRole },
    });

    const venue = restaurant?.name ?? "the restaurant";
    await createNotificationIn(tx, {
      userId: fresh.userId,
      restaurantId,
      type: "STAFF_REQUEST",
      title: newRole === "MANAGER" ? "You are now a manager" : "Your role changed",
      message:
        newRole === "MANAGER"
          ? `The owner of ${venue} made you a manager. You can now manage reservations, orders and the menu.`
          : `The owner of ${venue} changed your role back to staff.`,
      data: { restaurantId, role: newRole },
    });
  });

  const saved = await db.orm.public.RestaurantMembership.where({ id: membershipId }).first();
  if (!saved) throw new RestaurantError("INTERNAL_ERROR");
  return toMember(saved, personName(profile ?? null));
}
