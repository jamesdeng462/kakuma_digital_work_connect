"use client";
import Link from "next/link";
import { Award, Briefcase, FileSignature, Send, Wallet, Sparkles, Users, ShieldAlert, Clock, Flag, Building2, Vote, BarChart3, TrendingUp, AlertTriangle } from "lucide-react";
import { AppShell, useAuthed, ROLE_LABEL } from "@/components/AppShell";
import { Alert, Badge, Card, Empty, LinkButton, PageHeader, Progress, Stat, money, timeAgo } from "@/components/ui";
import { balanceOf, displayName, hasVerifiedModule } from "@/lib/store";
import { recommendJobs } from "@/lib/ai";
import { useT } from "@/lib/i18n";
import type { ImpactMetrics } from "@/lib/metrics";
import { useApi } from "@/lib/store";
import { Loader } from "@/components/AppShell";
import { ContractBadge } from "@/components/ContractBadge";

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const { user } = useAuthed();
  switch (user.role) {
    case "worker":
      return <WorkerDash />;
    case "employer":
      return <EmployerDash />;
    case "mentor":
      return <MentorDash />;
    case "admin":
      return <AdminDash />;
    case "partner":
      return <PartnerDash />;
    case "governor":
      return <GovernorDash />;
  }
}

function Greeting() {
  const { user } = useAuthed();
  const { t } = useT();
  return <PageHeader title={`${t("welcome")}, ${user.name.split(" ")[0]} 👋`} subtitle={`${ROLE_LABEL[user.role]}${user.companyName ? " · " + user.companyName : ""} · ${user.location}`} />;
}

