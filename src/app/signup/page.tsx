"use client";
// Onboarding flow - follows the SRS activity diagram:
// launch → register → UNHCR number? (ProGres check) / alternative verification (OTP, email, document)
// → create digital identity → [fork] assign role + choose language → connectivity check (sync or store
// locally up to 72h) → quick-start tutorial → choose first course → dashboard.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, CloudOff, Fingerprint, GraduationCap, Mail, Smartphone, FileUp, Wifi, IdCard } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Alert, Button, Card, Input, Label, Select, cx } from "@/components/ui";
import { api, signup, enroll, useStore, verifyUnhcr, sendCode as apiSendCode, checkCode as apiCheckCode, type SignupInput } from "@/lib/store";
import { LANGS } from "@/lib/i18n";
import { COURSES } from "@/lib/courses";
import type { Lang, VerificationMethod } from "@/lib/types";

const SKILL_OPTIONS = ["Typing", "Excel / Sheets", "English", "Arabic", "Swahili", "French", "Somali", "Customer care", "Drawing / design", "Social media", "Coding basics", "Translation"];
const NATIONALITIES = ["South Sudan", "DR Congo", "Somalia", "Ethiopia", "Burundi", "Eritrea", "Sudan", "Uganda", "Rwanda", "Kenya (host community)", "Other"];

const YOUTH_STEPS = ["Account", "Verify identity", "Profile & language", "Connectivity", "Quick tutorial", "First course"];
const EMPLOYER_STEPS = ["Account", "Company vetting", "Done"];

