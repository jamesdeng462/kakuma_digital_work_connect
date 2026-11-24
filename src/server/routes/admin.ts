// SRS 6.5 - Management, governance, impact reporting. Plus /sync (offline-first data for the app).
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { route, listRoutes } from "../router";
import * as s from "../db/schema";
import { json, notFound, parse } from "../http";
import { audit, notify, toClientUser, type Exec, type UserRow } from "../helpers";
import { resetDatabase } from "../db/seed";
import { publicCourse } from "./learning";
import { impactMetrics } from "@/lib/metrics";
import type { DB as ClientDB } from "@/lib/types";

const iso = <T extends Record<string, unknown>>(row: T): T => {
  const out: Record<string, unknown> = { ...row };
  for (const k in out) if (out[k] instanceof Date) out[k] = (out[k] as Date).toISOString();
  return out as T;
};

/** Loads every table into the client data shape (server-side only; filtered before sending). */
async function loadAll(db: Exec) {
  const [users, courses, enrollments, certificates, jobs, applications, contracts, submissions, transactions, ratings, cohorts, members, posts, policies, votes, reports] = await Promise.all([
    db.select().from(s.users), db.select().from(s.courses), db.select().from(s.enrollments), db.select().from(s.certificates),
    db.select().from(s.jobs), db.select().from(s.applications), db.select().from(s.contracts), db.select().from(s.submissions),
    db.select().from(s.transactions), db.select().from(s.ratings), db.select().from(s.cohorts), db.select().from(s.cohortMembers),
    db.select().from(s.posts), db.select().from(s.policies), db.select().from(s.votes), db.select().from(s.reports),
  ]);
  return {
    userRows: users,
    data: {
      version: 0,
      users: [],
      courses: courses.map(publicCourse),
      enrollments: enrollments.map(iso),
      certificates: certificates.map(iso),
      jobs: jobs.map(iso),
      applications: applications.map(iso),
      contracts: contracts.map((c) => ({ ...iso(c), dispute: c.dispute ?? undefined, submissions: submissions.filter((x) => x.contractId === c.id).sort((a, b) => +a.at - +b.at).map((x) => ({ ...iso(x), feedback: x.feedback ?? undefined, decision: x.decision ?? undefined })) })),
      transactions: transactions.map(iso),
      ratings: ratings.map(iso),
      cohorts: cohorts.map((c) => ({ ...iso(c), memberIds: members.filter((m) => m.cohortId === c.id).map((m) => m.userId) })),
      posts: posts.map(iso),
      policies: policies.map((p) => ({ ...iso(p), votesFor: votes.filter((v) => v.policyId === p.id && v.choice === "for").map((v) => v.userId), votesAgainst: votes.filter((v) => v.policyId === p.id && v.choice === "against").map((v) => v.userId) })),
      reports: reports.map(iso),
      notifications: [],
    } as unknown as ClientDB,
  };
}

/**
 * GET /api/sync - everything the current user is allowed to see, in one response.
 * The app caches it on the device so it keeps working offline (SRS 6.1 c), and refreshes after every action.
 */
route("GET", "/sync", async ({ db, user }) => {
  const { userRows, data } = await loadAll(db);
  const me = user;
  const role = me?.role;
  const isAdmin = role === "admin";

  const out: ClientDB = { ...data, users: userRows.map((u) => toClientUser(u, me)) };
  if (!me) {
    return { userId: null, serverTime: new Date().toISOString(), db: { ...out, users: [], enrollments: [], applications: [], contracts: [], transactions: [], cohorts: [], posts: [], reports: [], notifications: [], certificates: [], jobs: out.jobs.filter((j) => j.status === "open" && !j.flagged) } };
  }

  const myCohorts = out.cohorts.filter((c) => isAdmin || c.mentorId === me.id || c.memberIds.includes(me.id));
  const myCohortIds = new Set(myCohorts.map((c) => c.id));
  const mentees = new Set(out.cohorts.filter((c) => c.mentorId === me.id).flatMap((c) => c.memberIds));
  const myJobIds = new Set(out.jobs.filter((j) => j.employerId === me.id).map((j) => j.id));
  const myContracts = out.contracts.filter((c) => isAdmin || c.workerId === me.id || c.employerId === me.id);
  const relatedJobIds = new Set([...myContracts.map((c) => c.jobId), ...out.applications.filter((a) => a.workerId === me.id).map((a) => a.jobId)]);
  const notifications = await db.select().from(s.notifications).where(eq(s.notifications.userId, me.id)).orderBy(desc(s.notifications.at)).limit(50);

  const scoped: ClientDB = {
    ...out,
    enrollments: out.enrollments.filter((e) => isAdmin || e.userId === me.id || mentees.has(e.userId)),
    jobs: out.jobs.filter((j) => isAdmin || (j.status === "open" && !j.flagged) || j.employerId === me.id || relatedJobIds.has(j.id)),
    applications: out.applications.filter((a) => isAdmin || a.workerId === me.id || myJobIds.has(a.jobId)),
    contracts: myContracts,
    transactions: out.transactions.filter((t) => t.userId === me.id),
    cohorts: myCohorts,
    posts: out.posts.filter((p) => myCohortIds.has(p.cohortId) && !p.hidden),
    reports: role === "admin" || role === "partner" ? out.reports : [],
    notifications: notifications.map((n) => ({ ...n, at: n.at.toISOString(), href: n.href ?? undefined })),
  };
  // Admins also see flagged items from every cohort for moderation.
  if (isAdmin) scoped.posts = out.posts;
  return { userId: me.id, serverTime: new Date().toISOString(), db: scoped };
}, "Everything the current user may see (role-scoped) - powers the offline-first app cache");