function WorkerDash() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const certs = db.certificates.filter((c) => c.userId === user.id);
  const learning = db.enrollments.filter((e) => e.userId === user.id && !e.passed);
  const contracts = db.contracts.filter((c) => c.workerId === user.id && !["paid"].includes(c.status));
  const apps = db.applications.filter((a) => a.workerId === user.id && ["submitted", "shortlisted"].includes(a.status));
  const recs = recommendJobs(db, user).slice(0, 3);
  const canApply = hasVerifiedModule(db, user.id);

  return (
    <>
      <Greeting />
      {!canApply && (
        <div className="mb-6">
          <Alert kind="warn">Complete your first course with 70% or more to earn a certificate and unlock job applications. <Link className="font-semibold underline" href="/courses">Go to courses →</Link></Alert>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t("balance")} value={money(balanceOf(db, user.id))} icon={<Wallet size={18} />} hint="KDWC wallet" />
        <Stat label={t("certificates")} value={certs.length} icon={<Award size={18} />} hint="Verified credentials" />
        <Stat label="Active contracts" value={contracts.length} icon={<FileSignature size={18} />} />
        <Stat label="Open applications" value={apps.length} icon={<Send size={18} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold"><Sparkles size={18} className="text-sun-500" /> {t("recommendedJobs")}</h2>
            <Link href="/jobs" className="text-sm font-semibold text-brand-700 hover:underline">{t("viewAll")}</Link>
          </div>
          <ul className="space-y-3">
            {recs.map(({ job, score, reasons }) => (
              <li key={job.id}>
                <Link href={`/jobs?open=${job.id}`} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3 hover:border-brand-300 hover:bg-brand-50/40">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{job.title}</p>
                    <p className="text-xs text-slate-500">{displayName(db, job.employerId)} · {job.domain} · {job.timeCommitment}</p>
                    <p className="mt-1 text-xs text-brand-700">{reasons[0]}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold">{money(job.compensation)}</p>
                    <Badge color={score >= 70 ? "green" : score >= 45 ? "amber" : "gray"}>{score}% match</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-bold">{t("continueLearning")}</h2>
          {learning.length === 0 ? (
            <Empty title="No courses in progress"><Link href="/courses" className="font-semibold text-brand-700">Browse courses</Link></Empty>
          ) : (
            <ul className="space-y-4">
              {learning.map((e) => {
                const c = db.courses.find((x) => x.id === e.courseId)!;
                const pct = Math.round((e.completedLessons.length / c.lessons.length) * 100);
                return (
                  <li key={e.id}>
                    <Link href={`/courses/${c.id}`} className="block rounded-lg p-2 hover:bg-slate-50">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold">{c.title}</span>
                        <span className="text-slate-500">{pct}%</span>
                      </div>
                      <Progress value={pct} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {contracts.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 font-bold">Your work</h2>
              <ul className="space-y-2">
                {contracts.map((c) => (
                  <li key={c.id}>
                    <Link href={`/contracts/${c.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50">
                      <span className="font-medium">{db.jobs.find((j) => j.id === c.jobId)?.title}</span>
                      <ContractBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function EmployerDash() {
  const { db, user } = useAuthed();
  const jobs = db.jobs.filter((j) => j.employerId === user.id);
  const jobIds = new Set(jobs.map((j) => j.id));
  const apps = db.applications.filter((a) => jobIds.has(a.jobId));
  const pendingApps = apps.filter((a) => a.status === "submitted" || a.status === "shortlisted");
  const contracts = db.contracts.filter((c) => c.employerId === user.id);
  const toReview = contracts.filter((c) => c.status === "submitted" || c.status === "approved" || (c.status === "awaiting_signatures" && !c.employerSigned));

  return (
    <>
      <Greeting />
      {user.employerStatus === "pending" && (
        <div className="mb-6">
          <Alert kind="warn"><strong>Verification pending.</strong> A KDWC administrator is reviewing your company (registration, payment capability, anti-exploitation agreement). You can post jobs once approved - Business Rule BR2.</Alert>
        </div>
      )}
      {user.employerStatus === "rejected" && <div className="mb-6"><Alert kind="error">Your verification was not approved. Please contact support.</Alert></div>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open jobs" value={jobs.filter((j) => j.status === "open").length} icon={<Briefcase size={18} />} />
        <Stat label="New applicants" value={pendingApps.length} icon={<Users size={18} />} />
        <Stat label="Active contracts" value={contracts.filter((c) => !["paid"].includes(c.status)).length} icon={<FileSignature size={18} />} />
        <Stat label="Wallet balance" value={money(balanceOf(db, user.id))} icon={<Wallet size={18} />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Needs your action</h2>
          </div>
          {toReview.length === 0 && pendingApps.length === 0 ? (
            <Empty title="All caught up" />
          ) : (
            <ul className="space-y-2">
              {toReview.map((c) => (
                <li key={c.id}>
                  <Link href={`/contracts/${c.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50">
                    <span><strong>{displayName(db, c.workerId)}</strong> · {db.jobs.find((j) => j.id === c.jobId)?.title}</span>
                    <ContractBadge status={c.status} />
                  </Link>
                </li>
              ))}
              {pendingApps.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link href={`/employer/jobs/${a.jobId}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50">
                    <span>New applicant <strong>{displayName(db, a.workerId)}</strong> · {db.jobs.find((j) => j.id === a.jobId)?.title}</span>
                    <span className="text-xs text-slate-500">{timeAgo(a.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Your job posts</h2>
            <LinkButton href="/employer/jobs?new=1" className="py-1.5">Post a job</LinkButton>
          </div>
          {jobs.length === 0 ? <Empty title="No jobs posted yet" /> : (
            <ul className="space-y-2">
              {jobs.slice(0, 6).map((j) => (
                <li key={j.id}>
                  <Link href={`/employer/jobs/${j.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50">
                    <span className="font-medium">{j.title}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{db.applications.filter((a) => a.jobId === j.id).length} applicants</span>
                      <Badge color={j.status === "open" ? "green" : "gray"}>{j.status}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function MentorDash() {
  const { db, user } = useAuthed();
  const cohorts = db.cohorts.filter((c) => c.mentorId === user.id);
  const learners = new Set(cohorts.flatMap((c) => c.memberIds));
  const certified = [...learners].filter((id) => db.certificates.some((c) => c.userId === id)).length;
  const recentPosts = db.posts.filter((p) => cohorts.some((c) => c.id === p.cohortId) && !p.hidden).slice(-4).reverse();
  return (
    <>
      <Greeting />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="My cohorts" value={cohorts.length} icon={<Users size={18} />} />
        <Stat label="Learners" value={learners.size} />
        <Stat label="Certified learners" value={certified} icon={<Award size={18} />} />
        <Stat label="Certification rate" value={`${learners.size ? Math.round((certified / learners.size) * 100) : 0}%`} icon={<TrendingUp size={18} />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Cohorts</h2>
            <LinkButton href="/cohorts" variant="secondary" className="py-1.5">Manage</LinkButton>
          </div>
          <ul className="space-y-2">
            {cohorts.map((c) => (
              <li key={c.id}>
                <Link href={`/cohorts/${c.id}`} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm hover:bg-slate-50">
                  <span className="font-medium">{c.name}</span>
                  <Badge color={c.memberIds.length >= 8 ? "green" : "amber"}>{c.memberIds.length}/15 learners</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Recent discussion</h2>
          <ul className="space-y-3">
            {recentPosts.map((p) => (
              <li key={p.id} className="text-sm">
                <p><strong>{displayName(db, p.authorId)}</strong> <span className="text-xs text-slate-500">· {timeAgo(p.at)}</span> {p.flagged && <Badge color="red">flagged</Badge>}</p>
                <p className="text-slate-700">{p.text}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function AdminDash() {
  const { db } = useAuthed();
  const { data: m } = useApi<ImpactMetrics>("/impact");
  if (!m) return <Loader />;
  const newReports = db.reports.filter((r) => r.status === "new").length;
  return (
    <>
      <Greeting />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Registered users" value={m.totalUsers} icon={<Users size={18} />} />
        <Stat label="Course completions" value={m.certificates} icon={<Award size={18} />} />
        <Stat label="Job placements" value={m.placements} icon={<Briefcase size={18} />} />
        <Stat label="Payments processed" value={money(m.totalEarnings)} icon={<Wallet size={18} />} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <ActionTile href="/admin?tab=employers" icon={<Building2 />} label="Employers to verify" count={m.pendingEmployers} />
        <ActionTile href="/admin?tab=moderation" icon={<Flag />} label="Flagged content" count={m.flaggedItems} />
        <ActionTile href="/admin?tab=safeguarding" icon={<ShieldAlert />} label="New safeguarding reports" count={newReports} danger />
        <ActionTile href="/admin?tab=disputes" icon={<AlertTriangle />} label="Open disputes" count={m.openDisputes} />
      </div>
      <Card className="mt-6">
        <h2 className="mb-2 font-bold">System health</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> API: operational</p>
          <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> M-Pesa (sandbox): operational</p>
          <p className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> UNHCR ProGres (sandbox): operational</p>
        </div>
      </Card>
    </>
  );
}

function ActionTile({ href, icon, label, count, danger }: { href: string; icon: React.ReactNode; label: string; count: number; danger?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${count && danger ? "border-red-300" : "border-slate-200"}`}>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${count && danger ? "bg-red-100 text-red-600" : "bg-brand-100 text-brand-700"}`}>{icon}</span>
      <span>
        <span className="block text-2xl font-bold">{count}</span>
        <span className="text-sm text-slate-600">{label}</span>
      </span>
    </Link>
  );
}

function PartnerDash() {
  const { db } = useAuthed();
  const { data: m } = useApi<ImpactMetrics>("/impact");
  if (!m) return <Loader />;
  return (
    <>
      <Greeting />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Youth registered" value={m.youth} icon={<Users size={18} />} />
        <Stat label="Women participation" value={`${m.womenPct}%`} />
        <Stat label="Youth earnings" value={money(m.totalEarnings)} icon={<Wallet size={18} />} />
        <Stat label="Job placements" value={m.placements} icon={<Briefcase size={18} />} />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ActionTile href="/impact" icon={<BarChart3 />} label="Countries of origin reached - open impact dashboard" count={m.countries} />
        <ActionTile href="/impact#safeguarding" icon={<ShieldAlert />} label="Safeguarding reports escalated" count={db.reports.filter((r) => r.status === "escalated").length} danger />
      </div>
    </>
  );
}

function GovernorDash() {
  const { db, user } = useAuthed();
  const open = db.policies.filter((p) => p.status === "open");
  const { data: m } = useApi<ImpactMetrics>("/impact");
  if (!m) return <Loader />;
  return (
    <>
      <Greeting />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open proposals" value={open.length} icon={<Vote size={18} />} />
        <Stat label="My proposals" value={db.policies.filter((p) => p.proposerId === user.id).length} />
        <Stat label="Youth registered" value={m.youth} icon={<Users size={18} />} />
        <Stat label="Youth earnings" value={money(m.totalEarnings)} icon={<Wallet size={18} />} />
      </div>
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Open proposals</h2>
          <LinkButton href="/governance" className="py-1.5">Propose / vote</LinkButton>
        </div>
        <ul className="space-y-2">
          {open.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
              <span className="font-medium">{p.title}</span>
              <span className="flex items-center gap-1 text-xs text-slate-500"><Clock size={14} /> {p.votesFor.length} for · {p.votesAgainst.length} against</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
