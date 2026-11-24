"use client";
// Client data layer - talks to the REST API (/api/*, see src/server).
// Offline-first (SRS 6.1 c / 6.2 h): the role-scoped data from GET /api/sync is cached on the device,
// so pages render instantly and keep working without internet. Lesson progress made offline is queued
// in an outbox and synced automatically when the connection returns.
import { useEffect, useState, useSyncExternalStore } from "react";
import type { DB, Job, Lang, Role, User, VerificationMethod } from "./types";

const CACHE_KEY = "kdwc-cache-v2";
const OUTBOX_KEY = "kdwc-outbox";
export const PASS_MARK = 70;

type State = { db: DB | null; userId: string | null };
let state: State = { db: null, userId: null };
const listeners = new Set<() => void>();
let started = false;

const EMPTY_DB: DB = {
  version: 0, users: [], courses: [], enrollments: [], certificates: [], jobs: [], applications: [], contracts: [],
  transactions: [], ratings: [], cohorts: [], posts: [], policies: [], reports: [], notifications: [],
};

function emit(next: State, persist = true) {
  state = next;
  if (persist) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable */
    }
  }
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) state = JSON.parse(raw) as State;
  } catch {
    /* ignore corrupt cache */
  }
  void flushOutbox().then(refresh);
  window.addEventListener("online", () => void flushOutbox().then(refresh));
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && void refresh());
}

/** Re-downloads everything the current user may see. Keeps the cached copy if offline. */
export async function refresh(): Promise<void> {
  try {
    const res = await fetch("/api/sync", { credentials: "same-origin", cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { userId: string | null; db: DB };
    emit({ db: data.db, userId: data.userId });
  } catch {
    if (!state.db) emit({ db: EMPTY_DB, userId: state.userId }, false);
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  start();
  return () => listeners.delete(cb);
}

const SERVER_STATE: State = { db: null, userId: null };
export function useStore() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  const user = s.db ? s.db.users.find((u) => u.id === s.userId) ?? null : null;
  return { db: s.db, user };
}

// ---------------- HTTP helpers ----------------

export class ApiError extends Error {}

export async function api<T = Record<string, unknown>>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("You appear to be offline. Connect to the internet and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Runs an API call, then refreshes the local data. Never throws - returns { ok, error }. */
async function act<T extends object = object>(call: () => Promise<T>): Promise<Result<T & { id?: string }>> {
  try {
    const r = await call();
    await refresh();
    return { ok: true, ...(r as T & { id?: string }) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Fetches a read-only API resource; re-fetches whenever local data changes. */
export function useApi<T>(path: string | null) {
  const { db } = useStore();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>("GET", path)
      .then((d) => alive && (setData(d), setError("")))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, db]);
  return { data, error };
}

// ---------------- Derived helpers (read from local data) ----------------

export function balanceOf(d: DB, userId: string) {
  return Math.round(d.transactions.filter((t) => t.userId === userId).reduce((s, t) => s + t.amount, 0) * 100) / 100;
}

export function displayName(d: DB, userId: string) {
  const u = d.users.find((x) => x.id === userId);
  if (!u) return "Unknown";
  return u.role === "employer" && u.companyName ? u.companyName : u.name;
}

export function hasVerifiedModule(d: DB, userId: string) {
  return d.certificates.some((c) => c.userId === userId);
}

// ---------------- Auth & identity (SRS 6.1) ----------------

export const login = (email: string, password: string) => act(() => api("POST", "/auth/login", { email, password }));

export async function logout() {
  await api("POST", "/auth/logout").catch(() => {});
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(OUTBOX_KEY);
  } catch {}
  emit({ db: state.db ? { ...EMPTY_DB, courses: state.db.courses } : EMPTY_DB, userId: null }, false);
  await refresh();
}

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Extract<Role, "worker" | "employer">;
  language: Lang;
  nationality: string;
  gender: User["gender"];
  location: string;
  skills: string[];
  goal?: string;
  companyName?: string;
  companyRegNo?: string;
  antiExploitationAgreed?: boolean;
  paymentCapabilityConfirmed?: boolean;
  verification:
    | { method: "unhcr"; unhcrId: string }
    | { method: "otp" | "email"; code: string }
    | { method: "document"; documentName: string; attested: true };
}

export const signup = (input: SignupInput) => act(() => api("POST", "/auth/signup", input));

export const verifyUnhcr = (unhcrId: string) => api<{ ok: boolean; message: string }>("POST", "/verify/unhcr", { unhcrId });
export const sendCode = (channel: "sms" | "email", to: string) => api<{ sent: boolean; hint: string }>("POST", "/verify/otp/send", { channel, to });
export const checkCode = (code: string) => api<{ ok: boolean }>("POST", "/verify/otp/check", { code });
export type { VerificationMethod };

export const updateProfile = (patch: Partial<Pick<User, "name" | "phone" | "bio" | "portfolioUrl" | "skills" | "language">>) =>
  act(() => api("PATCH", "/profile", patch));

export async function setLanguage(lang: Lang) {
  try {
    localStorage.setItem("kdwc-lang", lang);
  } catch {}
  if (state.userId && state.db) {
    // Optimistic update so the UI switches language instantly.
    emit({ ...state, db: { ...state.db, users: state.db.users.map((u) => (u.id === state.userId ? { ...u, language: lang } : u)) } });
    await act(() => api("PATCH", "/profile", { language: lang }));
  } else {
    emit({ ...state }, false);
  }
}

export const markNotificationsRead = () => act(() => api("POST", "/notifications/read"));
export const resetDemo = () => act(() => api("POST", "/admin/reset"));

// ---------------- Skills training (SRS 6.2) ----------------

export const enroll = (courseId: string) => act(() => api("POST", `/courses/${courseId}/enroll`));

type OutboxItem = { courseId: string; lessonId: string };
function readOutbox(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
  } catch {
    return [];
  }
}
async function flushOutbox() {
  const items = readOutbox();
  if (!items.length || !navigator.onLine) return;
  const left: OutboxItem[] = [];
  for (const it of items) {
    try {
      await api("POST", `/courses/${it.courseId}/lessons/${it.lessonId}/complete`);
    } catch (e) {
      if (e instanceof ApiError && /offline/.test(e.message)) left.push(it);
    }
  }
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(left));
}

