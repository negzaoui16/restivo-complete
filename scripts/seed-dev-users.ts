/**
 * Seeds development accounts (owner + customer) into MongoDB Atlas.
 *
 * Run:  node --env-file=.env --experimental-strip-types scripts/seed-dev-users.ts
 */
import "temporal-polyfill/full/global";
import { existsSync } from "node:fs";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db.ts";

if (existsSync(".env")) process.loadEnvFile(".env");

function fail(message: string): never {
  console.error(`seed-dev-users: ${message}`);
  process.exit(1);
}

// ─── Same field rules as lib/auth/validation.ts (signUpSchema) ────────────────

const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must not exceed 72 characters."),
  firstName: z.string().min(1, "First name is required.").max(80).trim(),
  lastName: z.string().min(1, "Last name is required.").max(80).trim(),
});

const SALT_ROUNDS = 12;

const ACCOUNTS = [
  {
    label: "owner",
    managementRole: "OWNER" as const,
    input: { email: "manager@restivo.test", password: "Manager2026!", firstName: "Amine", lastName: "Manager" },
  },
  {
    label: "customer",
    managementRole: null,
    input: { email: "client@restivo.test", password: "Client2026!", firstName: "Sarra", lastName: "Client" },
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

try {
  for (const account of ACCOUNTS) {
    const parsed = signUpSchema.safeParse(account.input);
    if (!parsed.success) {
      fail(`${account.label}: ${parsed.error.issues[0]?.message ?? "invalid data"}`);
    }
    const body = parsed.data;

    const existing = await db.orm.public.User.where({ email: body.email }).first();
    if (existing) {
      console.log(`[skip]    ${body.email} already exists — left unchanged.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    await db.transaction(async (tx) => {
      const user = await tx.orm.public.User.create({
        email: body.email,
        passwordHash,
        managementRole: account.managementRole,
      });
      await tx.orm.public.Profile.create({
        userId: user.id,
        firstName: body.firstName,
        lastName: body.lastName,
        displayName: `${body.firstName} ${body.lastName}`.trim(),
        phone: null,
      });
    });

    console.log(`[created] ${body.email} (${account.label}).`);
  }
} finally {
  await db.close?.();
}
process.exit(0);
