"use client";
import Link from "next/link";
import { Check } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Badge, Button, Card, Empty, LinkButton, PageHeader, cx, money, timeAgo } from "@/components/ui";
import { displayName, withdrawApplication } from "@/lib/store";
import { useT } from "@/lib/i18n";

const STAGES = ["submitted", "shortlisted", "accepted"] as const;

export default function ApplicationsPage() {
  return (
    <AppShell roles={["worker"]}>
      <Applications />
    </AppShell>
  );
}

function Applications() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const apps = db.applications.filter((a) => a.workerId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeader title={t("applications")} subtitle="Track every application from submission to hire." />
      {apps.length === 0 ? (
        <Empty title="No applications yet"><div className="mt-3"><LinkButton href="/jobs">Find jobs</LinkButton></div></Empty>
      ) : (
        <div className="space-y-4">
          {apps.map((a) => {
            const job = db.jobs.find((j) => j.id === a.jobId)!;
            const contract = db.contracts.find((c) => c.jobId === a.jobId && c.workerId === user.id);
            const stageIdx = STAGES.indexOf(a.status as (typeof STAGES)[number]);
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{job.title}</h2>
                    <p className="text-sm text-slate-500">{displayName(db, job.employerId)} · {money(job.compensation)} · applied {timeAgo(a.createdAt)}</p>
                  </div>
                  {a.status === "rejected" ? <Badge color="red">Not selected</Badge> : a.status === "accepted" ? <Badge color="green">Hired</Badge> : <Badge color="blue">{a.status === "shortlisted" ? "Shortlisted" : "Under review"}</Badge>}
                </div>
                {a.status !== "rejected" && (
                  <ol className="mt-4 flex items-center gap-2 text-xs" aria-label="Application status">
                    {["Submitted", "Shortlisted", "Hired"].map((s, i) => (
                      <li key={s} className="flex flex-1 items-center gap-2">
                        <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", i <= stageIdx ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500")}>{i <= stageIdx ? <Check size={14} /> : i + 1}</span>
                        <span className={i <= stageIdx ? "font-semibold text-slate-800" : "text-slate-500"}>{s}</span>
                        {i < 2 && <span className={cx("h-0.5 flex-1", i < stageIdx ? "bg-brand-500" : "bg-slate-200")} />}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-4 flex gap-3">
                  {contract && <LinkButton href={`/contracts/${contract.id}`} className="py-1.5">Open contract</LinkButton>}
                  {a.status === "submitted" && <Button variant="ghost" className="py-1.5" onClick={() => withdrawApplication(a.id)}>Withdraw</Button>}
                  <Link href={`/jobs?open=${job.id}`} className="py-1.5 text-sm font-semibold text-brand-700 hover:underline">View job</Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
