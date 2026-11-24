"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Check, Flag, ShieldAlert, Users, X, AlertTriangle, EyeOff, RotateCcw, Search } from "lucide-react";
import { AppShell, useAuthed, ROLE_LABEL } from "@/components/AppShell";
import { Badge, Button, Card, Empty, Input, PageHeader, cx, fmtDate, timeAgo, useToast } from "@/components/ui";
import { displayName, moderateJob, moderatePost, resetDemo, setEmployerStatus, useApi } from "@/lib/store";
import { SafeguardingListInline } from "@/components/SafeguardingInline";

const TABS = [
  { key: "employers", label: "Employer verification", icon: <Building2 size={16} /> },
  { key: "moderation", label: "Moderation", icon: <Flag size={16} /> },
  { key: "safeguarding", label: "Safeguarding", icon: <ShieldAlert size={16} /> },
  { key: "disputes", label: "Disputes", icon: <AlertTriangle size={16} /> },
  { key: "users", label: "Users", icon: <Users size={16} /> },
];

export default function AdminPage() {
  return (
    <AppShell roles={["admin"]}>
      <Suspense>
        <Admin />
      </Suspense>
    </AppShell>
  );
}

function Admin() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = params.get("tab") ?? "employers";
  const { db } = useAuthed();
  const counts: Record<string, number> = {
    employers: db.users.filter((u) => u.employerStatus === "pending").length,
    moderation: db.posts.filter((p) => p.flagged).length + db.jobs.filter((j) => j.flagged).length,
    safeguarding: db.reports.filter((r) => r.status === "new").length,
    disputes: db.contracts.filter((c) => c.status === "disputed").length,
    users: 0,
  };
  return (
    <>
      <PageHeader title="Administration" subtitle="Platform management, employer vetting, content moderation and safeguarding." />
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => router.replace(`/admin?tab=${t.key}`)} className={cx("flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold", tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
            {t.icon} {t.label} {counts[t.key] > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[11px] text-white">{counts[t.key]}</span>}
          </button>
        ))}
      </div>
      {tab === "employers" && <Employers />}
      {tab === "moderation" && <Moderation />}
      {tab === "safeguarding" && <Safeguarding />}
      {tab === "disputes" && <Disputes />}
      {tab === "users" && <UsersTab />}
    </>
  );
}

