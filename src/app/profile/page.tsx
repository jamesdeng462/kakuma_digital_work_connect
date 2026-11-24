"use client";
import { useState } from "react";
import { BadgeCheck, Fingerprint, IdCard, Mail, Smartphone, FileUp, Star } from "lucide-react";
import { AppShell, useAuthed, ROLE_LABEL } from "@/components/AppShell";
import { Badge, Button, Card, Input, Label, PageHeader, Textarea, fmtDate, useToast } from "@/components/ui";
import { updateProfile, setLanguage } from "@/lib/store";
import { LANGS, useT } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

export default function ProfilePage() {
  return (
    <AppShell>
      <Profile />
    </AppShell>
  );
}

const METHOD = {
  unhcr: { label: "UNHCR ProGres", icon: <IdCard size={16} /> },
  otp: { label: "Phone OTP", icon: <Smartphone size={16} /> },
  email: { label: "Email", icon: <Mail size={16} /> },
  document: { label: "Document (self-attested)", icon: <FileUp size={16} /> },
};

function Profile() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const { toast, toastNode } = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [bio, setBio] = useState(user.bio ?? "");
  const [portfolio, setPortfolio] = useState(user.portfolioUrl ?? "");
  const [skills, setSkills] = useState(user.skills.join(", "));
  const certs = db.certificates.filter((c) => c.userId === user.id);
  const ratings = db.ratings.filter((r) => r.toId === user.id);

  const save = async () => {
    if (name.trim().length < 3) return toast("Name is too short.", "error");
    const r = await updateProfile({
      name: name.trim(), phone: phone.trim(), bio: bio.trim(),
      ...(user.role === "worker" ? { portfolioUrl: portfolio.trim(), skills: skills.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
    });
    toast(r.ok ? "Profile saved." : r.error, r.ok ? "success" : "error");
  };

  return (
    <>
      <PageHeader title={t("profile")} subtitle="Your persistent digital identity on KDWC." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-800">{user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
            <h2 className="mt-3 text-lg font-bold">{user.name}</h2>
            <p className="text-sm text-slate-500">{ROLE_LABEL[user.role]}{user.companyName ? ` · ${user.companyName}` : ""}</p>
            {user.rating && <p className="mt-1 flex items-center gap-1 text-sm"><Star size={14} className="fill-sun-400 text-sun-400" /> {user.rating} ({ratings.length} reviews)</p>}
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Verified by</dt><dd className="flex items-center gap-1 font-medium">{METHOD[user.verifiedBy].icon} {METHOD[user.verifiedBy].label} <BadgeCheck size={14} className="text-brand-600" /></dd></div>
            {user.unhcrId && <div className="flex justify-between"><dt className="text-slate-500">UNHCR no.</dt><dd className="font-mono">{user.unhcrId}</dd></div>}
            {user.role === "employer" && <div className="flex justify-between"><dt className="text-slate-500">Employer status</dt><dd><Badge color={user.employerStatus === "verified" ? "green" : user.employerStatus === "pending" ? "amber" : "red"}>{user.employerStatus}</Badge></dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd>{user.email}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Location</dt><dd>{user.location}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Member since</dt><dd>{fmtDate(user.createdAt)}</dd></div>
            {user.role === "worker" && <div className="flex justify-between"><dt className="text-slate-500">Certificates</dt><dd>{certs.length}</dd></div>}
          </dl>
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><Fingerprint size={16} /> Biometric data is never stored - only an irreversible hash.</div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-bold">Edit profile</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="n">Full name</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label htmlFor="p">Phone</Label><Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div>
              <Label htmlFor="lang">{t("language")}</Label>
              <select id="lang" value={user.language} onChange={(e) => setLanguage(e.target.value as Lang)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            {user.role === "worker" && <div><Label htmlFor="pf">Portfolio link</Label><Input id="pf" type="url" placeholder="https://" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} /></div>}
            {user.role === "worker" && <div className="sm:col-span-2"><Label htmlFor="sk">Skills (comma separated)</Label><Input id="sk" value={skills} onChange={(e) => setSkills(e.target.value)} /></div>}
            <div className="sm:col-span-2"><Label htmlFor="b">About</Label><Textarea id="b" value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          </div>
          <Button className="mt-5" onClick={save}>{t("save")}</Button>

          {ratings.length > 0 && (
            <div className="mt-8 border-t pt-5">
              <h3 className="mb-3 font-bold">Reviews</h3>
              <ul className="space-y-3">
                {ratings.map((r) => (
                  <li key={r.id} className="text-sm"><span className="font-semibold">{"★".repeat(r.stars)}</span> &ldquo;{r.comment}&rdquo;</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
      {toastNode}
    </>
  );
}
