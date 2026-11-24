"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell, BookOpen, Briefcase, FileSignature, GraduationCap, LayoutDashboard, LogOut, Menu, ShieldAlert, Sparkles,
  Users, Vote, Wallet, BarChart3, ShieldCheck, Award, User as UserIcon, Send, X, WifiOff, Globe,
} from "lucide-react";
import { useStore, logout, markNotificationsRead, setLanguage } from "@/lib/store";
import { useT, LANGS } from "@/lib/i18n";
import type { DB, Role, User, Lang } from "@/lib/types";
import { Logo } from "./Logo";
import { cx, timeAgo } from "./ui";

type NavItem = { href: string; key: string; icon: ReactNode };

const NAV: Record<Role, NavItem[]> = {
  worker: [
    { href: "/dashboard", key: "dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/courses", key: "courses", icon: <BookOpen size={18} /> },
    { href: "/jobs", key: "jobs", icon: <Briefcase size={18} /> },
    { href: "/contracts", key: "contracts", icon: <FileSignature size={18} /> },
    { href: "/wallet", key: "wallet", icon: <Wallet size={18} /> },
    { href: "/guidance", key: "guidance", icon: <Sparkles size={18} /> },
    { href: "/applications", key: "applications", icon: <Send size={18} /> },
    { href: "/certificates", key: "certificates", icon: <Award size={18} /> },
    { href: "/cohorts", key: "cohorts", icon: <Users size={18} /> },
    { href: "/governance", key: "governance", icon: <Vote size={18} /> },
  ],
  employer: [
    { href: "/dashboard", key: "dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/employer/jobs", key: "myJobs", icon: <Briefcase size={18} /> },
    { href: "/contracts", key: "contracts", icon: <FileSignature size={18} /> },
    { href: "/wallet", key: "wallet", icon: <Wallet size={18} /> },
  ],
  mentor: [
    { href: "/dashboard", key: "dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/cohorts", key: "cohorts", icon: <Users size={18} /> },
    { href: "/impact", key: "impact", icon: <BarChart3 size={18} /> },
    { href: "/courses", key: "courses", icon: <BookOpen size={18} /> },
    { href: "/governance", key: "governance", icon: <Vote size={18} /> },
  ],
  admin: [
    { href: "/dashboard", key: "dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/admin", key: "admin", icon: <ShieldCheck size={18} /> },
    { href: "/impact", key: "impact", icon: <BarChart3 size={18} /> },
    { href: "/governance", key: "governance", icon: <Vote size={18} /> },
    { href: "/cohorts", key: "cohorts", icon: <Users size={18} /> },
  ],
  partner: [
    { href: "/dashboard", key: "dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/impact", key: "impact", icon: <BarChart3 size={18} /> },
    { href: "/governance", key: "governance", icon: <Vote size={18} /> },
  ],
  governor: [
    { href: "/dashboard", key: "dashboard", icon: <LayoutDashboard size={18} /> },
    { href: "/governance", key: "governance", icon: <Vote size={18} /> },
    { href: "/impact", key: "impact", icon: <BarChart3 size={18} /> },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  worker: "Youth Worker",
  employer: "Employer",
  mentor: "Mentor",
  admin: "Administrator",
  partner: "Humanitarian Partner",
  governor: "Youth Governor",
};

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { lang, t } = useT();
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-slate-600">
      <Globe size={16} aria-hidden />
      <span className="sr-only">{t("language")}</span>
      <select
        value={lang}
        onChange={(e) => setLanguage(e.target.value as Lang)}
        className={cx("rounded-md border border-slate-200 bg-white py-1 pl-2 pr-6 text-sm", compact && "max-w-[110px]")}
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}

function Notifications({ db, user }: { db: DB; user: User }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mine = db.notifications.filter((n) => n.userId === user.id);
  const unread = mine.filter((n) => !n.read).length;
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={`${t("notifications")} (${unread} unread)`}
        onClick={() => {
          setOpen(!open);
          if (!open && unread) setTimeout(markNotificationsRead, 1500);
        }}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && (
        <div className="absolute end-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b px-4 py-3 text-sm font-bold">{t("notifications")}</div>
          <ul className="max-h-96 overflow-y-auto">
            {mine.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">{t("noNotifications")}</li>}
            {mine.slice(0, 20).map((n) => (
              <li key={n.id} className={cx("border-b border-slate-100 text-sm last:border-0", !n.read && "bg-brand-50/60")}>
                <Link href={n.href ?? "#"} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50">
                  <p className="text-slate-800">{n.text}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{timeAgo(n.at)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center" aria-busy="true">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
  );
}

/** Authenticated layout with role-based access control (SRS NFR: RBAC). */
export function AppShell({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { db, user } = useStore();
  const { t } = useT();
  const router = useRouter();
  const path = usePathname();
  const online = useOnline();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (db && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [db, user, router, path]);

  useEffect(() => setDrawer(false), [path]);

  if (!db || !user) return <Loader />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert size={40} className="text-sun-500" />
        <h1 className="text-xl font-bold">Access restricted</h1>
        <p className="max-w-md text-slate-600">This page is for {roles.map((r) => ROLE_LABEL[r]).join(", ")} accounts. You are signed in as a {ROLE_LABEL[user.role]}.</p>
        <Link href="/dashboard" className="font-semibold text-brand-700 underline">Go to your dashboard</Link>
      </div>
    );
  }

  const nav = NAV[user.role];
  const isActive = (href: string) => path === href || (href !== "/dashboard" && path.startsWith(href + "/")) || (href !== "/dashboard" && path === href);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Main">
      {nav.map((n) => (
        <Link key={n.href} href={n.href} className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", isActive(n.href) ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-brand-50")}>
          {n.icon}
          {t(n.key)}
        </Link>
      ))}
      <div className="my-2 border-t border-slate-200" />
      <Link href="/profile" className={cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", path === "/profile" ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-brand-50")}>
        <UserIcon size={18} />
        {t("profile")}
      </Link>
      <Link href="/report" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
        <ShieldAlert size={18} />
        {t("report")}
      </Link>
      <button
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <LogOut size={18} />
        {t("logout")}
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-sun-400 px-4 py-2 text-center text-sm font-medium text-sun-700">
          <WifiOff size={16} /> {t("offline")}
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Menu size={22} />
          </button>
          <Link href="/dashboard" aria-label="Kakuma Digital Work Connect home">
            <Logo size={34} />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSelect />
          </div>
          <Notifications db={db} user={user} />
          <Link href="/profile" className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{initials}</span>
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-sm font-semibold text-slate-800">{user.name}</span>
              <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-e border-slate-200 bg-white md:block">{sidebar}</aside>

        {drawer && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setDrawer(false)}>
            <aside className="h-full w-72 overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b p-4">
                <Logo size={30} />
                <button aria-label="Close menu" onClick={() => setDrawer(false)} className="rounded-lg p-1 hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <div className="border-b p-4">
                <LanguageSelect />
              </div>
              {sidebar}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation - icon-assisted (SRS usability) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden" aria-label="Quick">
        {nav.slice(0, 4).map((n) => (
          <Link key={n.href} href={n.href} className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", isActive(n.href) ? "text-brand-700" : "text-slate-500")}>
            {n.icon}
            <span className="truncate px-1">{t(n.key)}</span>
          </Link>
        ))}
        <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-slate-500">
          <Menu size={18} />
          More
        </button>
      </nav>
    </div>
  );
}

/** Use inside AppShell children - db & user are guaranteed. */
export function useAuthed() {
  const { db, user } = useStore();
  return { db: db as DB, user: user as User };
}


