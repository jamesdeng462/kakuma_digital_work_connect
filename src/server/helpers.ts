import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DB } from "./db";
import * as s from "./db/schema";
import type { User } from "@/lib/types";

/** Anything that can run queries: the db itself or a transaction. */
export type Exec = Pick<DB, "select" | "insert" | "update" | "delete" | "execute">;
export type UserRow = typeof s.users.$inferSelect;

export const newId = (prefix = "") => prefix + randomUUID();

export async function notify(ex: Exec, userId: string, text: string, href?: string) {
  await ex.insert(s.notifications).values({ id: newId(), userId, text, href: href ?? null });
}

export async function notifyRole(ex: Exec, role: UserRow["role"], text: string, href?: string) {
  const rows = await ex.select({ id: s.users.id }).from(s.users).where(eq(s.users.role, role));
  for (const r of rows) await notify(ex, r.id, text, href);
}

export async function audit(ex: Exec, actorId: string | null, action: string, target?: string) {
  await ex.insert(s.auditLog).values({ actorId, action, target: target ?? null });
}

export async function displayNameOf(ex: Exec, userId: string) {
  const [u] = await ex.select({ name: s.users.name, role: s.users.role, companyName: s.users.companyName }).from(s.users).where(eq(s.users.id, userId));
  if (!u) return "Unknown";
  return u.role === "employer" && u.companyName ? u.companyName : u.name;
}

/**
 * Converts a DB row to the client User shape. Private fields (email, phone, UNHCR number,
 * company registration, demographics) are only included for the user themself and admins.
 */
export function toClientUser(u: UserRow, viewer: UserRow | null): User {
  const full = !!viewer && (viewer.id === u.id || viewer.role === "admin");
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    verifiedBy: u.verifiedBy,
    language: u.language,
    location: u.location,
    createdAt: u.createdAt.toISOString(),
    skills: u.skills,
    portfolioUrl: u.portfolioUrl ?? undefined,
    bio: u.bio ?? undefined,
    rating: u.rating ?? undefined,
    companyName: u.companyName ?? undefined,
    employerStatus: u.employerStatus ?? undefined,
    email: full ? u.email : "",
    phone: full ? u.phone : "",
    unhcrId: full ? u.unhcrId ?? undefined : undefined,
    nationality: full ? u.nationality : "",
    gender: full ? u.gender : "Other",
    goal: full ? u.goal ?? undefined : undefined,
    companyRegNo: full ? u.companyRegNo ?? undefined : undefined,
    antiExploitationAgreed: full ? u.antiExploitationAgreed ?? undefined : undefined,
  };
}
