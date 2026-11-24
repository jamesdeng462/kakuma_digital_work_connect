// SRS 6.3 o-q (contracts, work delivery, reputation) and 6.4 (financial access).
// Follows the sequence diagram: sign → submit ⇄ feedback → approve → pay via M-Pesa (5% fee) → wallet → rate.
import { z } from "zod";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { route } from "../router";
import * as s from "../db/schema";
import { badRequest, conflict, forbidden, notFound, parse, round2 } from "../http";
import { audit, newId, notify, notifyRole, type Exec, type UserRow } from "../helpers";
import { mpesaTransfer, PLATFORM_FEE } from "@/lib/services";

async function getContract(db: Exec, id: string, me: UserRow) {
  const [c] = await db.select().from(s.contracts).where(eq(s.contracts.id, id));
  if (!c) throw notFound("Contract not found.");
  if (me.role !== "admin" && c.workerId !== me.id && c.employerId !== me.id) throw forbidden("You are not a party to this contract.");
  return c;
}

export async function balanceOf(db: Exec, userId: string) {
  const [{ total }] = (await db.execute<{ total: string | null }>(sql`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = ${userId}`)).rows;
  return round2(Number(total ?? 0));
}

const jobTitle = async (db: Exec, jobId: string) => (await db.select({ t: s.jobs.title }).from(s.jobs).where(eq(s.jobs.id, jobId)))[0]?.t ?? "Job";

route("GET", "/contracts", async ({ db, requireUser }) => {
  const me = requireUser(["worker", "employer", "admin"]);
  const where = me.role === "admin" ? undefined : or(eq(s.contracts.workerId, me.id), eq(s.contracts.employerId, me.id));
  return db.select().from(s.contracts).where(where).orderBy(desc(s.contracts.createdAt));
}, "Your contracts (admins see all)");

route("GET", "/contracts/:id", async ({ db, params, requireUser }) => {
  const me = requireUser(["worker", "employer", "admin"]);
  const c = await getContract(db, params.id, me);
  const [submissions, ratings] = await Promise.all([
    db.select().from(s.submissions).where(eq(s.submissions.contractId, c.id)).orderBy(asc(s.submissions.at)),
    db.select().from(s.ratings).where(eq(s.ratings.contractId, c.id)),
  ]);
  return { ...c, submissions, ratings };
}, "Contract with submissions and ratings (parties and admins only)");

route("POST", "/contracts/:id/sign", async ({ db, params, requireUser }) => {
  const me = requireUser(["worker", "employer"]);
  const c = await getContract(db, params.id, me);
  if (c.status !== "awaiting_signatures") throw badRequest("This contract is already signed.");
  const workerSigned = c.workerSigned || me.id === c.workerId;
  const employerSigned = c.employerSigned || me.id === c.employerId;
  await db.transaction(async (tx) => {
    const active = workerSigned && employerSigned;
    await tx.update(s.contracts).set({ workerSigned, employerSigned, status: active ? "active" : "awaiting_signatures" }).where(eq(s.contracts.id, c.id));
    if (active) {
      await notify(tx, c.workerId, "Contract is now active. You can start working.", `/contracts/${c.id}`);
      await notify(tx, c.employerId, "Contract is now active.", `/contracts/${c.id}`);
    } else {
      await notify(tx, me.id === c.workerId ? c.employerId : c.workerId, "The other party signed the contract. Please review and sign.", `/contracts/${c.id}`);
    }
    await audit(tx, me.id, "contract.signed", c.id);
  });
  return { ok: true };
}, "Sign the digital work agreement");

route("POST", "/contracts/:id/submit", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["worker"]);
  const c = await getContract(db, params.id, me);
  if (c.workerId !== me.id) throw forbidden();
  if (c.status !== "active" && c.status !== "revision") throw badRequest("Work can only be submitted on an active contract.");
  const { note, link } = parse(z.object({ note: z.string().trim().min(3, "Describe what you are submitting"), link: z.string().trim().max(2000).default("") }), body);
  await db.transaction(async (tx) => {
    await tx.insert(s.submissions).values({ id: newId(), contractId: c.id, note, link });
    await tx.update(s.contracts).set({ status: "submitted" }).where(eq(s.contracts.id, c.id));
    await notify(tx, c.employerId, `Work submitted for review by ${me.name}.`, `/contracts/${c.id}`);
  });
  return { ok: true };
}, "Submit work (Youth Worker)");

