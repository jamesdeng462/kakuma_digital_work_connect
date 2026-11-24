"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Award, BadgeCheck, Star, ExternalLink } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Badge, Button, Card, Empty, PageHeader, money, timeAgo, useToast } from "@/components/ui";
import { acceptApplication, setApplicationStatus } from "@/lib/store";

export default function ApplicantsPage() {
  return (
    <AppShell roles={["employer"]}>
      <Applicants />
    </AppShell>
  );
}

function Applicants() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { db, user } = useAuthed();
  const { toast, toastNode } = useToast();
  const job = db.jobs.find((j) => j.id === id && j.employerId === user.id);
  if (!job) return <Empty title="Job not found"><Link href="/employer/jobs" className="text-brand-700">Back</Link></Empty>;
  const apps = db.applications.filter((a) => a.jobId === job.id);

  return (
    <>
      <Link href="/employer/jobs" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft size={16} className="rtl-flip" /> My jobs</Link>
      <PageHeader title={job.title} subtitle={`${job.domain} · ${money(job.compensation)} · ${job.timeCommitment} · ${apps.length} applicants`} action={<Badge color={job.status === "open" ? "green" : "gray"}>{job.status}</Badge>} />
      <Card className="mb-6 text-sm text-slate-700">{job.description}</Card>
      {apps.length === 0 ? <Empty title="No applicants yet">Certified workers in {job.domain} were notified about this job.</Empty> : (
        <div className="space-y-4">
          {apps.map((a) => {
            const w = db.users.find((u) => u.id === a.workerId)!;
            const certs = db.certificates.filter((c) => c.userId === w.id);
            const contract = db.contracts.find((c) => c.jobId === job.id && c.workerId === w.id);
            return (
              <Card key={a.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">{w.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-bold">{w.name} <BadgeCheck size={16} className="text-brand-600" aria-label="Identity verified" /></p>
                      <p className="text-sm text-slate-500">{w.location} · <Star size={12} className="inline fill-sun-400 text-sun-400" /> {w.rating ?? "New"} · applied {timeAgo(a.createdAt)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {certs.map((c) => (
                          <Link key={c.id} href={`/verify/${c.id}`} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-2 py-0.5 text-xs font-semibold text-sun-700 hover:underline">
                            <Award size={12} /> {db.courses.find((x) => x.id === c.courseId)?.title} ({c.score}%)
                          </Link>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Skills: {w.skills.join(", ")}</p>
                      <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{a.coverLetter}</p>
                      {w.portfolioUrl && <a href={w.portfolioUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">Portfolio <ExternalLink size={12} /></a>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
                    {a.status === "accepted" ? (
                      <>
                        <Badge color="green">Hired</Badge>
                        {contract && <Button variant="secondary" className="py-1.5" onClick={() => router.push(`/contracts/${contract.id}`)}>View contract</Button>}
                      </>
                    ) : a.status === "rejected" ? (
                      <Badge color="red">Rejected</Badge>
                    ) : (
                      <>
                        {a.status === "shortlisted" ? <Badge color="blue">Shortlisted</Badge> : <Button variant="secondary" className="py-1.5" onClick={async () => { const r = await setApplicationStatus(a.id, "shortlisted"); toast(r.ok ? "Applicant shortlisted." : r.error, r.ok ? "success" : "error"); }}>Shortlist</Button>}
                        <Button className="py-1.5" onClick={async () => { const r = await acceptApplication(a.id); if (r.ok) router.push(`/contracts/${r.id}`); else toast(r.error, "error"); }}>Hire & create contract</Button>
                        <Button variant="ghost" className="py-1.5 text-red-700" onClick={async () => { const r = await setApplicationStatus(a.id, "rejected"); toast(r.ok ? "Applicant notified." : r.error, r.ok ? "success" : "error"); }}>Reject</Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {toastNode}
    </>
  );
}
