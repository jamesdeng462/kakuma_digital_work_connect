// SRS 6.2 - Skills training module.
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { route } from "../router";
import * as s from "../db/schema";
import { badRequest, notFound, parse } from "../http";
import { audit, newId, notify, type Exec } from "../helpers";
import { sha256 } from "@/lib/sha256";
import type { Course } from "@/lib/types";

export const PASS_MARK = 70;

/** Course without quiz answers - answers never leave the server, so the quiz can't be cheated. */
export function publicCourse(c: typeof s.courses.$inferSelect): Course {
  return { ...c, quiz: c.quiz.map((q) => ({ q: q.q, options: q.options, answer: -1 })) };
}

async function getCourse(db: Exec, id: string) {
  const [c] = await db.select().from(s.courses).where(eq(s.courses.id, id));
  if (!c) throw notFound("Course not found.");
  return c;
}

route("GET", "/courses", async ({ db }) => (await db.select().from(s.courses)).map(publicCourse), "Course catalogue (public)");

route("GET", "/courses/:id", async ({ db, params }) => publicCourse(await getCourse(db, params.id)), "One course with lessons (quiz answers hidden)");

route("POST", "/courses/:id/enroll", async ({ db, params, requireUser }) => {
  const me = requireUser(["worker"]);
  await getCourse(db, params.id);
  await db.insert(s.enrollments).values({ id: newId(), userId: me.id, courseId: params.id }).onConflictDoNothing();
  return { ok: true };
}, "Enrol in a course (Youth Worker)");

async function myEnrollment(db: Exec, userId: string, courseId: string) {
  const [e] = await db.select().from(s.enrollments).where(and(eq(s.enrollments.userId, userId), eq(s.enrollments.courseId, courseId)));
  if (!e) throw badRequest("Enrol in this course first.");
  return e;
}

route("POST", "/courses/:id/lessons/:lessonId/complete", async ({ db, params, requireUser }) => {
  const me = requireUser(["worker"]);
  const course = await getCourse(db, params.id);
  if (!course.lessons.some((l) => l.id === params.lessonId)) throw notFound("Lesson not found.");
  const e = await myEnrollment(db, me.id, params.id);
  if (!e.completedLessons.includes(params.lessonId)) {
    await db.update(s.enrollments).set({ completedLessons: [...e.completedLessons, params.lessonId] }).where(eq(s.enrollments.id, e.id));
  }
  return { ok: true };
}, "Mark a lesson complete (also used by offline sync)");

route("POST", "/courses/:id/download", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["worker"]);
  const { downloaded } = parse(z.object({ downloaded: z.boolean() }), body);
  const e = await myEnrollment(db, me.id, params.id);
  await db.update(s.enrollments).set({ downloaded }).where(eq(s.enrollments.id, e.id));
  return { ok: true };
}, "Mark a course as downloaded for offline use");

/** Grades on the server. Mastery (>=70%) auto-issues a signed certificate (SRS 6.2 g, i). */
route("POST", "/courses/:id/quiz", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["worker"]);
  const course = await getCourse(db, params.id);
  const { answers } = parse(z.object({ answers: z.array(z.number().int()).length(course.quiz.length, `Answer all ${course.quiz.length} questions`) }), body);
  const e = await myEnrollment(db, me.id, course.id);
  if (e.completedLessons.length < course.lessons.length) throw badRequest("Complete all lessons before taking the quiz.");

  const correct = course.quiz.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const score = Math.round((correct / course.quiz.length) * 100);
  const passed = score >= PASS_MARK;

  const certId = await db.transaction(async (tx) => {
    await tx.update(s.enrollments).set({ attempts: e.attempts + 1, bestScore: Math.max(e.bestScore ?? 0, score), passed: e.passed || passed }).where(eq(s.enrollments.id, e.id));
    if (!passed) return undefined;
    const [existing] = await tx.select().from(s.certificates).where(and(eq(s.certificates.userId, me.id), eq(s.certificates.courseId, course.id)));
    if (existing) return existing.id;
    const id = newId();
    const issueDate = new Date();
    await tx.insert(s.certificates).values({ id, userId: me.id, courseId: course.id, score, issueDate, ipfsHash: sha256(`${id}|${me.id}|${course.id}|${score}|${issueDate.toISOString()}`) });
    await notify(tx, me.id, `Certificate issued: ${course.title}. You can now apply for ${course.domain} jobs.`, "/certificates");
    await audit(tx, me.id, "certificate.issued", id);
    return id;
  });
  return { score, passed, certId, passMark: PASS_MARK };
}, "Submit quiz answers; graded on the server; issues a certificate at 70%+");

route("GET", "/certificates", async ({ db, requireUser }) => {
  const me = requireUser();
  return db.select().from(s.certificates).where(eq(s.certificates.userId, me.id));
}, "Your certificates");

/** Public verification - target of every certificate QR code. Recomputes the hash to detect tampering. */
route("GET", "/certificates/:id", async ({ db, params }) => {
  const [c] = await db.select().from(s.certificates).where(eq(s.certificates.id, params.id));
  if (!c) throw notFound("Certificate not found.");
  const [holder] = await db.select({ name: s.users.name }).from(s.users).where(eq(s.users.id, c.userId));
  const [course] = await db.select({ title: s.courses.title, domain: s.courses.domain }).from(s.courses).where(eq(s.courses.id, c.courseId));
  const valid = sha256(`${c.id}|${c.userId}|${c.courseId}|${c.score}|${c.issueDate.toISOString()}`) === c.ipfsHash;
  return { certificate: c, holderName: holder?.name ?? "Unknown", course, valid };
}, "Verify a certificate (public)");
