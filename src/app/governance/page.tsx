"use client";
import { useState } from "react";
import { Plus, ThumbsDown, ThumbsUp, Lock } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Alert, Badge, Button, Card, Input, Label, Modal, PageHeader, Textarea, fmtDate, useToast } from "@/components/ui";
import { closePolicy, displayName, proposePolicy, vote } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function GovernancePage() {
  return (
    <AppShell>
      <Governance />
    </AppShell>
  );
}

function Governance() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const { toast, toastNode } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const isGov = user.role === "governor";
  // Governors propose; youth, mentors and governors vote on platform features.
  const canVote = ["governor", "worker", "mentor"].includes(user.role);

  const submit = async () => {
    if (title.trim().length < 5 || desc.trim().length < 15) return toast("Add a clear title and description.", "error");
    const r = await proposePolicy(title.trim(), desc.trim());
    if (!r.ok) return toast(r.error, "error");
    setOpen(false); setTitle(""); setDesc("");
    toast("Proposal published for community voting.");
  };

  return (
    <>
      <PageHeader
        title={t("governance")}
        subtitle="Youth-led governance: elected youth representatives propose platform policies and the community votes."
        action={isGov ? <Button onClick={() => setOpen(true)}><Plus size={18} /> New proposal</Button> : undefined}
      />
      {!canVote && <div className="mb-4"><Alert kind="info">You can view proposals and results. Voting is open to youth members, mentors and youth governors.</Alert></div>}
      <div className="space-y-4">
        {db.policies.map((p) => {
          const total = p.votesFor.length + p.votesAgainst.length;
          const pctFor = total ? Math.round((p.votesFor.length / total) * 100) : 0;
          const mine = p.votesFor.includes(user.id) ? "for" : p.votesAgainst.includes(user.id) ? "against" : null;
          return (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold">{p.title}</h2>
                  <p className="text-xs text-slate-500">Proposed by {displayName(db, p.proposerId)} · {fmtDate(p.at)}</p>
                </div>
                {p.status === "open" ? <Badge color="blue">Voting open</Badge> : <Badge color={pctFor >= 50 ? "green" : "red"}>{pctFor >= 50 ? "Passed" : "Rejected"}</Badge>}
              </div>
              <p className="mt-3 text-sm text-slate-700">{p.description}</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs font-semibold"><span className="text-brand-700">{p.votesFor.length} for ({pctFor}%)</span><span className="text-red-600">{p.votesAgainst.length} against</span></div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-red-200"><div className="bg-brand-500" style={{ width: `${total ? pctFor : 0}%` }} /></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {p.status === "open" && canVote && (
                  <>
                    <Button variant={mine === "for" ? "primary" : "secondary"} className="py-1.5" onClick={() => vote(p.id, "for")}><ThumbsUp size={16} /> For</Button>
                    <Button variant={mine === "against" ? "danger" : "secondary"} className="py-1.5" onClick={() => vote(p.id, "against")}><ThumbsDown size={16} /> Against</Button>
                    {mine && <span className="text-xs text-slate-500">You voted {mine}. You can change your vote while voting is open.</span>}
                  </>
                )}
                {p.status === "open" && isGov && p.proposerId === user.id && (
                  <Button variant="ghost" className="ms-auto py-1.5" onClick={() => closePolicy(p.id)}><Lock size={14} /> Close voting</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="New policy proposal">
        <div className="space-y-4">
          <div><Label htmlFor="pt">Title</Label><Input id="pt" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label htmlFor="pd">What should change and why?</Label><Textarea id="pd" rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>{t("cancel")}</Button><Button onClick={submit}>Publish</Button></div>
        </div>
      </Modal>
      {toastNode}
    </>
  );
}
