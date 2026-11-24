"use client";
// Contract lifecycle - follows the SRS sequence diagram:
// contract generated → both parties sign → worker submits work ⇄ employer feedback / revision
// → employer approves → employer pays (M-Pesa, 5% platform fee) → wallet updated → mutual rating.
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, FileSignature, Upload, CheckCircle2, RotateCcw, Banknote, AlertTriangle, PenLine, ExternalLink } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { ContractBadge } from "@/components/ContractBadge";
import { Alert, Button, Card, Empty, Input, Label, Modal, Stars, Textarea, cx, fmtDate, money, timeAgo, useToast } from "@/components/ui";
import { balanceOf, displayName, payContract, raiseDispute, rate, resolveDispute, reviewWork, signContract, submitWork } from "@/lib/store";
import { PLATFORM_FEE } from "@/lib/services";

export default function ContractPage() {
  return (
    <AppShell roles={["worker", "employer", "admin"]}>
      <ContractDetail />
    </AppShell>
  );
}

const STEPS = [
  { key: "sign", label: "Signed" },
  { key: "work", label: "Work submitted" },
  { key: "approve", label: "Approved" },
  { key: "paid", label: "Paid" },
];

function stepIndex(status: string) {
  return { awaiting_signatures: 0, active: 1, revision: 1, disputed: 1, submitted: 2, approved: 3, paid: 4 }[status] ?? 0;
}

