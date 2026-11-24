"use client";
// Anonymous safeguarding & GBV reporting channel (SRS 6.5). No account or identity is stored.
import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, ArrowLeft, Phone, Lock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Alert, Button, Card, Label, Select, Textarea } from "@/components/ui";
import { submitReport, useStore } from "@/lib/store";

const CATEGORIES = ["Exploitation / scam", "Harassment", "Gender-based violence (GBV)", "Child safeguarding", "Unfair payment", "Other"];

export default function ReportPage() {
  const { user } = useStore();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/"><Logo size={34} /></Link>
          <Link href={user ? "/dashboard" : "/"} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft size={16} className="rtl-flip" /> Back</Link>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600"><ShieldCheck /></span>
            <div>
              <h1 className="text-xl font-bold">Report a concern</h1>
              <p className="text-sm text-slate-600">Safe, confidential and anonymous.</p>
            </div>
          </div>
          {sent ? (
            <div className="mt-6 space-y-4">
              <Alert kind="success">Thank you. Your report was received and sent directly to the humanitarian partner safeguarding officers. You did the right thing.</Alert>
              <Button variant="secondary" onClick={() => { setSent(false); setText(""); }}>Make another report</Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><Lock size={16} className="mt-0.5 shrink-0" /> Your name and account are <strong>not</strong> attached to this report{user ? ", even though you are logged in" : ""}.</p>
              <div>
                <Label htmlFor="cat">What is this about?</Label>
                <Select id="cat" value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
              </div>
              <div>
                <Label htmlFor="desc">What happened?</Label>
                <Textarea id="desc" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share as much or as little as you are comfortable with." />
              </div>
              {err && <Alert kind="error">{err}</Alert>}
              <Button variant="danger" disabled={text.trim().length < 10} onClick={async () => { setErr(""); const r = await submitReport(category, text.trim()); if (r.ok) setSent(true); else setErr(r.error); }}>Send report anonymously</Button>
            </div>
          )}
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
            <p className="flex items-center gap-2 font-semibold"><Phone size={16} /> In immediate danger?</p>
            <p className="mt-1">Contact the nearest police post, health facility or protection desk in the camp, or call Kenya&apos;s free national GBV helpline <strong>1195</strong> (24 hours) or the UNHCR toll-free line <strong>1517</strong>.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
