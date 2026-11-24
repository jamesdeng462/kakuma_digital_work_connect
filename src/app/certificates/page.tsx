"use client";
import Link from "next/link";
import { Award, ExternalLink } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Badge, Card, Empty, LinkButton, PageHeader, fmtDate } from "@/components/ui";
import { useT } from "@/lib/i18n";

export default function CertificatesPage() {
  return (
    <AppShell roles={["worker"]}>
      <Certificates />
    </AppShell>
  );
}

function Certificates() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const certs = db.certificates.filter((c) => c.userId === user.id);
  return (
    <>
      <PageHeader title={t("certificates")} subtitle="Digitally signed credentials. Share the link or QR code with any employer to verify." />
      {certs.length === 0 ? (
        <Empty title="No certificates yet">
          Pass a course quiz with 70% or more to earn your first certificate.
          <div className="mt-3"><LinkButton href="/courses">Browse courses</LinkButton></div>
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {certs.map((c) => {
            const course = db.courses.find((x) => x.id === c.courseId);
            return (
              <Card key={c.id} className="flex flex-col">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sun-100 text-sun-500"><Award /></span>
                  <div className="min-w-0">
                    <Badge color="green">{course?.domain}</Badge>
                    <h2 className="mt-1 font-bold">{course?.title}</h2>
                    <p className="text-sm text-slate-500">Issued {fmtDate(c.issueDate)} · Score {c.score}%</p>
                    <p className="mt-1 truncate font-mono text-xs text-slate-400" title={c.id}>ID {c.id}</p>
                  </div>
                </div>
                <Link href={`/verify/${c.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                  View & share certificate <ExternalLink size={14} />
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
