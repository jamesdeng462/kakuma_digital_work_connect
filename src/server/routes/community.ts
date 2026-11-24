// Cohorts (SRS 6.2 j), youth governance, moderation & safeguarding (SRS 6.5).
import { z } from "zod";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { route } from "../router";
import * as s from "../db/schema";
import { badRequest, forbidden, notFound, parse } from "../http";
import { audit, newId, notify, notifyRole, type Exec, type UserRow } from "../helpers";

// Simple keyword screen standing in for AI-assisted moderation; flagged content goes to human review.
const RISKY = ["fee first", "send a fee", "registration fee", "pay to get", "dm me", "whatsapp me", "$500 a day", "send money"];
export const autoFlag = (text: string) => RISKY.some((w) => text.toLowerCase().includes(w));

async function getCohort(db: Exec, id: string) {
  const [c] = await db.select().from(s.cohorts).where(eq(s.cohorts.id, id));
  if (!c) throw notFound("Cohort not found.");
  const members = await db.select({ userId: s.cohortMembers.userId }).from(s.cohortMembers).where(eq(s.cohortMembers.cohortId, id));
  return { ...c, memberIds: members.map((m) => m.userId) };
}

function canSeeCohort(c: { mentorId: string; memberIds: string[] }, me: UserRow) {
  return me.role === "admin" || c.mentorId === me.id || c.memberIds.includes(me.id);
}

route("GET", "/cohorts", async ({ db, requireUser }) => {
  const me = requireUser(["worker", "mentor", "admin"]);
  const all = await db.select().from(s.cohorts).orderBy(desc(s.cohorts.createdAt));
  const out = [];
  for (const c of all) {
    const full = await getCohort(db, c.id);
    if (canSeeCohort(full, me)) out.push(full);
  }
  return out;
}, "Cohorts you mentor or belong to");

route("POST", "/cohorts", async ({ db, body, requireUser }) => {
  const me = requireUser(["mentor"]);
  const { name, domain } = parse(z.object({ name: z.string().trim().min(3, "Give the cohort a name"), domain: z.string().trim().min(2) }), body);
  const id = newId("co-");
  await db.insert(s.cohorts).values({ id, name, domain, mentorId: me.id });
  return { ok: true, id };
}, "Create a cohort (Mentor)");

route("GET", "/cohorts/:id", async ({ db, params, requireUser }) => {
  const me = requireUser(["worker", "mentor", "admin"]);
  const c = await getCohort(db, params.id);
  if (!canSeeCohort(c, me)) throw forbidden("You are not a member of this cohort.");
  const posts = await db.select().from(s.posts).where(and(eq(s.posts.cohortId, c.id), eq(s.posts.hidden, false))).orderBy(asc(s.posts.at));
  return { ...c, posts };
}, "Cohort with members and discussion");

route("POST", "/cohorts/:id/members", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["mentor"]);
  const c = await getCohort(db, params.id);
  if (c.mentorId !== me.id) throw forbidden("Only this cohort's mentor can add learners.");
  const { userId } = parse(z.object({ userId: z.string().min(1) }), body);
  if (c.memberIds.includes(userId)) return { ok: true };
  if (c.memberIds.length >= 15) throw badRequest("Cohorts are limited to 15 learners.");
  const [u] = await db.select().from(s.users).where(eq(s.users.id, userId));
  if (!u || u.role !== "worker") throw badRequest("Only youth learners can join a cohort.");
  await db.transaction(async (tx) => {
    await tx.insert(s.cohortMembers).values({ cohortId: c.id, userId });
    await notify(tx, userId, `You were added to the learning cohort '${c.name}'.`, `/cohorts/${c.id}`);
  });
  return { ok: true };
}, "Add a learner (Mentor; max 15)");

route("DELETE", "/cohorts/:id/members/:userId", async ({ db, params, requireUser }) => {
  const me = requireUser(["mentor"]);
  const c = await getCohort(db, params.id);
  if (c.mentorId !== me.id) throw forbidden();
  await db.delete(s.cohortMembers).where(and(eq(s.cohortMembers.cohortId, c.id), eq(s.cohortMembers.userId, params.userId)));
  return { ok: true };
}, "Remove a learner (Mentor)");

route("POST", "/cohorts/:id/posts", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["worker", "mentor"]);
  const c = await getCohort(db, params.id);
  if (c.mentorId !== me.id && !c.memberIds.includes(me.id)) throw forbidden("Join the cohort to post.");
  const { text } = parse(z.object({ text: z.string().trim().min(1, "Write something").max(2000) }), body);
  const flagged = autoFlag(text);
  await db.transaction(async (tx) => {
    await tx.insert(s.posts).values({ id: newId(), cohortId: c.id, authorId: me.id, text, flagged });
    if (flagged) await notifyRole(tx, "admin", "A cohort post was auto-flagged for review.", "/admin?tab=moderation");
  });
  return { ok: true, flagged };
}, "Post in a cohort discussion (auto-screened)");

