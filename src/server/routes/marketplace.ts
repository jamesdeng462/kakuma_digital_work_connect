// SRS 6.3 - Remote work marketplace.
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { route } from "../router";
import * as s from "../db/schema";
import { badRequest, conflict, forbidden, notFound, parse } from "../http";
import { audit, displayNameOf, newId, notify, toClientUser, type Exec } from "../helpers";
import { recommendCourses, recommendJobs } from "@/lib/ai";
import { PLATFORM_FEE } from "@/lib/services";
import type { DB as ClientDB } from "@/lib/types";

const DOMAINS = ["Data Entry", "Graphic Design", "Web Development", "Customer Service", "Data Annotation", "Digital Marketing"] as const;

async function getJob(db: Exec, id: string) {
  const [j] = await db.select().from(s.jobs).where(eq(s.jobs.id, id));
  if (!j) throw notFound("Job not found.");
  return j;
}

/** Minimal data the AI engine needs, loaded from the database. */
async function aiContext(db: Exec): Promise<ClientDB> {
  const [courses, certificates, jobs] = await Promise.all([db.select().from(s.courses), db.select().from(s.certificates), db.select().from(s.jobs)]);
  return {
    courses,
    certificates: certificates.map((c) => ({ ...c, issueDate: c.issueDate.toISOString() })),
    jobs: jobs.map((j) => ({ ...j, createdAt: j.createdAt.toISOString() })),
  } as unknown as ClientDB;
}

route("GET", "/jobs", async ({ db, user, query }) => {
  const ctx = await aiContext(db);
  let list = ctx.jobs.filter((j) => j.status === "open" && !j.flagged);
  const domain = query.get("domain");
  if (domain) list = list.filter((j) => j.domain === domain);
  if (user?.role === "worker") {
    const ranked = recommendJobs({ ...ctx, jobs: list }, toClientUser(user, user));
    return ranked.map((r) => ({ ...r.job, match: r.score, reasons: r.reasons }));
  }
  return list;
}, "Open jobs; for Youth Workers they are ranked by the AI career engine (?domain= filter)");

route("GET", "/guidance", async ({ db, requireUser }) => {
  const me = requireUser(["worker"]);
  const ctx = await aiContext(db);
  const u = toClientUser(me, me);
  return { jobs: recommendJobs(ctx, u).slice(0, 5), learningPath: recommendCourses(ctx, u).slice(0, 5) };
}, "Personalised job matches and learning path (Youth Worker)");

const JobInput = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters"),
  domain: z.enum(DOMAINS),
  description: z.string().trim().min(20, "Description must be at least 20 characters"),
  compensation: z.number().positive("Pay must be greater than 0").max(100000),
  timeCommitment: z.enum(["Part-time", "Full-time", "Short project"]),
  experience: z.enum(["Entry", "Intermediate"]),
  language: z.string().trim().min(2),
});

route("POST", "/jobs", async ({ db, body, requireUser }) => {
  const me = requireUser(["employer"]);
  // BR2: employers must be approved by an administrator before posting.
  if (me.employerStatus !== "verified") throw forbidden("Your employer account must be verified by an administrator before you can post jobs (Business Rule BR2).");
  const input = parse(JobInput, body);
  const id = newId("j-");
  await db.transaction(async (tx) => {
    await tx.insert(s.jobs).values({ ...input, id, employerId: me.id });
    // Job alerts to workers certified in this domain
    const certified = await tx
      .selectDistinct({ userId: s.certificates.userId })
      .from(s.certificates)
      .innerJoin(s.courses, eq(s.courses.id, s.certificates.courseId))
      .where(eq(s.courses.domain, input.domain));
    for (const c of certified) await notify(tx, c.userId, `New ${input.domain} job: '${input.title}' - $${input.compensation}`, "/jobs");
  });
  return { ok: true, id };
}, "Post a job (verified Employer only - BR2)");

route("PATCH", "/jobs/:id", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["employer"]);
  const job = await getJob(db, params.id);
  if (job.employerId !== me.id) throw forbidden();
  const { status } = parse(z.object({ status: z.enum(["open", "closed"]) }), body);
  await db.update(s.jobs).set({ status }).where(eq(s.jobs.id, job.id));
  return { ok: true };
}, "Open or close your job");

route("POST", "/jobs/:id/flag", async ({ db, params, requireUser }) => {
  const me = requireUser();
  await getJob(db, params.id);
  await db.update(s.jobs).set({ flagged: true }).where(eq(s.jobs.id, params.id));
  await audit(db, me.id, "job.flagged", params.id);
  return { ok: true };
}, "Report a job listing to moderators");