export default function SignupPage() {
  const router = useRouter();
  const { user, db } = useStore();
  const [type, setType] = useState<"youth" | "employer" | null>(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  // form state
  const [f, setF] = useState({
    name: "", email: "", phone: "", password: "", gender: "Female" as SignupInput["gender"], nationality: "South Sudan", location: "Kakuma",
    companyName: "", companyRegNo: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  // verification
  const [hasUnhcr, setHasUnhcr] = useState<boolean | null>(null);
  const [unhcrId, setUnhcrId] = useState("");
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [docName, setDocName] = useState("");
  const [attest, setAttest] = useState(false);
  const [verified, setVerified] = useState<VerificationMethod | null>(null);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [biometric, setBiometric] = useState(false);

  // profile
  const [lang, setLang] = useState<Lang>("en");
  const [skills, setSkills] = useState<string[]>([]);
  const [goal, setGoal] = useState("Data & admin work");
  const [online, setOnline] = useState(true);
  const [tutorial, setTutorial] = useState(0);
  const [courseId, setCourseId] = useState("c-data-entry");

  // employer vetting
  const [payOk, setPayOk] = useState(false);
  const [antiExp, setAntiExp] = useState(false);

  useEffect(() => {
    if (db && user && step === 0 && !type) router.replace("/dashboard");
  }, [db, user, router, step, type]);

  const steps = type === "employer" ? EMPLOYER_STEPS : YOUTH_STEPS;

  const validateAccount = () => {
    if (f.name.trim().length < 3) return "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return "Enter a valid email address.";
    if (f.phone.replace(/\D/g, "").length < 9) return "Enter a valid phone number (e.g. +254712345678).";
    if (f.password.length < 8) return "Password must be at least 8 characters.";
    if (type === "employer" && f.companyName.trim().length < 2) return "Enter your company or organisation name.";
    return "";
  };

  const [busy, setBusy] = useState(false);

  const next = async () => {
    setError("");
    if (step === 0) {
      const e = validateAccount();
      if (e) return setError(e);
      try {
        const r = await api<{ available: boolean }>("GET", `/auth/email-available?email=${encodeURIComponent(f.email.trim())}`);
        if (!r.available) return setError("An account with this email already exists. Log in instead.");
      } catch (err) {
        return setError((err as Error).message);
      }
    }
    if (type === "youth" && step === 1 && !verified) return setError("Please complete one verification method to continue.");
    if (type === "youth" && step === 3) setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    if (type === "employer" && step === 1) {
      if (!f.companyRegNo.trim()) return setError("Enter the company registration number.");
      if (!payOk || !antiExp) return setError("You must confirm payment capability and agree to the anti-exploitation policy.");
      if (!verified) return setError("Verify your business email first.");
      return void finishEmployer();
    }
    setStep((s) => s + 1);
  };

  useEffect(() => {
    if (type === "youth" && step === 3) setOnline(navigator.onLine);
  }, [type, step]);

  const verification = (): SignupInput["verification"] => {
    if (verified === "unhcr") return { method: "unhcr", unhcrId: unhcrId.trim() };
    if (verified === "document") return { method: "document", documentName: docName, attested: true };
    return { method: verified as "otp" | "email", code };
  };

  const finishYouth = async () => {
    setBusy(true);
    setError("");
    const r = await signup({
      name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.password, role: "worker",
      language: lang, nationality: f.nationality, gender: f.gender, location: f.location, skills, goal,
      verification: verification(),
    });
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    try { localStorage.setItem("kdwc-lang", lang); } catch {}
    await enroll(courseId);
    router.push(`/courses/${courseId}?welcome=1`);
  };

  const finishEmployer = async () => {
    setBusy(true);
    const r = await signup({
      name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.password, role: "employer",
      language: "en", nationality: f.nationality, gender: f.gender, location: f.location, skills: [],
      companyName: f.companyName.trim(), companyRegNo: f.companyRegNo.trim(), antiExploitationAgreed: antiExp, paymentCapabilityConfirmed: payOk,
      verification: { method: "email", code },
    });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setStep(2);
  };

  const doUnhcr = async () => {
    try {
      const r = await verifyUnhcr(unhcrId);
      setVerifyMsg(r.message);
      if (r.ok) setVerified("unhcr");
    } catch (e) {
      setVerifyMsg((e as Error).message);
    }
  };

  const sendCode = async () => {
    if (method === "otp" && f.phone.replace(/\D/g, "").length < 9) return setVerifyMsg("Enter a valid phone number on the Account step first.");
    try {
      const r = await apiSendCode(method === "otp" ? "sms" : "email", method === "otp" ? f.phone : f.email);
      setCodeSent(true);
      setVerifyMsg(`Code sent to ${method === "otp" ? f.phone : f.email}. (${r.hint})`);
    } catch (e) {
      setVerifyMsg((e as Error).message);
    }
  };

  const checkCode = async () => {
    try {
      const r = await apiCheckCode(code);
      if (r.ok) {
        setVerified(method);
        setVerifyMsg("Verified successfully.");
      } else setVerifyMsg("Incorrect code. Try again.");
    } catch (e) {
      setVerifyMsg((e as Error).message);
    }
  };

  // ---------- Step 0: choose account type ----------
  if (!type) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-slate-600">What would you like to do on KDWC?</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button onClick={() => setType("youth")} className="rounded-2xl border-2 border-slate-200 p-6 text-left transition hover:border-brand-500">
            <GraduationCap className="text-brand-600" size={32} />
            <h2 className="mt-3 text-lg font-bold">Learn & find work</h2>
            <p className="mt-1 text-sm text-slate-600">For youth aged 18–35 in Kakuma & Kalobeyei. No national ID needed.</p>
          </button>
          <button onClick={() => { setType("employer"); setF((p) => ({ ...p, nationality: "Kenya", location: "Nairobi" })); }} className="rounded-2xl border-2 border-slate-200 p-6 text-left transition hover:border-brand-500">
            <Building2 className="text-brand-600" size={32} />
            <h2 className="mt-3 text-lg font-bold">Hire talent</h2>
            <p className="mt-1 text-sm text-slate-600">For businesses, NGOs and clients. Requires verification before posting jobs.</p>
          </button>
        </div>
        <p className="mt-6 text-xs text-slate-500">Mentor, Administrator, Humanitarian Partner and Youth Governor roles are assigned by the KDWC team after vetting.</p>
        <p className="mt-4 text-sm text-slate-600">Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></p>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* stepper */}
      <ol className="mb-8 flex flex-wrap gap-2" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className={cx("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", i < step ? "bg-brand-100 text-brand-800" : i === step ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500")}>
            {i < step ? <Check size={12} /> : <span>{i + 1}</span>} {s}
          </li>
        ))}
      </ol>

      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}

      {/* Step 0: Account */}
      {step === 0 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">{type === "employer" ? "Employer account" : "Tell us about you"}</h1>
          {type === "employer" && (
            <div>
              <Label htmlFor="company">Company / organisation name</Label>
              <Input id="company" value={f.companyName} onChange={(e) => set("companyName", e.target.value)} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">{type === "employer" ? "Contact person" : "Full name"}</Label>
              <Input id="name" value={f.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <Input id="phone" type="tel" placeholder="+254712345678" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="em">Email</Label>
              <Input id="em" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pw">Password (min 8 characters)</Label>
              <Input id="pw" type="password" value={f.password} onChange={(e) => set("password", e.target.value)} />
            </div>
            {type === "youth" && (
              <>
                <div>
                  <Label htmlFor="nat">Country of origin</Label>
                  <Select id="nat" value={f.nationality} onChange={(e) => set("nationality", e.target.value)}>
                    {NATIONALITIES.map((n) => <option key={n}>{n}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select id="gender" value={f.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option>Female</option><option>Male</option><option>Other</option>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="loc">Where do you live?</Label>
                  <Select id="loc" value={f.location} onChange={(e) => set("location", e.target.value)}>
                    {["Kakuma 1", "Kakuma 2", "Kakuma 3", "Kakuma 4", "Kalobeyei Settlement", "Kakuma town (host community)"].map((l) => <option key={l}>{l}</option>)}
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Youth Step 1: identity verification */}
      {type === "youth" && step === 1 && (
        <div className="space-y-5">
          <h1 className="text-xl font-bold">Verify your identity</h1>
          {verified ? (
            <Alert kind="success"><span className="flex items-center gap-2"><CheckCircle2 size={18} /> Identity verified via {verified === "unhcr" ? "UNHCR ProGres" : verified === "otp" ? "phone OTP" : verified === "email" ? "email" : "document upload (self-attested)"}.</span></Alert>
          ) : (
            <>
              <div>
                <p className="mb-2 font-medium">Do you have a UNHCR registration number?</p>
                <div className="flex gap-3">
                  <Button variant={hasUnhcr === true ? "primary" : "secondary"} onClick={() => { setHasUnhcr(true); setMethod(null); setVerifyMsg(""); }}>Yes</Button>
                  <Button variant={hasUnhcr === false ? "primary" : "secondary"} onClick={() => { setHasUnhcr(false); setVerifyMsg(""); }}>No / not with me</Button>
                </div>
              </div>

              {hasUnhcr && (
                <Card className="bg-slate-50">
                  <Label htmlFor="unhcr"><span className="inline-flex items-center gap-2"><IdCard size={16} /> UNHCR registration number</span></Label>
                  <div className="flex gap-2">
                    <Input id="unhcr" placeholder="KAK-123456" value={unhcrId} onChange={(e) => setUnhcrId(e.target.value)} />
                    <Button onClick={doUnhcr}>Check</Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">We cross-reference with UNHCR ProGres (sandbox). Try <code>KAK-123456</code>.</p>
                </Card>
              )}

              {hasUnhcr === false && (
                <div className="space-y-3">
                  <p className="font-medium">Choose another way to verify:</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {([["otp", "Phone OTP", <Smartphone key="o" />], ["email", "Email code", <Mail key="e" />], ["document", "Upload document", <FileUp key="d" />]] as const).map(([m, l, icon]) => (
                      <button key={m} onClick={() => { setMethod(m); setCodeSent(false); setCode(""); setVerifyMsg(""); }} className={cx("flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold", method === m ? "border-brand-500 bg-brand-50" : "border-slate-200")}>
                        <span className="text-brand-600">{icon}</span>{l}
                      </button>
                    ))}
                  </div>
                  {(method === "otp" || method === "email") && (
                    <Card className="bg-slate-50">
                      {!codeSent ? (
                        <Button onClick={sendCode}>Send code to {method === "otp" ? f.phone || "your phone" : f.email || "your email"}</Button>
                      ) : (
                        <div className="flex gap-2">
                          <Input aria-label="Verification code" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
                          <Button onClick={checkCode}>Verify</Button>
                        </div>
                      )}
                    </Card>
                  )}
                  {method === "document" && (
                    <Card className="space-y-3 bg-slate-50">
                      <Label htmlFor="doc">Upload a UNHCR card, school certificate or other document</Label>
                      <input id="doc" type="file" accept="image/*,.pdf" onChange={(e) => setDocName(e.target.files?.[0]?.name ?? "")} className="block w-full text-sm" />
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1" />
                        I confirm that the information I provide is true (self-attestation).
                      </label>
                      <Button disabled={!docName || !attest} onClick={() => { setVerified("document"); setVerifyMsg("Document received. A verifier will review it; you can continue now."); }}>Submit document</Button>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
          {verifyMsg && !verified && <Alert kind={verifyMsg.startsWith("Code sent") ? "info" : "error"}>{verifyMsg}</Alert>}
          {verified && (
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm">
              <input type="checkbox" checked={biometric} onChange={(e) => setBiometric(e.target.checked)} />
              <Fingerprint className="text-brand-600" size={20} />
              <span><strong>Optional:</strong> enable fingerprint login on this device (where available). Only an irreversible hash is stored.</span>
            </label>
          )}
        </div>
      )}

      {/* Youth Step 2: digital identity + role + language (fork) */}
      {type === "youth" && step === 2 && (
        <div className="space-y-5">
          <Alert kind="success">Your digital identity has been created. Role assigned: <strong>Learner / Worker</strong>. You will be upgraded to Worker status once you complete a verified course.</Alert>
          <div>
            <p className="mb-2 font-medium">Choose your language</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)} className={cx("rounded-xl border-2 p-3 text-sm font-semibold", lang === l.code ? "border-brand-500 bg-brand-50" : "border-slate-200")}>{l.label}</button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Somali and more languages are coming in a future release.</p>
          </div>
          <div>
            <p className="mb-2 font-medium">What skills do you already have? <span className="font-normal text-slate-500">(choose any)</span></p>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((s) => (
                <button key={s} onClick={() => setSkills((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]))} className={cx("rounded-full border px-3 py-1.5 text-sm", skills.includes(s) ? "border-brand-500 bg-brand-600 text-white" : "border-slate-300 bg-white")}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="goal">What kind of work do you want?</Label>
            <Select id="goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
              {["Data & admin work", "Design & creative", "Web & software", "Customer support", "AI data annotation", "Marketing & social media"].map((g) => <option key={g}>{g}</option>)}
            </Select>
          </div>
        </div>
      )}

      {/* Youth Step 3: connectivity check */}
      {type === "youth" && step === 3 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Checking your connection…</h1>
          {online ? (
            <Card className="flex items-center gap-4 border-brand-200 bg-brand-50">
              <Wifi className="text-brand-600" size={32} />
              <div>
                <p className="font-semibold">You are online</p>
                <p className="text-sm text-slate-600">Your profile will be synced to the server now.</p>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center gap-4 border-sun-400 bg-sun-100">
              <CloudOff className="text-sun-700" size={32} />
              <div>
                <p className="font-semibold">You are offline</p>
                <p className="text-sm text-slate-700">No problem - your profile is stored on this device for up to 72 hours and will sync automatically when you reconnect.</p>
              </div>
            </Card>
          )}
          <p className="text-sm text-slate-600">KDWC is built for 2G/3G networks. Downloaded courses work offline.</p>
        </div>
      )}

      {/* Youth Step 4: tutorial */}
      {type === "youth" && step === 4 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Quick start (1 minute)</h1>
          {[
            ["1. Learn", "Take short courses. Download them to study offline. Pass the quiz with 70% or more to earn a certificate."],
            ["2. Apply", "Your certificate unlocks job applications. Our AI suggests jobs that match your skills."],
            ["3. Work & get paid", "Sign a digital contract, submit your work, and get paid into your KDWC wallet and M-Pesa."],
            ["4. Stay safe", "Never pay to get a job. Use 'Report a concern' anytime - reports are anonymous."],
          ].map(([h, p], i) => (
            <div key={h} className={cx("rounded-xl border p-4 transition", i === tutorial ? "border-brand-500 bg-brand-50" : "border-slate-200 opacity-60")}>
              <p className="font-bold">{h}</p>
              <p className="text-sm text-slate-700">{p}</p>
            </div>
          ))}
          {tutorial < 3 && <Button variant="secondary" onClick={() => setTutorial((t) => t + 1)}>Next tip</Button>}
        </div>
      )}

      {/* Youth Step 5: first course */}
      {type === "youth" && step === 5 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Choose your first course</h1>
          <div className="grid gap-3 sm:grid-cols-2">
            {COURSES.map((c) => (
              <button key={c.id} onClick={() => setCourseId(c.id)} className={cx("rounded-xl border-2 p-4 text-left", courseId === c.id ? "border-brand-500 bg-brand-50" : "border-slate-200")}>
                <p className="text-xs font-semibold uppercase text-brand-600">{c.domain}</p>
                <p className="font-bold">{c.title}</p>
                <p className="mt-1 text-xs text-slate-500">{c.hours} hrs · {c.level} · {c.sizeKb} KB download</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Employer Step 1: vetting */}
      {type === "employer" && step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Company vetting</h1>
          <p className="text-sm text-slate-600">To protect young workers, every employer is verified before posting jobs.</p>
          <div>
            <Label htmlFor="reg">Company registration number</Label>
            <Input id="reg" value={f.companyRegNo} onChange={(e) => set("companyRegNo", e.target.value)} placeholder="e.g. PVT-2020-12345" />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={payOk} onChange={(e) => setPayOk(e.target.checked)} className="mt-1" />
            I confirm my organisation can pay workers through M-Pesa, mobile money or bank transfer.
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={antiExp} onChange={(e) => setAntiExp(e.target.checked)} className="mt-1" />
            I agree to the KDWC anti-exploitation policy: fair pay, no fees charged to workers, respectful conduct.
          </label>
          <Card className="bg-slate-50">
            <p className="mb-2 text-sm font-medium">Verify business email ({f.email})</p>
            {!codeSent ? (
              <Button variant="secondary" onClick={async () => { setMethod("email"); try { const r = await apiSendCode("email", f.email); setCodeSent(true); setVerifyMsg(`Code sent. (${r.hint})`); } catch (e) { setVerifyMsg((e as Error).message); } }}>Send code</Button>
            ) : verified ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-700"><CheckCircle2 size={16} /> Email verified</p>
            ) : (
              <div className="flex gap-2">
                <Input aria-label="Email code" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
                <Button onClick={checkCode}>Verify</Button>
              </div>
            )}
            {verifyMsg && !verified && <p className="mt-2 text-xs text-slate-600">{verifyMsg}</p>}
          </Card>
        </div>
      )}

      {/* Employer Step 2: done */}
      {type === "employer" && step === 2 && (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto text-brand-600" size={48} />
          <h1 className="text-xl font-bold">Application submitted</h1>
          <p className="text-slate-600">Your account is <strong>pending verification</strong>. A KDWC administrator will review your company. You can explore the dashboard, but posting jobs unlocks after approval.</p>
          <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
        </div>
      )}

      {/* nav buttons */}
      {!(type === "employer" && step === 2) && (
        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? setType(null) : setStep((s) => s - 1))}>
            <ArrowLeft size={16} className="rtl-flip" /> Back
          </Button>
          {type === "youth" && step === 5 ? (
            <Button onClick={finishYouth} disabled={busy}>{busy ? "Creating account…" : "Start learning"} <ArrowRight size={16} className="rtl-flip" /></Button>
          ) : (
            <Button onClick={() => void next()} disabled={busy}>{type === "employer" && step === 1 ? "Submit for verification" : "Continue"} <ArrowRight size={16} className="rtl-flip" /></Button>
          )}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="mb-6 inline-block"><Logo size={36} /></Link>
        <Card className="p-6 sm:p-8">{children}</Card>
      </div>
    </div>
  );
}
