"use client";
// Public certificate verification page - the target of every certificate QR code (SRS 6.2 i).
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Linkedin, Printer, XCircle, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Loader } from "@/components/AppShell";
import { Button, fmtDate } from "@/components/ui";
import { useApi, useStore } from "@/lib/store";

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useStore();
  const { data, error } = useApi<{ certificate: { id: string; userId: string; courseId: string; score: number; issueDate: string; ipfsHash: string }; holderName: string; course: { title: string; domain: string }; valid: boolean }>(`/certificates/${encodeURIComponent(id)}`);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <XCircle className="text-red-500" size={48} />
        <h1 className="text-2xl font-bold">Certificate not found</h1>
        <p className="max-w-md text-slate-600">No KDWC certificate matches ID <code className="break-all">{id}</code>. It may be invalid or revoked.</p>
        <Link href="/" className="font-semibold text-brand-700 underline">KDWC home</Link>
      </div>
    );
  }
  if (!data) return <Loader />;

  const cert = data.certificate;
  const holder = { name: data.holderName };
  const course = data.course;
  const valid = data.valid; // integrity hash recomputed on the server
  const url = `${origin}/verify/${cert.id}`;
  const d = new Date(cert.issueDate);
  const linkedIn = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(course?.title ?? "")}&organizationName=${encodeURIComponent("Kakuma Digital Work Connect")}&issueYear=${d.getFullYear()}&issueMonth=${d.getMonth() + 1}&certUrl=${encodeURIComponent(url)}&certId=${cert.id}`;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href={user ? "/certificates" : "/"} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            <ArrowLeft size={16} className="rtl-flip" /> {user ? "My certificates" : "KDWC home"}
          </Link>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${valid ? "bg-brand-100 text-brand-800" : "bg-red-100 text-red-700"}`}>
            {valid ? <BadgeCheck size={16} /> : <XCircle size={16} />} {valid ? "Verified authentic" : "Tampered - hash mismatch"}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border-8 border-double border-brand-700 bg-white p-8 shadow-xl sm:p-12">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sun-100" aria-hidden />
          <div className="relative">
            <Logo size={44} />
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Certificate of Competency</p>
            <p className="mt-6 text-slate-600">This certifies that</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-900 sm:text-4xl">{holder?.name}</h1>
            <p className="mt-4 text-slate-600">has demonstrated mastery in</p>
            <h2 className="mt-1 text-2xl font-bold text-brand-800">{course?.title}</h2>
            <p className="mt-2 text-sm text-slate-600">Domain: {course?.domain} · Assessment score: <strong>{cert.score}%</strong> (pass mark 70%)</p>

            <div className="mt-10 flex flex-col-reverse items-start justify-between gap-6 sm:flex-row sm:items-end">
              <div className="space-y-1 text-xs text-slate-500">
                <p><span className="font-semibold text-slate-700">Issued:</span> {fmtDate(cert.issueDate)}</p>
                <p className="break-all"><span className="font-semibold text-slate-700">Certificate ID:</span> {cert.id}</p>
                <p className="break-all"><span className="font-semibold text-slate-700">Integrity hash (SHA-256):</span> {cert.ipfsHash}</p>
                <p className="pt-2 font-semibold text-slate-700">Digitally signed by Kakuma Digital Work Connect</p>
              </div>
              {origin && (
                <div className="shrink-0 rounded-lg border border-slate-200 p-2">
                  <QRCodeSVG value={url} size={112} />
                  <p className="mt-1 text-center text-[10px] text-slate-500">Scan to verify</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="no-print mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={() => window.print()}><Printer size={16} /> Print / save PDF</Button>
          {user?.id === cert.userId && (
            <a href={linkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              <Linkedin size={16} /> Add to LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
