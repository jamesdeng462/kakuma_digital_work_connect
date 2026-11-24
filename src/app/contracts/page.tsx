"use client";
import Link from "next/link";
import { AppShell, useAuthed } from "@/components/AppShell";
import { ContractBadge } from "@/components/ContractBadge";
import { Card, Empty, PageHeader, money, fmtDate } from "@/components/ui";
import { displayName } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function ContractsPage() {
  return (
    <AppShell roles={["worker", "employer", "admin"]}>
      <Contracts />
    </AppShell>
  );
}

function Contracts() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const list = db.contracts.filter((c) => user.role === "admin" || c.workerId === user.id || c.employerId === user.id);
  return (
    <>
      <PageHeader title={t("contracts")} subtitle="Standardised digital work agreements with deliverables, payment terms and dispute resolution." />
      {list.length === 0 ? (
        <Empty title="No contracts yet">{user.role === "worker" ? "When an employer hires you, your contract appears here." : "Accept an applicant to generate a contract."}</Empty>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">{user.role === "worker" ? "Employer" : user.role === "employer" ? "Worker" : "Parties"}</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium"><Link href={`/contracts/${c.id}`} className="text-brand-800 hover:underline">{db.jobs.find((j) => j.id === c.jobId)?.title}</Link></td>
                  <td className="px-4 py-3">{user.role === "worker" ? displayName(db, c.employerId) : user.role === "employer" ? displayName(db, c.workerId) : `${displayName(db, c.workerId)} ↔ ${displayName(db, c.employerId)}`}</td>
                  <td className="px-4 py-3">{money(c.amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3"><ContractBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