function ContractDetail() {
  const { id } = useParams<{ id: string }>();
  const { db, user } = useAuthed();
  const { toast, toastNode } = useToast();
  const c = db.contracts.find((x) => x.id === id);
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [fileName, setFileName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (!c) return <Empty title="Contract not found"><Link href="/contracts" className="text-brand-700">Back</Link></Empty>;
  if (user.role !== "admin" && c.workerId !== user.id && c.employerId !== user.id) return <Empty title="You do not have access to this contract" />;

  const job = db.jobs.find((j) => j.id === c.jobId);
  const isWorker = user.id === c.workerId;
  const isEmployer = user.id === c.employerId;
  const si = stepIndex(c.status);
  const fee = Math.round(c.amount * PLATFORM_FEE * 100) / 100;
  const myRating = db.ratings.find((r) => r.contractId === c.id && r.fromId === user.id);
  const ratings = db.ratings.filter((r) => r.contractId === c.id);
  const mySigned = isWorker ? c.workerSigned : isEmployer ? c.employerSigned : true;

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    toast(r.ok ? success : (r as { error: string }).error, r.ok ? "success" : "error");
    return r.ok;
  };

  const doSubmit = async () => {
    if (!note.trim()) return setErr("Describe what you are submitting.");
    setErr("");
    if (await run(() => submitWork(c.id, note.trim(), link.trim() || (fileName ? `file: ${fileName}` : "")), "Work submitted for review.")) {
      setNote(""); setLink(""); setFileName("");
    }
  };

  const doPay = async () => {
    setBusy(true);
    const r = await payContract(c.id);
    setBusy(false);
    setPayOpen(false);
    if (!r.ok) toast(r.error, "error");
    else toast(`Payment sent via M-Pesa (ref ${r.ref}).`);
  };

  return (
    <>
      <Link href="/contracts" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft size={16} className="rtl-flip" /> Contracts
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{job?.title}</h1>
          <p className="text-sm text-slate-500">Contract {c.id} · created {fmtDate(c.createdAt)}</p>
        </div>
        <ContractBadge status={c.status} />
      </div>

      {/* Progress tracker */}
      <Card className="mb-6 p-4">
        <ol className="flex items-center gap-2 text-xs sm:text-sm">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex flex-1 items-center gap-2">
              <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", i < si ? "bg-brand-600 text-white" : i === si ? "bg-brand-100 text-brand-800 ring-2 ring-brand-500" : "bg-slate-200 text-slate-500")}>
                {i < si ? <Check size={14} /> : i + 1}
              </span>
              <span className={cx("hidden sm:inline", i <= si ? "font-semibold" : "text-slate-500")}>{s.label}</span>
              {i < STEPS.length - 1 && <span className={cx("h-0.5 flex-1", i < si ? "bg-brand-500" : "bg-slate-200")} />}
            </li>
          ))}
        </ol>
      </Card>

      {c.status === "disputed" && (
        <div className="mb-6">
          <Alert kind="error">
            <strong>Dispute open:</strong> {c.dispute}. The KDWC dispute panel will review within 7 business days.
            {user.role === "admin" && <Button variant="secondary" className="ms-3 py-1" onClick={() => run(() => resolveDispute(c.id), "Dispute resolved.")}>Mark resolved</Button>}
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Agreement */}
        <Card className="lg:col-span-3">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><FileSignature size={18} className="text-brand-600" /> Digital work agreement</h2>
          <dl className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Worker</dt><dd className="font-medium">{displayName(db, c.workerId)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Employer</dt><dd className="font-medium">{displayName(db, c.employerId)}</dd></div>
            </div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Deliverables</dt><dd>{c.deliverables}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Payment terms</dt><dd>{c.paymentTerms}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Amount</dt><dd className="text-lg font-bold">{money(c.amount)} <span className="text-sm font-normal text-slate-500">(worker receives {money(c.amount - fee)} after {PLATFORM_FEE * 100}% fee)</span></dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Dispute resolution</dt><dd>{c.disputeClause}</dd></div>
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
            <p className="flex items-center gap-2">{c.workerSigned ? <CheckCircle2 size={18} className="text-brand-600" /> : <PenLine size={18} className="text-slate-400" />} Worker {c.workerSigned ? "signed" : "not signed"}</p>
            <p className="flex items-center gap-2">{c.employerSigned ? <CheckCircle2 size={18} className="text-brand-600" /> : <PenLine size={18} className="text-slate-400" />} Employer {c.employerSigned ? "signed" : "not signed"}</p>
          </div>
          {(isWorker || isEmployer) && !mySigned && (
            <Button className="mt-4 w-full" disabled={busy} onClick={() => run(() => signContract(c.id), "Contract signed.")}>
              <PenLine size={18} /> I agree - sign contract
            </Button>
          )}
        </Card>

        {/* Actions */}
        <div className="space-y-6 lg:col-span-2">
          {isWorker && (c.status === "active" || c.status === "revision") && (
            <Card className="border-brand-200">
              <h2 className="mb-3 flex items-center gap-2 font-bold"><Upload size={18} className="text-brand-600" /> Submit your work</h2>
              {c.status === "revision" && <div className="mb-3"><Alert kind="warn">Revision requested - see feedback below.</Alert></div>}
              <div className="space-y-3">
                <div><Label htmlFor="note">What are you submitting?</Label><Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <div><Label htmlFor="link">Link to work (Google Drive, etc.)</Label><Input id="link" type="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} /></div>
                <div><Label htmlFor="file">Or attach a file</Label><input id="file" type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} className="block w-full text-sm" /></div>
                {err && <Alert kind="error">{err}</Alert>}
                <Button className="w-full" onClick={doSubmit} disabled={busy}>Submit for review</Button>
              </div>
            </Card>
          )}

          {isEmployer && c.status === "submitted" && (
            <Card className="border-brand-200">
              <h2 className="mb-3 font-bold">Review submission</h2>
              <Label htmlFor="fb">Feedback for the worker</Label>
              <Textarea id="fb" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What was good? What needs to change?" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" disabled={busy} onClick={async () => { if (!feedback.trim()) return toast("Add feedback explaining the revision.", "error"); if (await run(() => reviewWork(c.id, "revision", feedback.trim()), "Revision requested.")) setFeedback(""); }}><RotateCcw size={16} /> Request revision</Button>
                <Button disabled={busy} onClick={async () => { if (await run(() => reviewWork(c.id, "approved", feedback.trim() || "Approved. Thank you!"), "Work approved.")) setFeedback(""); }}><CheckCircle2 size={16} /> Approve</Button>
              </div>
            </Card>
          )}

          {isEmployer && c.status === "approved" && (
            <Card className="border-brand-300 bg-brand-50">
              <h2 className="mb-2 flex items-center gap-2 font-bold"><Banknote size={18} className="text-brand-600" /> Release payment</h2>
              <p className="text-sm text-slate-700">Pay {money(c.amount)} from your wallet (balance {money(balanceOf(db, user.id))}).</p>
              <Button className="mt-3 w-full" onClick={() => setPayOpen(true)}>Pay {money(c.amount)}</Button>
            </Card>
          )}

          {isWorker && c.status === "submitted" && <Alert kind="info">Your work is with the employer for review.</Alert>}
          {isWorker && c.status === "approved" && <Alert kind="success">Approved! Waiting for the employer to release payment.</Alert>}
          {isEmployer && (c.status === "active" || c.status === "revision") && <Alert kind="info">Waiting for the worker to submit work.</Alert>}

          {c.status === "paid" && (isWorker || isEmployer) && (
            <Card>
              <h2 className="mb-3 font-bold">Rate this engagement</h2>
              {myRating ? (
                <div className="text-sm">
                  <Stars value={myRating.stars} />
                  <p className="mt-1 text-slate-600">&ldquo;{myRating.comment}&rdquo;</p>
                  <p className="mt-2 text-xs text-slate-500">Thanks - ratings are only allowed on verified, paid engagements.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Stars value={stars} onChange={setStars} size={26} />
                  <Textarea aria-label="Comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={`How was working with ${displayName(db, isWorker ? c.employerId : c.workerId)}?`} />
                  <Button disabled={busy} onClick={() => run(() => rate(c.id, stars, comment.trim()), "Rating saved.")}>Submit rating</Button>
                </div>
              )}
            </Card>
          )}

          {(isWorker || isEmployer) && !["paid", "disputed", "awaiting_signatures"].includes(c.status) && (
            <button onClick={() => setDisputeOpen(true)} className="flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline">
              <AlertTriangle size={16} /> Raise a dispute
            </button>
          )}
        </div>
      </div>

      {/* Submission history */}
      <Card className="mt-6">
        <h2 className="mb-3 font-bold">Submissions & feedback</h2>
        {c.submissions.length === 0 ? (
          <p className="text-sm text-slate-500">No submissions yet.</p>
        ) : (
          <ol className="space-y-4">
            {c.submissions.map((s, i) => (
              <li key={s.id} className="rounded-lg border border-slate-200 p-4 text-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Revision {i + 1} · {timeAgo(s.at)}</p>
                <p className="mt-1">{s.note}</p>
                {s.link && (s.link.startsWith("http") ? <a href={s.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-brand-700 hover:underline">{s.link} <ExternalLink size={12} /></a> : <p className="mt-1 text-slate-600">{s.link}</p>)}
                {s.feedback && (
                  <div className={cx("mt-3 rounded-md p-3", s.decision === "approved" ? "bg-brand-50" : "bg-sun-100")}>
                    <p className="text-xs font-semibold uppercase">{s.decision === "approved" ? "Approved" : "Revision requested"} - employer feedback</p>
                    <p className="mt-1">{s.feedback}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        {ratings.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <h3 className="mb-2 text-sm font-bold">Ratings</h3>
            {ratings.map((r) => (
              <div key={r.id} className="mb-2 flex items-center gap-3 text-sm">
                <Stars value={r.stars} size={14} /> <span><strong>{displayName(db, r.fromId)}</strong>: {r.comment}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Confirm payment">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Contract amount</dt><dd className="font-semibold">{money(c.amount)}</dd></div>
          <div className="flex justify-between text-slate-500"><dt>Platform fee ({PLATFORM_FEE * 100}%, from worker payout)</dt><dd>-{money(fee)}</dd></div>
          <div className="flex justify-between border-t pt-2"><dt>Worker receives (M-Pesa)</dt><dd className="font-bold">{money(c.amount - fee)}</dd></div>
          <div className="flex justify-between text-slate-500"><dt>Your wallet after payment</dt><dd>{money(balanceOf(db, user.id) - c.amount)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">Processed through the M-Pesa Daraja sandbox in this prototype.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Button>
          <Button onClick={doPay} disabled={busy}>{busy ? "Processing…" : "Confirm & pay"}</Button>
        </div>
      </Modal>

      <Modal open={disputeOpen} onClose={() => setDisputeOpen(false)} title="Raise a dispute">
        <p className="mb-3 text-sm text-slate-600">Explain the problem. The KDWC dispute panel will contact both parties and resolve within 7 business days.</p>
        <Textarea aria-label="Reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDisputeOpen(false)}>Cancel</Button>
          <Button variant="danger" disabled={reason.trim().length < 10} onClick={async () => { setDisputeOpen(false); await run(() => raiseDispute(c.id, reason.trim()), "Dispute submitted."); }}>Submit dispute</Button>
        </div>
      </Modal>
      {toastNode}
    </>
  );
}
