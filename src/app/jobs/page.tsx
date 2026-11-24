"use client";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Briefcase, Clock, Flag, Languages, Search, Sparkles, Star, Lock, SlidersHorizontal } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Alert, Badge, Button, Card, Empty, Input, Label, Modal, PageHeader, Select, Textarea, money, timeAgo, useToast } from "@/components/ui";
import { applyToJob, displayName, flagJob, hasVerifiedModule } from "@/lib/store";
import { recommendJobs } from "@/lib/ai";
import { useT } from "@/lib/i18n";

export default function JobsPage() {
  return (
    <AppShell roles={["worker"]}>
      <Suspense>
        <Jobs />
      </Suspense>
    </AppShell>
  );
}

function Jobs() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const params = useSearchParams();
  const { toast, toastNode } = useToast();
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("");
  const [time, setTime] = useState("");
  const [exp, setExp] = useState("");
  const [lang, setLang] = useState("");
  const [minPay, setMinPay] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cover, setCover] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const o = params.get("open");
    if (o) setOpenId(o);
  }, [params]);

  const matches = useMemo(() => recommendJobs(db, user), [db, user]);
  const canApply = hasVerifiedModule(db, user.id);
  const domains = [...new Set(db.jobs.map((j) => j.domain))];
  const languages = [...new Set(db.jobs.map((j) => j.language))];

  const list = matches.filter(({ job }) =>
    (!domain || job.domain === domain) &&
    (!time || job.timeCommitment === time) &&
    (!exp || job.experience === exp) &&
    (!lang || job.language === lang) &&
    job.compensation >= minPay &&
    (job.title + job.description).toLowerCase().includes(q.toLowerCase())
  );

  const open = matches.find((m) => m.job.id === openId);
  const applied = (jobId: string) => db.applications.some((a) => a.jobId === jobId && a.workerId === user.id);
  const myCerts = db.certificates.filter((c) => c.userId === user.id).map((c) => db.courses.find((x) => x.id === c.courseId)?.title);

  const openJob = (id: string) => {
    setOpenId(id);
    setError("");
    const job = db.jobs.find((j) => j.id === id)!;
    setCover(`Dear ${displayName(db, job.employerId)},\n\nI am interested in "${job.title}". ${myCerts.length ? `I hold KDWC certificates in ${myCerts.join(", ")}.` : ""} I am reliable, detail-oriented and available to start immediately.\n\nKind regards,\n${user.name}`);
  };

  const [busy, setBusy] = useState(false);
  const apply = async () => {
    if (!open) return;
    setBusy(true);
    const r = await applyToJob(open.job.id, cover);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setOpenId(null);
    toast("Application sent! Track it under Applications.");
  };

  return (
    <>
      <PageHeader title={t("jobs")} subtitle="Remote jobs from verified employers, ranked for you by the KDWC career engine." />
      {!canApply && (
        <div className="mb-4">
          <Alert kind="warn"><span className="inline-flex items-center gap-2"><Lock size={16} /> You can browse jobs now. To apply, complete at least one course with 70%+ (Business Rule BR1).</span> <Link href="/courses" className="font-semibold underline">Start a course</Link></Alert>
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-2.5 text-slate-400" size={18} />
          <Input aria-label="Search jobs" placeholder="Search jobs…" value={q} onChange={(e) => setQ(e.target.value)} className="ps-10" />
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><SlidersHorizontal size={16} /> Filters</Button>
      </div>
      {showFilters && (
        <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div><Label htmlFor="f-d">Skill domain</Label><Select id="f-d" value={domain} onChange={(e) => setDomain(e.target.value)}><option value="">All</option>{domains.map((d) => <option key={d}>{d}</option>)}</Select></div>
          <div><Label htmlFor="f-t">Time commitment</Label><Select id="f-t" value={time} onChange={(e) => setTime(e.target.value)}><option value="">Any</option><option>Part-time</option><option>Full-time</option><option>Short project</option></Select></div>
          <div><Label htmlFor="f-e">Experience</Label><Select id="f-e" value={exp} onChange={(e) => setExp(e.target.value)}><option value="">Any</option><option>Entry</option><option>Intermediate</option></Select></div>
          <div><Label htmlFor="f-l">Language</Label><Select id="f-l" value={lang} onChange={(e) => setLang(e.target.value)}><option value="">Any</option>{languages.map((l) => <option key={l}>{l}</option>)}</Select></div>
          <div><Label htmlFor="f-p">Min pay: ${minPay}</Label><input id="f-p" type="range" min={0} max={300} step={10} value={minPay} onChange={(e) => setMinPay(+e.target.value)} className="w-full accent-brand-600" /></div>
        </Card>
      )}

      <p className="mb-3 text-sm text-slate-500">{list.length} jobs · sorted by AI match</p>
      {list.length === 0 ? <Empty title="No jobs match your filters" /> : (
        <div className="space-y-3">
          {list.map(({ job, score, reasons }) => {
            const emp = db.users.find((u) => u.id === job.employerId);
            return (
              <Card key={job.id} className="p-4 transition hover:border-brand-300">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <button onClick={() => openJob(job.id)} className="min-w-0 text-left">
                    <h2 className="font-bold text-slate-900 hover:text-brand-700">{job.title}</h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1">{emp?.companyName} <BadgeCheck size={14} className="text-brand-600" aria-label="Verified employer" /></span>
                      <span>· <Star size={12} className="inline fill-sun-400 text-sun-400" /> {emp?.rating ?? "New"}</span>
                      <span>· {timeAgo(job.createdAt)}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge color="green">{job.domain}</Badge>
                      <Badge><Clock size={12} /> {job.timeCommitment}</Badge>
                      <Badge>{job.experience}</Badge>
                      <Badge><Languages size={12} /> {job.language}</Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-xs text-brand-700"><Sparkles size={12} /> {reasons.join(" · ")}</p>
                  </button>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                    <span className="text-lg font-bold">{money(job.compensation)}</span>
                    <Badge color={score >= 70 ? "green" : score >= 45 ? "amber" : "gray"}>{score}% match</Badge>
                    {applied(job.id) ? <Badge color="blue">{t("applied")}</Badge> : <Button className="py-1.5" onClick={() => openJob(job.id)}>{t("apply")}</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpenId(null)} title={open?.job.title ?? ""}>
        {open && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge color="green">{open.job.domain}</Badge>
              <Badge>{open.job.timeCommitment}</Badge>
              <Badge>{open.job.language}</Badge>
              <Badge color="amber">{money(open.job.compensation)}</Badge>
            </div>
            <p className="text-sm text-slate-700">{open.job.description}</p>
            <p className="text-sm text-slate-500"><Briefcase size={14} className="inline" /> {displayName(db, open.job.employerId)} · verified employer</p>
            {applied(open.job.id) ? (
              <Alert kind="info">You already applied. <Link href="/applications" className="font-semibold underline">Track status</Link></Alert>
            ) : (
              <>
                <div>
                  <Label htmlFor="cover">Cover letter (pre-filled from your profile)</Label>
                  <Textarea id="cover" rows={7} value={cover} onChange={(e) => setCover(e.target.value)} />
                </div>
                <p className="text-xs text-slate-500">Your profile, certificates{user.portfolioUrl ? " and portfolio link" : ""} will be attached automatically.</p>
                {error && <Alert kind="error">{error}</Alert>}
                <div className="flex justify-between gap-2">
                  <Button variant="ghost" onClick={async () => { await flagJob(open.job.id); setOpenId(null); toast("Thanks - this job was reported to moderators."); }}><Flag size={16} /> Report job</Button>
                  <Button onClick={apply} disabled={!canApply || busy}>{canApply ? "Send application" : <><Lock size={16} /> Complete a course first</>}</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      {toastNode}
    </>
  );
}