route("POST", "/contracts/:id/review", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["employer"]);
  const c = await getContract(db, params.id, me);
  if (c.employerId !== me.id) throw forbidden();
  if (c.status !== "submitted") throw badRequest("There is no submission waiting for review.");
  const { decision, feedback } = parse(z.object({ decision: z.enum(["revision", "approved"]), feedback: z.string().trim().default("") }), body);
  if (decision === "revision" && feedback.length < 3) throw badRequest("Explain what needs to change.");
  await db.transaction(async (tx) => {
    const [last] = await tx.select().from(s.submissions).where(eq(s.submissions.contractId, c.id)).orderBy(desc(s.submissions.at)).limit(1);
    if (last) await tx.update(s.submissions).set({ feedback: feedback || "Approved. Thank you!", decision }).where(eq(s.submissions.id, last.id));
    await tx.update(s.contracts).set({ status: decision }).where(eq(s.contracts.id, c.id));
    await notify(tx, c.workerId, decision === "approved" ? "Your work was approved! Payment is being processed." : `Revision requested: ${feedback}`, `/contracts/${c.id}`);
  });
  return { ok: true };
}, "Approve work or request a revision (Employer)");

/** Employer pays: M-Pesa request, 5% platform fee deducted, worker wallet credited - all in one DB transaction. */
route("POST", "/contracts/:id/pay", async ({ db, params, requireUser }) => {
  const me = requireUser(["employer"]);
  const c = await getContract(db, params.id, me);
  if (c.employerId !== me.id) throw forbidden();
  if (c.status === "paid") throw conflict("This contract has already been paid.");
  if (c.status !== "approved") throw badRequest("Work must be approved before payment.");
  if ((await balanceOf(db, me.id)) < c.amount) throw badRequest("Insufficient wallet balance. Top up your wallet first.");
  const { ok, ref } = mpesaTransfer(c.amount);
  if (!ok) throw badRequest("M-Pesa request failed. Try again.");
  const fee = round2(c.amount * PLATFORM_FEE);
  const title = await jobTitle(db, c.jobId);
  await db.transaction(async (tx) => {
    // Re-check status inside the transaction to prevent double payment.
    const [fresh] = await tx.select({ status: s.contracts.status }).from(s.contracts).where(eq(s.contracts.id, c.id)).for("update");
    if (fresh.status !== "approved") throw conflict("This contract has already been paid.");
    await tx.insert(s.transactions).values([
      { id: newId(), userId: c.employerId, type: "payment", amount: -c.amount, description: `Payment - ${title}`, method: "KDWC wallet", ref },
      { id: newId(), userId: c.workerId, type: "earning", amount: c.amount, description: title, method: "M-Pesa (sandbox)", ref },
      { id: newId(), userId: c.workerId, type: "fee", amount: -fee, description: `Platform fee (${PLATFORM_FEE * 100}%)`, method: "KDWC", ref },
    ]);
    await tx.update(s.contracts).set({ status: "paid" }).where(eq(s.contracts.id, c.id));
    await notify(tx, c.workerId, `Payment received: $${(c.amount - fee).toFixed(2)} added to your wallet (ref ${ref}).`, "/wallet");
    await audit(tx, me.id, "contract.paid", `${c.id}:${ref}`);
  });
  return { ok: true, ref, fee, workerReceives: round2(c.amount - fee) };
}, "Pay an approved contract (Employer) - M-Pesa sandbox, 5% fee");

route("POST", "/contracts/:id/dispute", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["worker", "employer"]);
  const c = await getContract(db, params.id, me);
  if (["paid", "disputed", "awaiting_signatures"].includes(c.status)) throw badRequest("A dispute cannot be raised at this stage.");
  const { reason } = parse(z.object({ reason: z.string().trim().min(10, "Explain the problem (at least 10 characters)") }), body);
  await db.transaction(async (tx) => {
    await tx.update(s.contracts).set({ status: "disputed", dispute: reason }).where(eq(s.contracts.id, c.id));
    await notifyRole(tx, "admin", `Dispute raised on contract ${c.id}`, `/contracts/${c.id}`);
    await notify(tx, me.id === c.workerId ? c.employerId : c.workerId, "A dispute was raised on your contract. The KDWC panel will review it.", `/contracts/${c.id}`);
  });
  return { ok: true };
}, "Raise a dispute");

