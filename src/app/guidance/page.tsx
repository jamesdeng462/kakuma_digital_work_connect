"use client";
import Link from "next/link";
import { Bot, BookOpen, Briefcase, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Badge, Card, PageHeader, Progress, money } from "@/components/ui";
import { recommendCourses, recommendJobs } from "@/lib/ai";
import { useT } from "@/lib/i18n";

export default function GuidancePage() {
  return (
    <AppShell roles={["worker"]}>
      <Guidance />
    </AppShell>
  );
}

function Guidance() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const courses = recommendCourses(db, user).slice(0, 4);
  const jobs = recommendJobs(db, user).slice(0, 4);
  const certs = db.certificates.filter((c) => c.userId === user.id);
  const enrolls = db.enrollments.filter((e) => e.userId === user.id);
  const avg = enrolls.filter((e) => e.bestScore !== null).reduce((s, e, _, arr) => s + (e.bestScore ?? 0) / arr.length, 0);
  const readiness = Math.min(100, certs.length * 30 + (user.portfolioUrl ? 15 : 0) + (user.skills.length >= 3 ? 15 : user.skills.length * 5) + (user.bio ? 10 : 0));

  // Demand by domain across open jobs
  const demand = Object.entries(
    db.jobs.filter((j) => j.status === "open" && !j.flagged).reduce<Record<string, number>>((a, j) => ((a[j.domain] = (a[j.domain] ?? 0) + j.compensation), a), {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader title={t("guidance")} subtitle="Personalised learning path and job matches from your assessment results, goals and market demand." />

      <Card className="mb-6 bg-gradient-to-br from-brand-800 to-brand-600 text-white">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><Bot /></span>
          <div className="flex-1">
            <p className="font-bold">Hi {user.name.split(" ")[0]}, here is your career plan</p>
            <p className="mt-1 text-sm text-brand-50">
              Goal: <strong>{user.goal ?? "Remote digital work"}</strong>. You hold {certs.length} certificate{certs.length !== 1 && "s"}
              {avg ? ` with an average assessment score of ${Math.round(avg)}%` : ""}.
              {courses[0] && <> The highest-impact next step is <strong>{courses[0].course.title}</strong> - {courses[0].reason.toLowerCase()}.</>}
            </p>
            <div className="mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-xs"><span>Job readiness</span><span>{readiness}%</span></div>
              <div className="h-2 rounded-full bg-white/20"><div className="h-2 rounded-full bg-sun-400" style={{ width: `${readiness}%` }} /></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-bold"><Target size={18} className="text-brand-600" /> Your learning path</h2>
          <ol className="space-y-3">
            {certs.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg bg-brand-50 p-3 text-sm">
                <CheckCircle2 className="shrink-0 text-brand-600" size={20} />
                <span className="flex-1 font-medium">{db.courses.find((x) => x.id === c.courseId)?.title}</span>
                <Badge color="green">Done</Badge>
              </li>
            ))}
            {courses.map((s, i) => (
              <li key={s.course.id}>
                <Link href={`/courses/${s.course.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:border-brand-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">{certs.length + i + 1}</span>
                  <span className="flex-1">
                    <span className="block font-medium">{s.course.title}</span>
                    <span className="text-xs text-slate-500">{s.reason}</span>
                  </span>
                  <BookOpen size={16} className="text-brand-600" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-bold"><Briefcase size={18} className="text-brand-600" /> Best job matches</h2>
          <ul className="space-y-3">
            {jobs.map(({ job, score, reasons }) => (
              <li key={job.id}>
                <Link href={`/jobs?open=${job.id}`} className="block rounded-lg border border-slate-200 p-3 hover:border-brand-300">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-semibold">{job.title}</span>
                    <span className="font-bold">{money(job.compensation)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <Progress value={score} />
                    <span className="w-12 text-right text-xs font-semibold">{score}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{reasons.join(" · ")}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><TrendingUp size={18} className="text-brand-600" /> Market demand right now (open job value by skill)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {demand.map(([d, v]) => (
              <div key={d} className="rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-600">{d}</p>
                <p className="text-xl font-bold">{money(v)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">Prototype note: recommendations come from an on-device scoring model (works offline). In production the same interface calls the OpenAI-powered career engine described in the SRS.</p>
        </Card>
      </div>
    </>
  );
}
