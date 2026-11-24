// SRS 6.1 - User registration & identity management.
import bcrypt from "bcryptjs";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { route } from "../router";
import * as s from "../db/schema";
import { badRequest, conflict, json, parse, unauthorized } from "../http";
import { clearSessionCookie, createSessionCookie } from "../auth";
import { audit, newId, notify, notifyRole, toClientUser } from "../helpers";
import { checkOtp, progresVerify, sendOtp } from "@/lib/services";

const LANG = z.enum(["en", "sw", "ar", "fr"]);

// ---- Login / logout / me ----
route("POST", "/auth/login", async ({ db, body }) => {
  const { email, password } = parse(z.object({ email: z.string().trim().min(1, "Email is required"), password: z.string().min(1, "Password is required") }), body);
  const [u] = await db.select().from(s.users).where(sql`lower(${s.users.email}) = ${email.toLowerCase()}`);
  // Same message for unknown email and wrong password (no account enumeration).
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) throw unauthorized("Incorrect email or password.");
  return json({ user: toClientUser(u, u) }, { cookies: [await createSessionCookie(u.id, u.role)] });
}, "Log in with email + password; sets an httpOnly session cookie");

route("POST", "/auth/logout", async () => json({ ok: true }, { cookies: [clearSessionCookie()] }), "Log out (clears the session cookie)");

route("GET", "/auth/me", async ({ user }) => ({ user: user ? toClientUser(user, user) : null }), "Current user or null");

// ---- Identity verification (activity diagram) ----
route("POST", "/verify/unhcr", async ({ body }) => {
  const { unhcrId } = parse(z.object({ unhcrId: z.string().trim().min(1) }), body);
  return progresVerify(unhcrId);
}, "Check a UNHCR registration number against ProGres (sandbox: KAK-######)");

route("POST", "/verify/otp/send", async ({ body }) => {
  const { to } = parse(z.object({ channel: z.enum(["sms", "email"]), to: z.string().trim().min(3) }), body);
  return sendOtp(to);
}, "Send a one-time code by SMS or email (sandbox code 123456)");

route("POST", "/verify/otp/check", async ({ body }) => {
  const { code } = parse(z.object({ code: z.string() }), body);
  return { ok: checkOtp(code) };
}, "Check a one-time code");

route("GET", "/auth/email-available", async ({ db, query }) => {
  const email = (query.get("email") ?? "").trim().toLowerCase();
  const [u] = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${email}`);
  return { available: !u };
}, "Check whether an email is free before signup");

// ---- Signup ----
const Verification = z.discriminatedUnion("method", [
  z.object({ method: z.literal("unhcr"), unhcrId: z.string() }),
  z.object({ method: z.literal("otp"), code: z.string() }),
  z.object({ method: z.literal("email"), code: z.string() }),
  z.object({ method: z.literal("document"), documentName: z.string().min(1, "Upload a document"), attested: z.literal(true, { message: "Self-attestation is required" }) }),
]);

const Signup = z.object({
  name: z.string().trim().min(3, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().refine((p) => p.replace(/\D/g, "").length >= 9, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["worker", "employer"]),
  language: LANG.default("en"),
  nationality: z.string().trim().default(""),
  gender: z.enum(["Female", "Male", "Other"]).default("Other"),
  location: z.string().trim().default(""),
  skills: z.array(z.string().trim().min(1)).max(30).default([]),
  goal: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  companyRegNo: z.string().trim().optional(),
  antiExploitationAgreed: z.boolean().optional(),
  paymentCapabilityConfirmed: z.boolean().optional(),
  verification: Verification,
});

route("POST", "/auth/signup", async ({ db, body }) => {
  const input = parse(Signup, body);
  const v = input.verification;

  // Server-side re-check of identity verification - never trust the client.
  if (v.method === "unhcr" && !progresVerify(v.unhcrId).ok) throw badRequest("UNHCR number could not be verified.");
  if ((v.method === "otp" || v.method === "email") && !checkOtp(v.code)) throw badRequest("Verification code is incorrect.");

  if (input.role === "employer") {
    if (!input.companyName || input.companyName.length < 2) throw badRequest("Company name is required.");
    if (!input.companyRegNo) throw badRequest("Company registration number is required.");
    if (!input.antiExploitationAgreed || !input.paymentCapabilityConfirmed) throw badRequest("Employers must confirm payment capability and agree to the anti-exploitation policy.");
    if (v.method !== "email") throw badRequest("Employers verify with a business email code.");
  }

  const [exists] = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${input.email.toLowerCase()}`);
  if (exists) throw conflict("An account with this email already exists. Log in instead.");

  const id = newId();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await db.transaction(async (tx) => {
    const [u] = await tx.insert(s.users).values({
      id,
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
      verifiedBy: v.method,
      unhcrId: v.method === "unhcr" ? v.unhcrId.trim().toUpperCase() : null,
      language: input.language,
      nationality: input.nationality,
      gender: input.gender,
      location: input.location,
      skills: input.skills,
      goal: input.goal ?? null,
      companyName: input.role === "employer" ? input.companyName! : null,
      companyRegNo: input.role === "employer" ? input.companyRegNo! : null,
      employerStatus: input.role === "employer" ? "pending" : null,
      antiExploitationAgreed: input.role === "employer" ? true : null,
    }).returning();
    if (input.role === "employer") {
      await notifyRole(tx, "admin", `New employer awaiting verification: ${input.companyName}`, "/admin?tab=employers");
      await notify(tx, id, "Your employer account is pending verification. You can post jobs once an admin approves it.", "/dashboard");
    } else {
      await notify(tx, id, "Welcome to Kakuma Digital Work Connect! Start your first course to unlock job applications.", "/courses");
    }
    await audit(tx, id, "user.signup", `${input.role}:${v.method}`);
    return u;
  });

  return json({ user: toClientUser(user, user) }, { status: 201, cookies: [await createSessionCookie(user.id, user.role)] });
}, "Create a Youth Worker or Employer account (verification re-checked on the server)");

// ---- Profile ----
route("PATCH", "/profile", async ({ db, body, requireUser }) => {
  const me = requireUser();
  const patch = parse(z.object({
    name: z.string().trim().min(3).optional(),
    phone: z.string().trim().min(9).optional(),
    bio: z.string().trim().max(1000).optional(),
    portfolioUrl: z.union([z.string().trim().url("Portfolio must be a valid URL"), z.literal("")]).optional(),
    skills: z.array(z.string().trim().min(1)).max(30).optional(),
    language: LANG.optional(),
  }), body);
  const [u] = await db.update(s.users).set({
    ...patch,
    portfolioUrl: patch.portfolioUrl === "" ? null : patch.portfolioUrl,
  }).where(eq(s.users.id, me.id)).returning();
  return { user: toClientUser(u, u) };
}, "Update your own profile");

// ---- Notifications ----
route("GET", "/notifications", async ({ db, requireUser }) => {
  const me = requireUser();
  return db.select().from(s.notifications).where(eq(s.notifications.userId, me.id)).orderBy(sql`${s.notifications.at} desc`).limit(50);
}, "Your notifications (latest 50)");

route("POST", "/notifications/read", async ({ db, requireUser }) => {
  const me = requireUser();
  await db.update(s.notifications).set({ read: true }).where(and(eq(s.notifications.userId, me.id), eq(s.notifications.read, false)));
  return { ok: true };
}, "Mark all your notifications as read");
