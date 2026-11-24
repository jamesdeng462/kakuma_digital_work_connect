"use client";
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Flag, Send, UserPlus, X, Award } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Alert, Badge, Button, Card, Empty, Progress, Select, Textarea, timeAgo, useToast } from "@/components/ui";
import { addCohortMember, addPost, displayName, flagPost, removeCohortMember } from "@/lib/store";

export default function CohortPage() {
  return (
    <AppShell roles={["worker", "mentor", "admin"]}>
      <Cohort />
    </AppShell>
  );
}

function Cohort() {
  const { id } = useParams<{ id: string }>();
  const { db, user } = useAuthed();
  const { toast, toastNode } = useToast();
  const [text, setText] = useState("");
  const [pick, setPick] = useState("");
  const c = db.cohorts.find((x) => x.id === id);
  if (!c) return <Empty title="Cohort not found" />;
  const isMentor = user.id === c.mentorId;
  const canSee = isMentor || user.role === "admin" || c.memberIds.includes(user.id);
  if (!canSee) return <Empty title="You are not a member of this cohort" />;

  const posts = db.posts.filter((p) => p.cohortId === c.id && !p.hidden);
  const candidates = db.users.filter((u) => u.role === "worker" && !c.memberIds.includes(u.id));

  const post = async () => {
    if (!text.trim()) return;
    const r = await addPost(c.id, text.trim());
    if (!r.ok) return toast(r.error, "error");
    setText("");
    toast(r.flagged ? "Your post was flagged for review by moderators." : "Posted.", r.flagged ? "error" : "success");
  };

  return (
    <>
      <Link href="/cohorts" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft size={16} className="rtl-flip" /> Cohorts</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <p className="text-sm text-slate-500">{c.domain} · Mentor: {displayName(db, c.mentorId)}</p>
        </div>
        <Badge color={c.memberIds.length >= 8 ? "green" : "amber"}>{c.memberIds.length}/15 learners {c.memberIds.length < 8 && "· needs 8 to start"}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-4 font-bold">Discussion</h2>
          <ul className="space-y-4">
            {posts.length === 0 && <p className="text-sm text-slate-500">No posts yet. Start the conversation!</p>}
            {posts.map((p) => (
              <li key={p.id} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{displayName(db, p.authorId).split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                <div className="min-w-0 flex-1 rounded-lg bg-slate-50 p-3">
                  <p className="text-sm">
                    <strong>{displayName(db, p.authorId)}</strong> {p.authorId === c.mentorId && <Badge color="green">Mentor</Badge>}
                    <span className="ms-2 text-xs text-slate-500">{timeAgo(p.at)}</span>
                    {p.flagged && <span className="ms-2"><Badge color="red">under review</Badge></span>}
                  </p>
                  <p className="mt-1 text-sm text-slate-800">{p.text}</p>
                  {!p.flagged && p.authorId !== user.id && (
                    <button onClick={async () => { await flagPost(p.id); toast("Reported to moderators."); }} className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600"><Flag size={12} /> Report</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {(isMentor || c.memberIds.includes(user.id)) && (
            <div className="mt-5 flex gap-2 border-t pt-4">
              <Textarea aria-label="Write a post" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share a question, tip or update…" className="min-h-[60px]" />
              <Button onClick={post} aria-label="Post" className="self-end"><Send size={16} /></Button>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">Posts are screened automatically for scams and abuse; flagged posts go to human moderators.</p>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-bold">Members & progress</h2>
          {isMentor && (
            <div className="mb-4 flex gap-2">
              <Select aria-label="Add learner" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Add a learner…</option>
                {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
              <Button variant="secondary" disabled={!pick} onClick={async () => { const r = await addCohortMember(c.id, pick); if (!r.ok) toast(r.error, "error"); setPick(""); }}><UserPlus size={16} /></Button>
            </div>
          )}
          {c.memberIds.length >= 15 && isMentor && <div className="mb-3"><Alert kind="info">This cohort is full (15 learners).</Alert></div>}
          <ul className="space-y-3">
            {c.memberIds.map((mid) => {
              const m = db.users.find((u) => u.id === mid);
              if (!m) return null;
              const enr = db.enrollments.filter((e) => e.userId === mid);
              const certs = db.certificates.filter((x) => x.userId === mid).length;
              const lessons = enr.reduce((s, e) => s + e.completedLessons.length, 0);
              const total = enr.reduce((s, e) => s + (db.courses.find((k) => k.id === e.courseId)?.lessons.length ?? 0), 0);
              return (
                <li key={mid} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="flex items-center gap-2">
                      {certs > 0 && <span className="inline-flex items-center gap-0.5 text-xs text-sun-700"><Award size={12} />{certs}</span>}
                      {isMentor && <button aria-label={`Remove ${m.name}`} onClick={() => removeCohortMember(c.id, mid)} className="text-slate-400 hover:text-red-600"><X size={14} /></button>}
                    </span>
                  </div>
                  {(isMentor || user.role === "admin") && <div className="mt-1"><Progress value={total ? (lessons / total) * 100 : 0} /></div>}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      {toastNode}
    </>
  );
}
