"use client";
import Link from "next/link";
import { BadgeCheck, BookOpen, Briefcase, Fingerprint, Wallet, Users, WifiOff, Languages, ShieldCheck, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LanguageSelect } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { DEMO_ACCOUNTS } from "@/lib/demo";

const STEPS = [
  { icon: <Fingerprint />, title: "Verify identity", text: "Sign up with a UNHCR number, phone OTP, email or a document - no national ID needed." },
  { icon: <BookOpen />, title: "Learn skills", text: "Short, offline-ready courses in data entry, design, web, customer service and more." },
  { icon: <BadgeCheck />, title: "Get certified", text: "Pass with 70%+ to earn a QR-verifiable digital certificate employers trust." },
  { icon: <Briefcase />, title: "Find remote work", text: "AI-matched jobs from vetted employers, with fair digital contracts." },
  { icon: <Wallet />, title: "Get paid safely", text: "Payments to your KDWC wallet and M-Pesa, with full transaction history." },
  { icon: <Users />, title: "Grow together", text: "Mentor-led cohorts, youth governance and a safe reporting channel." },
];

export default function Landing() {
  const { user } = useStore();
  const { t } = useT();
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo size={36} />
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <LanguageSelect />
          </div>
          {user ? (
            <Link href="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("dashboard")}</Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-semibold text-brand-800 hover:underline">{t("login")}</Link>
              <Link href="/signup" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("signup")}</Link>
            </>
          )}
        </div>
      </header>

      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">For refugee & host-community youth in Kakuma</p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">{t("tagline")}</h1>
            <p className="mt-5 max-w-lg text-lg text-brand-50/90">
              Kakuma Digital Work Connect turns training into income: verified digital identity, market-ready courses, trusted credentials, safe remote jobs and mobile-money payments - in one low-data app.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-sun-400 px-6 py-3 font-bold text-brand-900 hover:bg-sun-500">
                {t("getStarted")} <ArrowRight size={18} className="rtl-flip" />
              </Link>
              <Link href="/login" className="rounded-lg border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">Try a demo account</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["280,000+", "people live in Kakuma & Kalobeyei"],
              ["20+", "countries of origin"],
              ["< 50 KB", "target data per page load"],
              ["4", "languages: EN, SW, AR, FR"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <div className="text-3xl font-extrabold text-sun-400">{n}</div>
                <div className="mt-1 text-sm text-brand-50/90">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-sun-500">The problem</h2>
            <p className="mt-2 text-2xl font-bold text-slate-900">Talent is everywhere. Opportunity is not.</p>
            <ul className="mt-4 space-y-3 text-slate-700">
              <li>• Youth in Kakuma face very high unemployment and limited rights to formal work or movement.</li>
              <li>• Many have no national ID or recognised certificates, so global job and payment platforms shut them out.</li>
              <li>• Training programmes rarely connect to real, paid work - skills go unused.</li>
              <li>• Low-end phones, 2G/3G networks and expensive data make most platforms unusable.</li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-600">Our solution</h2>
            <p className="mt-2 text-2xl font-bold text-slate-900">One platform from learning to earning.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                [<WifiOff key="a" size={18} />, "Offline-first PWA for 2G/3G"],
                [<Fingerprint key="b" size={18} />, "ID-light digital identity"],
                [<ShieldCheck key="c" size={18} />, "Vetted employers only"],
                [<Languages key="d" size={18} />, "Multilingual, incl. Arabic RTL"],
              ].map(([i, l], k) => (
                <div key={k} className="flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-sm font-semibold text-brand-900">
                  <span className="text-brand-600">{i}</span>
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">{s.icon}</span>
                  <span className="text-xs font-bold text-slate-400">STEP {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold">Explore every role</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">Demo accounts for each actor in the system. Password for all: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">Demo1234!</code></p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_ACCOUNTS.map((a) => (
            <Link key={a.email} href={`/login?email=${encodeURIComponent(a.email)}`} className="group rounded-2xl border border-slate-200 p-5 transition hover:border-brand-400 hover:shadow-md">
              <div className="font-bold text-slate-900 group-hover:text-brand-700">{a.role}</div>
              <div className="mt-0.5 font-mono text-xs text-slate-500">{a.email}</div>
              <p className="mt-2 text-sm text-slate-600">{a.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500">
          <Logo size={28} />
          <p>Prototype by James Giir Deng · African Leadership University · 2026</p>
          <Link href="/report" className="font-semibold text-red-700 hover:underline">Report a safeguarding concern (anonymous)</Link>
        </div>
      </footer>
    </div>
  );
}