route("POST", "/contracts/:id/resolve", async ({ db, params, requireUser }) => {
  const me = requireUser(["admin"]);
  const c = await getContract(db, params.id, me);
  if (c.status !== "disputed") throw badRequest("This contract is not in dispute.");
  const [sub] = await db.select({ id: s.submissions.id }).from(s.submissions).where(eq(s.submissions.contractId, c.id)).limit(1);
  await db.transaction(async (tx) => {
    await tx.update(s.contracts).set({ status: sub ? "submitted" : "active", dispute: null }).where(eq(s.contracts.id, c.id));
    for (const uid of [c.workerId, c.employerId]) await notify(tx, uid, "Dispute resolved by the KDWC panel. The contract has resumed.", `/contracts/${c.id}`);
    await audit(tx, me.id, "dispute.resolved", c.id);
  });
  return { ok: true };
}, "Resolve a dispute (Admin)");

/** Dual-sided reputation (SRS 6.3 q): only on paid engagements, one rating per side. */
route("POST", "/contracts/:id/rate", async ({ db, params, body, requireUser }) => {
  const me = requireUser(["worker", "employer"]);
  const c = await getContract(db, params.id, me);
  if (c.status !== "paid") throw badRequest("You can only rate completed, paid contracts.");
  const { stars, comment } = parse(z.object({ stars: z.number().int().min(1).max(5), comment: z.string().trim().max(1000).default("") }), body);
  const toId = me.id === c.workerId ? c.employerId : c.workerId;
  const [dup] = await db.select({ id: s.ratings.id }).from(s.ratings).where(and(eq(s.ratings.contractId, c.id), eq(s.ratings.fromId, me.id)));
  if (dup) throw conflict("You already rated this engagement.");
  await db.transaction(async (tx) => {
    await tx.insert(s.ratings).values({ id: newId(), contractId: c.id, fromId: me.id, toId, stars, comment });
    const [{ avg }] = (await tx.execute<{ avg: string }>(sql`SELECT AVG(stars) AS avg FROM ratings WHERE to_id = ${toId}`)).rows;
    await tx.update(s.users).set({ rating: Math.round(Number(avg) * 10) / 10 }).where(eq(s.users.id, toId));
  });
  return { ok: true };
}, "Rate the other party after payment");

// ---- Wallet (SRS 6.4) ----
route("GET", "/wallet", async ({ db, requireUser }) => {
  const me = requireUser(["worker", "employer"]);
  const transactions = await db.select().from(s.transactions).where(eq(s.transactions.userId, me.id)).orderBy(desc(s.transactions.at));
  return { balance: await balanceOf(db, me.id), transactions };
}, "Wallet balance and transaction history");

route("POST", "/wallet/withdraw", async ({ db, body, requireUser }) => {
  const me = requireUser(["worker"]);
  const { amount, method, account } = parse(z.object({ amount: z.number().positive("Enter an amount greater than 0"), method: z.enum(["M-Pesa", "Airtel Money", "Chipper Cash", "Bank transfer (SWIFT)"]), account: z.string().trim().min(5, "Enter the phone or account number") }), body);
  if (amount > (await balanceOf(db, me.id))) throw badRequest("Amount is more than your balance.");
  const { ref } = mpesaTransfer(amount);
  await db.insert(s.transactions).values({ id: newId(), userId: me.id, type: "withdrawal", amount: -round2(amount), description: `Withdrawal to ${method} ${account}`, method: `${method} (sandbox)`, ref });
  return { ok: true, ref };
}, "Withdraw to mobile money or bank (Youth Worker, sandbox)");

route("POST", "/wallet/deposit", async ({ db, body, requireUser }) => {
  const me = requireUser(["employer"]);
  const { amount, method } = parse(z.object({ amount: z.number().positive("Enter an amount greater than 0").max(100000), method: z.string().trim().min(2) }), body);
  const ref = "DP" + Math.floor(100000 + Math.random() * 899999);
  await db.insert(s.transactions).values({ id: newId(), userId: me.id, type: "deposit", amount: round2(amount), description: "Wallet top-up", method: `${method} (sandbox)`, ref });
  return { ok: true, ref };
}, "Top up wallet (Employer, sandbox)");

route("POST", "/wallet/mfi-referral", async ({ db, requireUser }) => {
  const me = requireUser(["worker"]);
  const [{ months }] = (await db.execute<{ months: number }>(sql`SELECT COUNT(DISTINCT to_char(at, 'YYYY-MM'))::int AS months FROM transactions WHERE user_id = ${me.id} AND type = 'earning'`)).rows;
  if (months < 3) throw badRequest(`Referrals need 3 months of documented income (you have ${months}).`);
  await audit(db, me.id, "mfi.referral_requested");
  await notify(db, me.id, "Your microfinance referral was sent to a partner MFI. They will contact you.", "/wallet");
  return { ok: true };
}, "Request a microfinance referral (needs 3 months of income)");
