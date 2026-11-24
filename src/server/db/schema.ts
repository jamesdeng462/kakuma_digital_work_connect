// PostgreSQL schema (Drizzle ORM). Mirrors the UML class diagram in the SRS (Appendix B).
import { pgTable, text, integer, boolean, timestamp, jsonb, numeric, real, primaryKey, uniqueIndex, index, serial } from "drizzle-orm/pg-core";
import type { Lesson, QuizQuestion } from "@/lib/types";

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });
const createdAt = (name = "created_at") => timestamp(name, { withTimezone: true }).notNull().defaultNow();

/** User - parent of YouthWorker and Employer (role-specific columns are nullable). */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["worker", "employer", "mentor", "admin", "partner", "governor"] }).notNull(),
  unhcrId: text("unhcr_id"),
  verifiedBy: text("verified_by", { enum: ["unhcr", "otp", "email", "document"] }).notNull(),
  language: text("language", { enum: ["en", "sw", "ar", "fr"] }).notNull().default("en"),
  location: text("location").notNull().default(""),
  nationality: text("nationality").notNull().default(""),
  gender: text("gender", { enum: ["Female", "Male", "Other"] }).notNull().default("Other"),
  createdAt: createdAt(),
  // YouthWorker
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  portfolioUrl: text("portfolio_url"),
  bio: text("bio"),
  rating: real("rating"),
  goal: text("goal"),
  // Employer
  companyName: text("company_name"),
  companyRegNo: text("company_reg_no"),
  employerStatus: text("employer_status", { enum: ["pending", "verified", "rejected"] }),
  antiExploitationAgreed: boolean("anti_exploitation_agreed"),
}, (t) => [uniqueIndex("users_email_idx").on(t.email)]);

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  description: text("description").notNull(),
  level: text("level", { enum: ["Beginner", "Intermediate"] }).notNull(),
  hours: integer("hours").notNull(),
  offlineAvail: boolean("offline_avail").notNull().default(true),
  sizeKb: integer("size_kb").notNull(),
  lessons: jsonb("lessons").$type<Lesson[]>().notNull(),
  quiz: jsonb("quiz").$type<QuizQuestion[]>().notNull(),
});

export const enrollments = pgTable("enrollments", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id),
  completedLessons: jsonb("completed_lessons").$type<string[]>().notNull().default([]),
  bestScore: integer("best_score"),
  attempts: integer("attempts").notNull().default(0),
  passed: boolean("passed").notNull().default(false),
  downloaded: boolean("downloaded").notNull().default(false),
  startedAt: createdAt("started_at"),
}, (t) => [uniqueIndex("enrollments_user_course_idx").on(t.userId, t.courseId)]);

export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(), // certId (UUID)
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.id),
  score: integer("score").notNull(),
  issueDate: timestamp("issue_date", { withTimezone: true }).notNull(),
  ipfsHash: text("ipfs_hash").notNull(),
}, (t) => [uniqueIndex("certificates_user_course_idx").on(t.userId, t.courseId)]);

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  employerId: text("employer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  description: text("description").notNull(),
  compensation: money("compensation").notNull(),
  timeCommitment: text("time_commitment", { enum: ["Part-time", "Full-time", "Short project"] }).notNull(),
  experience: text("experience", { enum: ["Entry", "Intermediate"] }).notNull(),
  language: text("language").notNull(),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  flagged: boolean("flagged").notNull().default(false),
  createdAt: createdAt(),
}, (t) => [index("jobs_employer_idx").on(t.employerId)]);

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  workerId: text("worker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  coverLetter: text("cover_letter").notNull(),
  status: text("status", { enum: ["submitted", "shortlisted", "accepted", "rejected"] }).notNull().default("submitted"),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("applications_job_worker_idx").on(t.jobId, t.workerId)]);

export const contracts = pgTable("contracts", {
  id: text("id").primaryKey(), // contractId
  jobId: text("job_id").notNull().references(() => jobs.id),
  workerId: text("worker_id").notNull().references(() => users.id),
  employerId: text("employer_id").notNull().references(() => users.id),
  deliverables: text("deliverables").notNull(),
  paymentTerms: text("payment_terms").notNull(),
  amount: money("amount").notNull(),
  disputeClause: text("dispute_clause").notNull(),
  workerSigned: boolean("worker_signed").notNull().default(false),
  employerSigned: boolean("employer_signed").notNull().default(false),
  status: text("status", { enum: ["awaiting_signatures", "active", "submitted", "revision", "approved", "paid", "disputed"] }).notNull(),
  dispute: text("dispute"),
  createdAt: createdAt(),
});

export const submissions = pgTable("submissions", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  link: text("link").notNull().default(""),
  at: createdAt("at"),
  feedback: text("feedback"),
  decision: text("decision", { enum: ["revision", "approved"] }),
});

/** Wallet = sum of a user's transactions (ledger). */
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["earning", "fee", "withdrawal", "deposit", "payment"] }).notNull(),
  amount: money("amount").notNull(),
  description: text("description").notNull(),
  method: text("method").notNull(),
  ref: text("ref").notNull(),
  at: createdAt("at"),
}, (t) => [index("transactions_user_idx").on(t.userId)]);

export const ratings = pgTable("ratings", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id),
  fromId: text("from_id").notNull().references(() => users.id),
  toId: text("to_id").notNull().references(() => users.id),
  stars: integer("stars").notNull(),
  comment: text("comment").notNull().default(""),
  at: createdAt("at"),
}, (t) => [uniqueIndex("ratings_contract_from_idx").on(t.contractId, t.fromId)]);

export const cohorts = pgTable("cohorts", {
  id: text("id").primaryKey(), // cohortId
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  mentorId: text("mentor_id").notNull().references(() => users.id),
  createdAt: createdAt(),
});

export const cohortMembers = pgTable("cohort_members", {
  cohortId: text("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: createdAt("joined_at"),
}, (t) => [primaryKey({ columns: [t.cohortId, t.userId] })]);

export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  cohortId: text("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  text: text("text").notNull(),
  at: createdAt("at"),
  flagged: boolean("flagged").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
});

export const policies = pgTable("policies", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  proposerId: text("proposer_id").notNull().references(() => users.id),
  at: createdAt("at"),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
});

export const votes = pgTable("votes", {
  policyId: text("policy_id").notNull().references(() => policies.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  choice: text("choice", { enum: ["for", "against"] }).notNull(),
}, (t) => [primaryKey({ columns: [t.policyId, t.userId] })]);

/** Anonymous safeguarding reports - deliberately no user reference. */
export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  at: createdAt("at"),
  status: text("status", { enum: ["new", "escalated", "resolved"] }).notNull().default("new"),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  href: text("href"),
  at: createdAt("at"),
  read: boolean("read").notNull().default(false),
}, (t) => [index("notifications_user_idx").on(t.userId)]);

/** Audit log for privileged actions (SRS 2.3: admin audit logging required). */
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  target: text("target"),
  at: createdAt("at"),
});
