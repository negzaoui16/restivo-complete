/**
 * Who may change a team member's role, as pure rules (no imports, so node:test runs them).
 * Only the owner of a restaurant promotes a staff member to manager or takes the role away.
 */

export type TeamRole = "OWNER" | "MANAGER" | "STAFF";

export type RoleChangeIssue =
  | "NOT_OWNER"
  | "INVALID_ROLE"
  | "TARGET_IS_OWNER"
  | "SELF"
  | "NOT_ACTIVE"
  | "SAME_ROLE";

export const ROLE_CHANGE_MESSAGES: Record<RoleChangeIssue, string> = {
  NOT_OWNER: "Only the owner can change roles.",
  INVALID_ROLE: "Choose MANAGER or STAFF.",
  TARGET_IS_OWNER: "The owner's role cannot be changed.",
  SELF: "You cannot change your own role.",
  NOT_ACTIVE: "Only active team members can change role.",
  SAME_ROLE: "This person already has that role.",
};

export function roleChangeIssue(input: {
  actorRole: string;
  actorId: string;
  targetId: string;
  targetRole: string;
  targetStatus: string;
  newRole: string;
}): RoleChangeIssue | null {
  if (input.actorRole !== "OWNER") return "NOT_OWNER";
  if (input.newRole !== "MANAGER" && input.newRole !== "STAFF") return "INVALID_ROLE";
  if (input.targetRole === "OWNER") return "TARGET_IS_OWNER";
  if (input.actorId === input.targetId) return "SELF";
  if (input.targetStatus !== "ACTIVE") return "NOT_ACTIVE";
  if (input.targetRole === input.newRole) return "SAME_ROLE";
  return null;
}