function Employers() {
  const { db } = useAuthed();
  const { toast, toastNode } = useToast();
  const employers = db.users.filter((u) => u.role === "employer").sort((a) => (a.employerStatus === "pending" ? -1 : 1));
  return (
    <>
      <div className="space-y-3">
        {employers.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{e.companyName}</p>
                <p className="text-sm text-slate-500">{e.name} · {e.email} · {e.location}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><Check size={12} className="text-brand-600" /> Reg. no. {e.companyRegNo}</span>
                  <span className="flex items-center gap-1">{e.antiExploitationAgreed ? <Check size={12} className="text-brand-600" /> : <X size={12} className="text-red-600" />} Anti-exploitation policy</span>
                  <span className="flex items-center gap-1"><Check size={12} className="text-brand-600" /> Payment capability confirmed</span>
                  <span>Registered {fmtDate(e.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {e.employerStatus === "pending" ? (
                  <>
                    <Button className="py-1.5" onClick={async () => { const r = await setEmployerStatus(e.id, "verified"); toast(r.ok ? `${e.companyName} verified.` : r.error, r.ok ? "success" : "error"); }}><Check size={16} /> Approve</Button>
                    <Button variant="ghost" className="py-1.5 text-red-700" onClick={async () => { const r = await setEmployerStatus(e.id, "rejected"); toast(r.ok ? `${e.companyName} rejected.` : r.error, r.ok ? "success" : "error"); }}>Reject</Button>
                  </>
                ) : (
                  <Badge color={e.employerStatus === "verified" ? "green" : "red"}>{e.employerStatus}</Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {toastNode}
    </>
  );
}

function Moderation() {
  const { db } = useAuthed();
  const { toast, toastNode } = useToast();
  const posts = db.posts.filter((p) => p.flagged);
  const jobs = db.jobs.filter((j) => j.flagged);
  return (
    <>
      {posts.length + jobs.length === 0 ? <Empty title="Nothing to review">Flagged posts, job listings and reviews appear here.</Empty> : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Card key={j.id} className="border-red-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-red-600">Job listing · {displayName(db, j.employerId)}</p>
                  <p className="font-bold">{j.title}</p>
                  <p className="text-sm text-slate-600">{j.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="danger" className="py-1.5" onClick={async () => { await moderateJob(j.id, "remove"); toast("Job removed."); }}><EyeOff size={16} /> Remove</Button>
                  <Button variant="secondary" className="py-1.5" onClick={async () => { await moderateJob(j.id, "restore"); toast("Job restored."); }}><RotateCcw size={16} /> Keep</Button>
                </div>
              </div>
            </Card>
          ))}
          {posts.map((p) => (
            <Card key={p.id} className="border-red-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-red-600">Cohort post · {displayName(db, p.authorId)} · {timeAgo(p.at)}</p>
                  <p className="text-sm text-slate-800">&ldquo;{p.text}&rdquo;</p>
                  <p className="text-xs text-slate-500">in {db.cohorts.find((c) => c.id === p.cohortId)?.name}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="danger" className="py-1.5" onClick={async () => { await moderatePost(p.id, "hide"); toast("Post hidden."); }}><EyeOff size={16} /> Hide</Button>
                  <Button variant="secondary" className="py-1.5" onClick={async () => { await moderatePost(p.id, "restore"); toast("Post restored."); }}><RotateCcw size={16} /> Keep</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">Content is auto-screened for scam and abuse patterns; anything flagged is escalated here for human review.</p>
      {toastNode}
    </>
  );
}

function Safeguarding() {
  return (
    <>
      <p className="mb-4 text-sm text-slate-600">Reports come from the anonymous safeguarding & GBV channel. No reporter identity is stored. Escalate to humanitarian partner safeguarding officers for follow-up.</p>
      <SafeguardingListInline />
    </>
  );
}

function Disputes() {
  const { db } = useAuthed();
  const list = db.contracts.filter((c) => c.status === "disputed");
  return list.length === 0 ? <Empty title="No open disputes" /> : (
    <div className="space-y-3">
      {list.map((c) => (
        <Card key={c.id} className="p-4">
          <p className="font-bold">{db.jobs.find((j) => j.id === c.jobId)?.title}</p>
          <p className="text-sm text-slate-600">{displayName(db, c.workerId)} ↔ {displayName(db, c.employerId)}</p>
          <p className="mt-1 text-sm">Reason: {c.dispute}</p>
          <Link href={`/contracts/${c.id}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">Open contract & resolve →</Link>
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const { db } = useAuthed();
  const [q, setQ] = useState("");
  const list = db.users.filter((u) => (u.name + u.email + (u.companyName ?? "")).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute start-3 top-2.5 text-slate-400" size={18} />
          <Input aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="ps-10" />
        </div>
        <Button variant="ghost" onClick={async () => { if (confirm("Reset ALL data in the database to the original demo data?")) { await resetDemo(); } }}><RotateCcw size={16} /> Reset demo data</Button>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Verified by</th><th className="px-4 py-2">Origin</th><th className="px-4 py-2">Joined</th></tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2"><p className="font-medium">{u.companyName ?? u.name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
                <td className="px-4 py-2">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-2">{u.verifiedBy}</td>
                <td className="px-4 py-2">{u.nationality}</td>
                <td className="px-4 py-2 text-slate-500">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <AuditLog />
    </>
  );
}

function AuditLog() {
  const { data } = useApi<{ id: number; actorId: string | null; action: string; target: string | null; at: string }[]>("/admin/audit");
  const { db } = useAuthed();
  return (
    <Card className="mt-6 p-0">
      <h2 className="px-5 pt-5 font-bold">Audit log</h2>
      <p className="px-5 text-xs text-slate-500">Privileged and security-relevant actions, recorded on the server.</p>
      <ul className="mt-3 max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
        {(data ?? []).slice(0, 50).map((a) => (
          <li key={a.id} className="flex flex-wrap justify-between gap-2 px-5 py-2">
            <span><span className="font-mono text-xs text-brand-700">{a.action}</span> {a.target && <span className="text-slate-500">· {a.target}</span>}</span>
            <span className="text-xs text-slate-500">{a.actorId ? displayName(db, a.actorId) : "system"} · {timeAgo(a.at)}</span>
          </li>
        ))}
        {data && data.length === 0 && <li className="px-5 py-4 text-slate-500">No entries yet.</li>}
      </ul>
    </Card>
  );
}
