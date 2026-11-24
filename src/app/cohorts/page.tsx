"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Alert, Badge, Button, Card, Empty, Input, Label, Modal, PageHeader, Select, useToast } from "@/components/ui";
import { createCohort, displayName } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useRouter } from "next/navigation";

export default function CohortsPage() {
  return (
    <AppShell roles={["worker", "mentor", "admin"]}>
      <Cohorts />
    </AppShell>
  );
}

function Cohorts() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const router = useRouter();
  const { toastNode } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("Data Entry");
  const [err, setErr] = useState("");
  const list = db.cohorts.filter((c) => user.role === "admin" || c.mentorId === user.id || c.memberIds.includes(user.id));

  const create = async () => {
    if (name.trim().length < 3) return setErr("Give the cohort a name.");
    const r = await createCohort(name.trim(), domain);
    if (r.ok) router.push(`/cohorts/${r.id}`);
    else setErr(r.error);
  };

  return (
    <>
      <PageHeader
        title={t("cohorts")}
        subtitle="Peer learning groups of 8–15 learners with a mentor, discussions and group work."
        action={user.role === "mentor" ? <Button onClick={() => setOpen(true)}><Plus size={18} /> New cohort</Button> : undefined}
      />
      {list.length === 0 ? <Empty title="You are not in a cohort yet">A mentor will add you to a learning cohort.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <Link key={c.id} href={`/cohorts/${c.id}`}>
              <Card className="h-full transition hover:border-brand-300 hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold">{c.name}</h2>
                    <p className="text-sm text-slate-500">{c.domain} · Mentor: {displayName(db, c.mentorId)}</p>
                  </div>
                  <Badge color={c.memberIds.length >= 8 ? "green" : "amber"}>{c.memberIds.length >= 8 ? "Active" : "Forming"}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <Users size={16} /> {c.memberIds.length}/15 learners · {db.posts.filter((p) => p.cohortId === c.id && !p.hidden).length} posts
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Create a cohort">
        <div className="space-y-4">
          <div><Label htmlFor="cn">Cohort name</Label><Input id="cn" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Skills Cohort B" /></div>
          <div><Label htmlFor="cd">Focus</Label><Select id="cd" value={domain} onChange={(e) => setDomain(e.target.value)}>{["Data Entry", "Graphic Design", "Web Development", "Customer Service", "Data Annotation", "Digital Marketing", "Financial Literacy"].map((d) => <option key={d}>{d}</option>)}</Select></div>
          <p className="text-xs text-slate-500">A cohort becomes active once it has at least 8 learners (maximum 15).</p>
          {err && <Alert kind="error">{err}</Alert>}
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button onClick={create}>Create</Button></div>
        </div>
      </Modal>
      {toastNode}
    </>
  );
}
