// Inserts the demo data (src/lib/seed.ts) into PostgreSQL. Passwords are stored as bcrypt hashes.
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { createSeed, DEMO_PASSWORD } from "@/lib/seed";
import * as s from "./schema";
import type { DB } from "./index";

export async function seedDatabase(db: DB) {
  const data = createSeed();
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const d = (iso: string) => new Date(iso);

  await db.transaction(async (tx) => {
    await tx.insert(s.users).values(
      data.users.map(({ password: _pw, createdAt, ...u }) => ({ ...u, passwordHash: demoHash, createdAt: d(createdAt), unhcrId: u.unhcrId ?? null }))
    );
    await tx.insert(s.courses).values(data.courses);
    await tx.insert(s.enrollments).values(data.enrollments.map((e) => ({ ...e, startedAt: d(e.startedAt) })));
    await tx.insert(s.certificates).values(data.certificates.map((c) => ({ ...c, issueDate: d(c.issueDate) })));
    await tx.insert(s.jobs).values(data.jobs.map((j) => ({ ...j, createdAt: d(j.createdAt) })));
    await tx.insert(s.applications).values(data.applications.map((a) => ({ ...a, createdAt: d(a.createdAt) })));
    await tx.insert(s.contracts).values(data.contracts.map(({ submissions: _s, ...c }) => ({ ...c, createdAt: d(c.createdAt), dispute: c.dispute ?? null })));
    const subs = data.contracts.flatMap((c) => c.submissions.map((x) => ({ ...x, contractId: c.id, at: d(x.at) })));
    if (subs.length) await tx.insert(s.submissions).values(subs);
    await tx.insert(s.transactions).values(data.transactions.map((t) => ({ ...t, at: d(t.at) })));
    await tx.insert(s.ratings).values(data.ratings.map((r) => ({ ...r, at: d(r.at) })));
    await tx.insert(s.cohorts).values(data.cohorts.map(({ memberIds: _m, ...c }) => ({ ...c, createdAt: d(c.createdAt) })));
    await tx.insert(s.cohortMembers).values(data.cohorts.flatMap((c) => c.memberIds.map((userId) => ({ cohortId: c.id, userId }))));
    await tx.insert(s.posts).values(data.posts.map((p) => ({ ...p, at: d(p.at) })));
    await tx.insert(s.policies).values(data.policies.map(({ votesFor: _f, votesAgainst: _a, ...p }) => ({ ...p, at: d(p.at) })));
    await tx.insert(s.votes).values(
      data.policies.flatMap((p) => [
        ...p.votesFor.map((userId) => ({ policyId: p.id, userId, choice: "for" as const })),
        ...p.votesAgainst.map((userId) => ({ policyId: p.id, userId, choice: "against" as const })),
      ])
    );
    await tx.insert(s.reports).values(data.reports.map((r) => ({ ...r, at: d(r.at) })));
    await tx.insert(s.notifications).values(data.notifications.map((n) => ({ ...n, at: d(n.at) })));
  });
}

/** Wipes all data and re-seeds (admin "Reset demo data"). */
export async function resetDatabase(db: DB) {
  await db.execute(sql`TRUNCATE users, courses, enrollments, certificates, jobs, applications, contracts, submissions, transactions, ratings, cohorts, cohort_members, posts, policies, votes, reports, notifications, audit_log RESTART IDENTITY CASCADE`);
  await seedDatabase(db);
}