route("POST", "/jobs/:id/apply", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["worker"]);
  const { coverLetter } = parse(z.object({ coverLetter: z.string().trim().min(10, "Write a short cover letter").max(5000) }), body);
  // BR1: a youth worker must complete at least one platform-verified training module before applying.
  const [cert] = await db.select({ id: s.certificates.id }).from(s.certificates).where(eq(s.certificates.userId, me.id)).limit(1);
  if (!cert) throw forbidden("Complete at least one verified course before applying (Business Rule BR1).");
  const job = await getJob(db, params.id);
  if (job.status !== "open" || job.flagged) throw badRequest("This job is no longer open.");
  // Sequence diagram: employer verification check - stop if the employer is not verified.
  const [employer] = await db.select().from(s.users).where(eq(s.users.id, job.employerId));
  if (employer?.employerStatus !== "verified") throw forbidden("This employer is not verified. Application blocked for your safety.");
  const [dup] = await db.select({ id: s.applications.id }).from(s.applications).where(and(eq(s.applications.jobId, job.id), eq(s.applications.workerId, me.id)));
  if (dup) throw conflict("You have already applied.");
  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(s.applications).values({ id, jobId: job.id, workerId: me.id, coverLetter });
    await notify(tx, job.employerId, `New application from ${me.name} for '${job.title}'`, `/employer/jobs/${job.id}`);
  });
  return { ok: true, id };
}, "Apply to a job (Youth Worker; BR1 + employer verification enforced)");

route("GET", "/jobs/:id/applications", async ({ db, params, requireUser }) => {
  const me = requireUser(["employer", "admin"]);
  const job = await getJob(db, params.id);
  if (me.role === "employer" && job.employerId !== me.id) throw forbidden();
  const apps = await db.select().from(s.applications).where(eq(s.applications.jobId, job.id)).orderBy(desc(s.applications.createdAt));
  const workers = apps.length ? await db.select().from(s.users).where(inArray(s.users.id, apps.map((a) => a.workerId))) : [];
  const certs = apps.length ? await db.select().from(s.certificates).where(inArray(s.certificates.userId, apps.map((a) => a.workerId))) : [];
  return apps.map((a) => ({ ...a, worker: toClientUser(workers.find((w) => w.id === a.workerId)!, me), certificates: certs.filter((c) => c.userId === a.workerId) }));
}, "Applicants for your job, with their certificates (Employer)");

route("GET", "/applications", async ({ db, requireUser }) => {
  const me = requireUser(["worker"]);
  return db.select().from(s.applications).where(eq(s.applications.workerId, me.id)).orderBy(desc(s.applications.createdAt));
}, "Your applications and their status (Youth Worker)");

route("DELETE", "/applications/:id", async ({ db, params, requireUser }) => {
  const me = requireUser(["worker"]);
  const [a] = await db.select().from(s.applications).where(eq(s.applications.id, params.id));
  if (!a || a.workerId !== me.id) throw notFound("Application not found.");
  if (a.status !== "submitted") throw badRequest("Only applications still under review can be withdrawn.");
  await db.delete(s.applications).where(eq(s.applications.id, a.id));
  return { ok: true };
}, "Withdraw an application");

async function ownedApplication(db: Exec, appId: string, employerId: string) {
  const [a] = await db.select().from(s.applications).where(eq(s.applications.id, appId));
  if (!a) throw notFound("Application not found.");
  const job = await getJob(db, a.jobId);
  if (job.employerId !== employerId) throw forbidden();
  return { a, job };
}

route("PATCH", "/applications/:id", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["employer"]);
  const { status } = parse(z.object({ status: z.enum(["shortlisted", "rejected"]) }), body);
  const { a, job } = await ownedApplication(db, params.id, me.id);
  if (a.status === "accepted") throw badRequest("This applicant has already been hired.");
  await db.transaction(async (tx) => {
    await tx.update(s.applications).set({ status }).where(eq(s.applications.id, a.id));
    await notify(tx, a.workerId, `Your application for '${job.title}' was ${status}.`, "/applications");
  });
  return { ok: true };
}, "Shortlist or reject an applicant (Employer)");

/** Hiring generates a standardised digital work agreement (SRS 6.3 o). */
route("POST", "/applications/:id/accept", async ({ db, params, requireUser }) => {
  const me = requireUser(["employer"]);
  const { a, job } = await ownedApplication(db, params.id, me.id);
  if (a.status === "accepted") throw conflict("Already hired.");
  if (a.status === "rejected") throw badRequest("This applicant was rejected.");
  const id = newId("ct-");
  await db.transaction(async (tx) => {
    await tx.update(s.applications).set({ status: "accepted" }).where(eq(s.applications.id, a.id));
    await tx.insert(s.contracts).values({
      id,
      jobId: job.id,
      workerId: a.workerId,
      employerId: me.id,
      deliverables: job.description,
      paymentTerms: `USD ${job.compensation} paid on approval via KDWC wallet (M-Pesa). ${PLATFORM_FEE * 100}% platform fee deducted from the worker payout.`,
      amount: job.compensation,
      disputeClause: "Either party may raise a dispute in-app. The KDWC dispute panel reviews evidence and resolves within 7 business days.",
      status: "awaiting_signatures",
    });
    await notify(tx, a.workerId, `Congratulations! You were hired for '${job.title}'. Review and sign your contract.`, `/contracts/${id}`);
    await audit(tx, me.id, "contract.created", id);
  });
  return { ok: true, id, employer: await displayNameOf(db, me.id) };
}, "Hire an applicant and generate the contract (Employer)");
