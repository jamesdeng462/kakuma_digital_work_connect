"use client";
import Link from "next/link";
import { useState } from "react";
import { Award, Clock, Download, CheckCircle2, Search } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Badge, Card, Input, PageHeader, Progress, Select, cx } from "@/components/ui";
import { useT } from "@/lib/i18n";

export default function CoursesPage() {
  return (
    <AppShell>
      <Courses />
    </AppShell>
  );
}

function Courses() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("");
  const domains = [...new Set(db.courses.map((c) => c.domain))];
  const list = db.courses.filter((c) => (!domain || c.domain === domain) && (c.title + c.description).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title={t("courses")} subtitle="Competency-based digital skills courses. Pass each quiz with 70% or more to earn a verifiable certificate." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-2.5 text-slate-400" size={18} />
          <Input aria-label={t("search")} placeholder={`${t("search")}…`} value={q} onChange={(e) => setQ(e.target.value)} className="ps-10" />
        </div>
        <Select aria-label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} className="sm:w-56">
          <option value="">{t("allDomains")}</option>
          {domains.map((d) => <option key={d}>{d}</option>)}
        </Select>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const e = db.enrollments.find((x) => x.userId === user.id && x.courseId === c.id);
          const pct = e ? Math.round((e.completedLessons.length / c.lessons.length) * 100) : 0;
          return (
            <Link key={c.id} href={`/courses/${c.id}`} className="group">
              <Card className={cx("flex h-full flex-col transition group-hover:border-brand-300 group-hover:shadow-md", e?.passed && "border-brand-200")}>
                <div className="flex items-start justify-between gap-2">
                  <Badge color="green">{c.domain}</Badge>
                  {e?.passed && <span className="flex items-center gap-1 text-xs font-semibold text-brand-700"><Award size={14} /> Certified</span>}
                  {e?.downloaded && !e.passed && <span className="flex items-center gap-1 text-xs font-semibold text-sky-700"><Download size={14} /> Offline</span>}
                </div>
                <h2 className="mt-3 text-lg font-bold group-hover:text-brand-700">{c.title}</h2>
                <p className="mt-1 flex-1 text-sm text-slate-600">{c.description}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={14} /> {c.hours} hrs</span>
                  <span>{c.level}</span>
                  <span>{c.lessons.length} lessons</span>
                  <span>{c.sizeKb} KB</span>
                </div>
                {e && (
                  <div className="mt-3">
                    {e.passed ? (
                      <p className="flex items-center gap-1 text-sm font-semibold text-brand-700"><CheckCircle2 size={16} /> Completed · best score {e.bestScore}%</p>
                    ) : (
                      <>
                        <div className="mb-1 flex justify-between text-xs"><span>Progress</span><span>{pct}%</span></div>
                        <Progress value={pct} />
                      </>
                    )}
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
