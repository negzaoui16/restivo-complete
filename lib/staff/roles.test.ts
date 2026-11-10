import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { roleChangeIssue } from "./roles.ts";

const base = {
  actorRole: "OWNER",
  actorId: "owner-1",
  targetId: "staff-1",
  targetRole: "STAFF",
  targetStatus: "ACTIVE",
  newRole: "MANAGER",
};

describe("roleChangeIssue", () => {
  it("lets the owner promote an active staff member and demote a manager", () => {
    assert.equal(roleChangeIssue(base), null);
    assert.equal(roleChangeIssue({ ...base, targetRole: "MANAGER", newRole: "STAFF" }), null);
  });

  it("refuses everyone who is not the owner, managers included", () => {
    assert.equal(roleChangeIssue({ ...base, actorRole: "MANAGER" }), "NOT_OWNER");
    assert.equal(roleChangeIssue({ ...base, actorRole: "STAFF" }), "NOT_OWNER");
    assert.equal(roleChangeIssue({ ...base, actorRole: "" }), "NOT_OWNER");
  });

  it("never touches the owner, and never lets anyone change their own role", () => {
    assert.equal(roleChangeIssue({ ...base, targetRole: "OWNER", newRole: "STAFF" }), "TARGET_IS_OWNER");
    assert.equal(roleChangeIssue({ ...base, targetId: "owner-1", targetRole: "STAFF" }), "SELF");
  });

  it("accepts only MANAGER or STAFF as the new role", () => {
    assert.equal(roleChangeIssue({ ...base, newRole: "OWNER" }), "INVALID_ROLE");
    assert.equal(roleChangeIssue({ ...base, newRole: "admin" }), "INVALID_ROLE");
  });

  it("refuses people who are not active members, and a change to the same role", () => {
    for (const status of ["PENDING", "SUSPENDED", "REMOVED"]) {
      assert.equal(roleChangeIssue({ ...base, targetStatus: status }), "NOT_ACTIVE");
    }
    assert.equal(roleChangeIssue({ ...base, newRole: "STAFF" }), "SAME_ROLE");
  });

  it("reports the actor problem before anything about the target", () => {
    assert.equal(roleChangeIssue({ ...base, actorRole: "MANAGER", targetRole: "OWNER" }), "NOT_OWNER");
  });
});