/** Works offline: progress is saved on the device and synced on reconnect. */
export async function completeLesson(courseId: string, lessonId: string): Promise<Result> {
  if (state.db && state.userId) {
    emit({
      ...state,
      db: {
        ...state.db,
        enrollments: state.db.enrollments.map((e) =>
          e.userId === state.userId && e.courseId === courseId && !e.completedLessons.includes(lessonId) ? { ...e, completedLessons: [...e.completedLessons, lessonId] } : e
        ),
      },
    });
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify([...readOutbox(), { courseId, lessonId }]));
    return { ok: true };
  }
  return act(() => api("POST", `/courses/${courseId}/lessons/${lessonId}/complete`));
}

export function toggleDownload(courseId: string) {
  const e = state.db?.enrollments.find((x) => x.userId === state.userId && x.courseId === courseId);
  return act(() => api("POST", `/courses/${courseId}/download`, { downloaded: !e?.downloaded }));
}

export const submitQuiz = (courseId: string, answers: number[]) =>
  act(() => api<{ score: number; passed: boolean; certId?: string }>("POST", `/courses/${courseId}/quiz`, { answers }));

// ---------------- Marketplace (SRS 6.3) ----------------

export const applyToJob = (jobId: string, coverLetter: string) => act(() => api("POST", `/jobs/${jobId}/apply`, { coverLetter }));
export const withdrawApplication = (appId: string) => act(() => api("DELETE", `/applications/${appId}`));
export const postJob = (input: Pick<Job, "title" | "domain" | "description" | "compensation" | "timeCommitment" | "experience" | "language">) => act(() => api("POST", "/jobs", input));
export const setJobStatus = (jobId: string, status: "open" | "closed") => act(() => api("PATCH", `/jobs/${jobId}`, { status }));
export const flagJob = (jobId: string) => act(() => api("POST", `/jobs/${jobId}/flag`));
export const setApplicationStatus = (appId: string, status: "shortlisted" | "rejected") => act(() => api("PATCH", `/applications/${appId}`, { status }));
export const acceptApplication = (appId: string) => act(() => api<{ id: string }>("POST", `/applications/${appId}/accept`));

export const signContract = (id: string) => act(() => api("POST", `/contracts/${id}/sign`));
export const submitWork = (id: string, note: string, link: string) => act(() => api("POST", `/contracts/${id}/submit`, { note, link }));
export const reviewWork = (id: string, decision: "revision" | "approved", feedback: string) => act(() => api("POST", `/contracts/${id}/review`, { decision, feedback }));
export const payContract = (id: string) => act(() => api<{ ref: string }>("POST", `/contracts/${id}/pay`));
export const raiseDispute = (id: string, reason: string) => act(() => api("POST", `/contracts/${id}/dispute`, { reason }));
export const resolveDispute = (id: string) => act(() => api("POST", `/contracts/${id}/resolve`));
export const rate = (id: string, stars: number, comment: string) => act(() => api("POST", `/contracts/${id}/rate`, { stars, comment }));

// ---------------- Financial access (SRS 6.4) ----------------

export const withdraw = (amount: number, method: string, account: string) => act(() => api<{ ref: string }>("POST", "/wallet/withdraw", { amount, method, account }));
export const deposit = (amount: number, method: string) => act(() => api<{ ref: string }>("POST", "/wallet/deposit", { amount, method }));
export const requestMfiReferral = () => act(() => api("POST", "/wallet/mfi-referral"));

// ---------------- Community & governance (SRS 6.5) ----------------

export const createCohort = (name: string, domain: string) => act(() => api<{ id: string }>("POST", "/cohorts", { name, domain }));
export const addCohortMember = (cohortId: string, userId: string) => act(() => api("POST", `/cohorts/${cohortId}/members`, { userId }));
export const removeCohortMember = (cohortId: string, userId: string) => act(() => api("DELETE", `/cohorts/${cohortId}/members/${userId}`));
export const addPost = (cohortId: string, text: string) => act(() => api<{ flagged: boolean }>("POST", `/cohorts/${cohortId}/posts`, { text }));
export const flagPost = (postId: string) => act(() => api("POST", `/posts/${postId}/flag`));
export const moderatePost = (postId: string, action: "hide" | "restore") => act(() => api("PATCH", `/admin/posts/${postId}`, { action }));
export const moderateJob = (jobId: string, action: "remove" | "restore") => act(() => api("PATCH", `/admin/jobs/${jobId}`, { action }));
export const setEmployerStatus = (userId: string, status: "verified" | "rejected") => act(() => api("PATCH", `/admin/employers/${userId}`, { status }));
export const proposePolicy = (title: string, description: string) => act(() => api("POST", "/policies", { title, description }));
export const vote = (policyId: string, choice: "for" | "against") => act(() => api("POST", `/policies/${policyId}/vote`, { choice }));
export const closePolicy = (policyId: string) => act(() => api("POST", `/policies/${policyId}/close`));
export const submitReport = (category: string, description: string) => act(() => api("POST", "/reports", { category, description }));
export const setReportStatus = (id: string, status: "escalated" | "resolved") => act(() => api("PATCH", `/reports/${id}`, { status }));