route("POST", "/posts/:id/flag", async ({ db, params, requireUser }) => {
  const me = requireUser();
  const [p] = await db.select().from(s.posts).where(eq(s.posts.id, params.id));
  if (!p) throw notFound("Post not found.");
  await db.update(s.posts).set({ flagged: true }).where(eq(s.posts.id, p.id));
  await audit(db, me.id, "post.flagged", p.id);
  return { ok: true };
}, "Report a post to moderators");

// ---- Governance ----
route("GET", "/policies", async ({ db }) => {
  const [list, allVotes] = await Promise.all([db.select().from(s.policies).orderBy(desc(s.policies.at)), db.select().from(s.votes)]);
  return list.map((p) => ({
    ...p,
    votesFor: allVotes.filter((v) => v.policyId === p.id && v.choice === "for").map((v) => v.userId),
    votesAgainst: allVotes.filter((v) => v.policyId === p.id && v.choice === "against").map((v) => v.userId),
  }));
}, "Policy proposals with votes");

route("POST", "/policies", async ({ db, body, requireUser }) => {
  const me = requireUser(["governor"]);
  const { title, description } = parse(z.object({ title: z.string().trim().min(5, "Title is too short"), description: z.string().trim().min(15, "Description is too short") }), body);
  const id = newId("po-");
  await db.insert(s.policies).values({ id, title, description, proposerId: me.id });
  await audit(db, me.id, "policy.proposed", id);
  return { ok: true, id };
}, "Propose a platform policy (Youth Governor)");

route("POST", "/policies/:id/vote", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["worker", "mentor", "governor"]);
  const { choice } = parse(z.object({ choice: z.enum(["for", "against"]) }), body);
  const [p] = await db.select().from(s.policies).where(eq(s.policies.id, params.id));
  if (!p) throw notFound("Proposal not found.");
  if (p.status !== "open") throw badRequest("Voting on this proposal is closed.");
  await db.insert(s.votes).values({ policyId: p.id, userId: me.id, choice }).onConflictDoUpdate({ target: [s.votes.policyId, s.votes.userId], set: { choice } });
  return { ok: true };
}, "Vote for/against (one vote per person, can be changed while open)");

route("POST", "/policies/:id/close", async ({ db, params, requireUser }) => {
  const me = requireUser(["governor", "admin"]);
  const [p] = await db.select().from(s.policies).where(eq(s.policies.id, params.id));
  if (!p) throw notFound("Proposal not found.");
  if (me.role === "governor" && p.proposerId !== me.id) throw forbidden("Only the proposer can close voting.");
  await db.update(s.policies).set({ status: "closed" }).where(eq(s.policies.id, p.id));
  return { ok: true };
}, "Close voting on your proposal");

// ---- Safeguarding (anonymous - no user id stored) ----
route("POST", "/reports", async ({ db, body }) => {
  const { category, description } = parse(z.object({ category: z.string().trim().min(2).max(80), description: z.string().trim().min(10, "Please describe what happened (at least 10 characters)").max(5000) }), body);
  await db.transaction(async (tx) => {
    await tx.insert(s.reports).values({ id: newId("rep-"), category, description });
    await notifyRole(tx, "admin", `New safeguarding report: ${category}`, "/admin?tab=safeguarding");
    await notifyRole(tx, "partner", `New safeguarding report: ${category}`, "/impact");
  });
  return { ok: true };
}, "Submit an anonymous safeguarding / GBV report (no login needed)");

route("GET", "/reports", async ({ db, requireUser }) => {
  requireUser(["admin", "partner"]);
  return db.select().from(s.reports).orderBy(desc(s.reports.at));
}, "Safeguarding reports (Admin, Partner)");

route("PATCH", "/reports/:id", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["admin", "partner"]);
  const { status } = parse(z.object({ status: z.enum(["escalated", "resolved"]) }), body);
  const r = await db.update(s.reports).set({ status }).where(eq(s.reports.id, params.id)).returning({ id: s.reports.id });
  if (!r.length) throw notFound("Report not found.");
  await audit(db, me.id, `report.${status}`, params.id);
  return { ok: true };
}, "Escalate or resolve a report (Admin, Partner)");

export async function countFlagged(db: Exec) {
  const [{ n: p }] = await db.select({ n: count() }).from(s.posts).where(eq(s.posts.flagged, true));
  const [{ n: j }] = await db.select({ n: count() }).from(s.jobs).where(eq(s.jobs.flagged, true));
  return p + j;
}
