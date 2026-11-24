"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Lock, Users } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Alert, Badge, Button, Card, Empty, Input, Label, Modal, PageHeader, Select, Textarea, fmtDate, money, useToast } from "@/components/ui";
import { postJob, setJobStatus } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { Job } from "@/lib/types";

const DOMAINS = ["Data Entry", "Graphic Design", "Web Development", "Customer Service", "Data Annotation", "Digital Marketing"];

export default function EmployerJobsPage() {
  return (
    <AppShell roles={["employer"]}>
      <Suspense>
        <EmployerJobs />
      </Suspense>
    </AppShell>
  );
}

function EmployerJobs() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const params = useSearchParams();
  const { toast, toastNode } = useToast();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ title: "", domain: DOMAINS[0], description: "", compensation: "100", timeCommitment: "Short project" as Job["timeCommitment"], experience: "Entry" as Job["experience"], language: "English" });
  const verified = user.employerStatus === "verified";
  const jobs = db.jobs.filter((j) => j.employerId === user.id);

  useEffect(() => {
    if (params.get("new")) setOpen(true);
  }, [params]);

  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setErr("");
    const comp = parseFloat(f.compensation);
    if (f.title.trim().length < 5) return setErr("Give the job a clear title (at least 5 characters).");
    if (f.description.trim().length < 20) return setErr("Describe the work in at least 20 characters.");
    if (!(comp > 0)) return setErr("Enter the payment amount in USD.");
    setBusy(true);
    const r = await postJob({ ...f, title: f.title.trim(), description: f.description.trim(), compensation: comp });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setOpen(false);
    setF({ ...f, title: "", description: "" });
    toast("Job published. Certified workers have been notified.");
  };

  return (
    <>
      <PageHeader
        title={t("myJobs")}
        subtitle="Post remote jobs and manage applicants."
        action={<Button onClick={() => setOpen(true)}>{verified ? <Plus size={18} /> : <Lock size={18} />} {t("postJob")}</Button>}
      />
      {!verified && <div className="mb-6"><Alert kind="warn">Your account is <strong>{user.employerStatus}</strong>. Employers must be approved by a KDWC administrator before posting jobs (Business Rule BR2).</Alert></div>}

      {jobs.length === 0 ? <Empty title="No jobs yet">Post your first job to start receiving applications.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => {
            const apps = db.applications.filter((a) => a.jobId === j.id);
            return (
              <Card key={j.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/employer/jobs/${j.id}`} className="font-bold hover:text-brand-700">{j.title}</Link>
                    <p className="text-sm text-slate-500">{j.domain} · {money(j.compensation)} · posted {fmtDate(j.createdAt)}</p>
                  </div>
                  <Badge color={j.flagged ? "red" : j.status === "open" ? "green" : "gray"}>{j.flagged ? "under review" : j.status}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/employer/jobs/${j.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"><Users size={16} /> {apps.length} applicant{apps.length !== 1 && "s"}</Link>
                  <Button variant="ghost" className="py-1 text-xs" onClick={() => setJobStatus(j.id, j.status === "open" ? "closed" : "open")}>{j.status === "open" ? "Close job" : "Reopen"}</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t("postJob")}>
        {!verified ? (
          <Alert kind="warn">Posting is locked until your company is verified by an administrator (BR2). This protects young workers from exploitation.</Alert>
        ) : (
          <div className="space-y-4">
            <div><Label htmlFor="t">Job title</Label><Input id="t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Transcribe 200 interview recordings" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="d">Skill domain</Label><Select id="d" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })}>{DOMAINS.map((d) => <option key={d}>{d}</option>)}</Select></div>
              <div><Label htmlFor="c">Pay (USD)</Label><Input id="c" type="number" min={1} value={f.compensation} onChange={(e) => setF({ ...f, compensation: e.target.value })} /></div>
              <div><Label htmlFor="tc">Time commitment</Label><Select id="tc" value={f.timeCommitment} onChange={(e) => setF({ ...f, timeCommitment: e.target.value as Job["timeCommitment"] })}><option>Short project</option><option>Part-time</option><option>Full-time</option></Select></div>
              <div><Label htmlFor="ex">Experience</Label><Select id="ex" value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value as Job["experience"] })}><option>Entry</option><option>Intermediate</option></Select></div>
              <div className="col-span-2"><Label htmlFor="l">Language required</Label><Select id="l" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })}>{["English", "Swahili", "Arabic", "French", "Somali"].map((l) => <option key={l}>{l}</option>)}</Select></div>
            </div>
            <div><Label htmlFor="desc">Description & deliverables</Label><Textarea id="desc" rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
            <p className="text-xs text-slate-500">By posting you confirm the job follows the KDWC anti-exploitation policy: fair pay and no fees charged to workers.</p>
            {err && <Alert kind="error">{err}</Alert>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button onClick={submit} disabled={busy}>{busy ? "Publishing…" : "Publish job"}</Button>
            </div>
          </div>
        )}
      </Modal>
      {toastNode}
    </>
  );
}
