"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LanguageSelect } from "@/components/AppShell";
import { Alert, Button, Input, Label } from "@/components/ui";
import { login, useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { DEMO_PASSWORD } from "@/lib/seed";

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, db } = useStore();
  const { t } = useT();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState(params.get("email") ? DEMO_PASSWORD : "");
  const [error, setError] = useState("");
  const next = params.get("next") || "/dashboard";

  useEffect(() => {
    if (db && user) router.replace(next);
  }, [db, user, router, next]);

  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Enter your email and password.");
    setBusy(true);
    const r = await login(email, password);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else router.push(next);
  };

  const quick = async (em: string) => {
    setError("");
    setBusy(true);
    const r = await login(em, DEMO_PASSWORD);
    setBusy(false);
    if (r.ok) router.push("/dashboard");
    else setError(r.error);
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/"><Logo size={36} /></Link>
          <LanguageSelect compact />
        </div>
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-bold">{t("welcome")}</h1>
          <p className="mt-1 text-sm text-slate-600">Log in to continue learning and working.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {error && <Alert kind="error">{error}</Alert>}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full py-2.5" disabled={busy}>
              <LogIn size={18} /> {busy ? "Logging in…" : t("login")}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-brand-700 hover:underline">Create an account</Link>
          </p>
        </div>
      </div>

      <div className="bg-brand-50 px-6 py-10 sm:px-12">
        <div className="mx-auto max-w-md">
          <h2 className="text-lg font-bold text-brand-900">Demo accounts</h2>
          <p className="mt-1 text-sm text-brand-800">One click to log in as any role. Password: <code className="rounded bg-white px-1.5 py-0.5 font-semibold">{DEMO_PASSWORD}</code></p>
          <div className="mt-4 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} disabled={busy} onClick={() => quick(a.email)} className="w-full rounded-xl border border-brand-200 bg-white p-3 text-left transition hover:border-brand-500 hover:shadow">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{a.role}</span>
                  <span className="font-mono text-xs text-slate-500">{a.email}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