// ---- Impact reporting ----
route("GET", "/impact", async ({ db, query, requireUser }) => {
  requireUser(["partner", "admin", "mentor", "governor"]);
  const { userRows, data } = await loadAll(db);
  const m = impactMetrics({ ...data, users: userRows.map((u) => toClientUser(u, u)) });
  const extra = {
    safeguardingReports: data.reports.length,
    flaggedItems: data.posts.filter((p) => p.flagged).length + data.jobs.filter((j) => j.flagged).length,
    pendingEmployers: userRows.filter((u) => u.employerStatus === "pending").length,
    openDisputes: data.contracts.filter((c) => c.status === "disputed").length,
    totalUsers: userRows.length,
  };
  if (query.get("format") !== "csv") return { ...m, ...extra };

  const now = new Date();
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
  const rows: (string | number)[][] = [
    ["Kakuma Digital Work Connect - Quarterly Impact Report", quarter],
    ["Generated", now.toISOString()],
    [],
    ["Indicator", "Value"],
    ["Youth registered", m.youth], ["Refugee youth", m.refugees], ["Host-community youth", m.host], ["Women (%)", m.womenPct],
    ["Countries of origin", m.countries], ["Course enrolments", m.enrolled], ["Certificates issued", m.certificates],
    ["Completion rate (%)", m.completionRate], ["Job placements", m.placements], ["Total youth earnings (USD)", m.totalEarnings],
    ["Verified employers", m.employers], ["Safeguarding reports", extra.safeguardingReports],
    [], ["Youth by country of origin", ""], ...m.byNationality.map((r) => [r.label, r.value]),
    [], ["Certificates by skill domain", ""], ...m.byDomain.map((r) => [r.label, r.value]),
    [], ["Earnings by month (USD)", ""], ...m.months.map((r) => [r.label, r.value]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kdwc-impact-report-${quarter.replace(" ", "-")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}, "Impact metrics (JSON) or quarterly report (?format=csv) - Partner, Admin, Mentor, Governor");

// ---- Administration ----
route("GET", "/admin/users", async ({ db, requireUser }) => {
  const me = requireUser(["admin"]);
  return (await db.select().from(s.users).orderBy(desc(s.users.createdAt))).map((u) => toClientUser(u, me));
}, "All users (Admin)");

route("PATCH", "/admin/employers/:id", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["admin"]);
  const { status } = parse(z.object({ status: z.enum(["verified", "rejected"]) }), body);
  const [u] = await db.select().from(s.users).where(eq(s.users.id, params.id));
  if (!u || u.role !== "employer") throw notFound("Employer not found.");
  await db.transaction(async (tx) => {
    await tx.update(s.users).set({ employerStatus: status }).where(eq(s.users.id, u.id));
    await notify(tx, u.id, status === "verified" ? "Your employer account has been verified. You can now post jobs." : "Your employer verification was not approved. Contact support for details.", "/dashboard");
    await audit(tx, me.id, `employer.${status}`, u.id);
  });
  return { ok: true };
}, "Approve or reject an employer (Admin) - BR2");

route("PATCH", "/admin/posts/:id", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["admin"]);
  const { action } = parse(z.object({ action: z.enum(["hide", "restore"]) }), body);
  const r = await db.update(s.posts).set({ hidden: action === "hide", flagged: false }).where(eq(s.posts.id, params.id)).returning({ id: s.posts.id });
  if (!r.length) throw notFound("Post not found.");
  await audit(db, me.id, `post.${action}`, params.id);
  return { ok: true };
}, "Moderate a post (Admin)");

route("PATCH", "/admin/jobs/:id", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["admin"]);
  const { action } = parse(z.object({ action: z.enum(["remove", "restore"]) }), body);
  const r = await db.update(s.jobs).set(action === "remove" ? { flagged: false, status: "closed" } : { flagged: false }).where(eq(s.jobs.id, params.id)).returning({ id: s.jobs.id });
  if (!r.length) throw notFound("Job not found.");
  await audit(db, me.id, `job.${action}`, params.id);
  return { ok: true };
}, "Moderate a job listing (Admin)");

route("GET", "/admin/audit", async ({ db, requireUser }) => {
  requireUser(["admin"]);
  return db.select().from(s.auditLog).orderBy(desc(s.auditLog.at)).limit(200);
}, "Audit log of privileged actions (Admin)");

route("POST", "/admin/reset", async ({ db, requireUser }) => {
  requireUser(["admin"]);
  await resetDatabase(db);
  return { ok: true };
}, "Reset all data to the demo seed (Admin)");

// ---- Meta ----
route("GET", "/health", async ({ db }) => {
  const [{ now }] = (await db.execute<{ now: string }>(sql`SELECT now()::text AS now`)).rows;
  return { status: "ok", database: process.env.DATABASE_URL ? "postgresql" : "embedded-postgresql (pglite)", time: now };
}, "Health check (public)");

route("GET", "/docs", async () => json({ name: "Kakuma Digital Work Connect API", baseUrl: "/api", auth: "httpOnly session cookie from POST /api/auth/login", routes: listRoutes() }), "This API reference");

export type { UserRow };
