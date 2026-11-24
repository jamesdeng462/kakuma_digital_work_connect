"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X, Star } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "warn";
const variants: Record<BtnVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary: "bg-white text-brand-800 border border-brand-200 hover:bg-brand-50 disabled:opacity-50",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50",
  warn: "bg-sun-400 text-sun-700 hover:bg-sun-500 hover:text-white disabled:opacity-50",
};

export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...p}
      className={cx("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed", variants[variant], className)}
    />
  );
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: BtnVariant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition", variants[variant], className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(field, p.className)} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(field, p.className)} />;
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(field, "min-h-[90px]", p.className)} />;
}

const badgeColors: Record<string, string> = {
  green: "bg-brand-100 text-brand-800",
  amber: "bg-sun-100 text-sun-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
  gray: "bg-slate-100 text-slate-700",
  purple: "bg-violet-100 text-violet-800",
};
export function Badge({ color = "gray", children }: { color?: keyof typeof badgeColors | string; children: ReactNode }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeColors[color] ?? badgeColors.gray)}>{children}</span>;
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        {label}
        {icon && <span className="text-brand-600">{icon}</span>}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Alert({ kind = "info", children }: { kind?: "info" | "success" | "error" | "warn"; children: ReactNode }) {
  const c = { info: "bg-sky-50 text-sky-900 border-sky-200", success: "bg-brand-50 text-brand-900 border-brand-200", error: "bg-red-50 text-red-800 border-red-200", warn: "bg-sun-100 text-sun-700 border-sun-400/40" }[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={cx("rounded-lg border px-4 py-3 text-sm", c)}>{children}</div>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} className={onChange ? "cursor-pointer" : "cursor-default"}>
          <Star size={size} className={n <= Math.round(value) ? "fill-sun-400 text-sun-400" : "text-slate-300"} />
        </button>
      ))}
    </div>
  );
}

/** Small toast for action feedback. */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);
  const node = msg ? (
    <div className={cx("fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg md:bottom-6", msg.kind === "success" ? "bg-brand-700" : "bg-red-600")} role="status">
      {msg.text}
    </div>
  ) : null;
  return { toast: (text: string, kind: "success" | "error" = "success") => setMsg({ text, kind }), toastNode: node };
}

/** Horizontal bar chart (no chart library - keeps the bundle small for 2G/3G). */
export function BarChart({ data, format = (n: number) => String(n), color = "bg-brand-500" }: { data: { label: string; value: number }[]; format?: (n: number) => string; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-slate-600" title={d.label}>{d.label}</span>
          <div className="h-3 rounded-full bg-slate-100">
            <div className={cx("h-3 rounded-full", color)} style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-16 text-right font-semibold tabular-nums text-slate-800">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Vertical column chart for time series. */
export function ColumnChart({ data, format = (n: number) => String(n) }: { data: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[11px] font-semibold tabular-nums text-slate-700">{d.value ? format(d.value) : ""}</span>
          <div className="w-full rounded-t-md bg-brand-500" style={{ height: `${Math.max(2, (d.value / max) * 120)}px` }} title={`${d.label}: ${format(d.value)}`} />
          <span className="text-[11px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
