"use client";
import { Download, Users, Wallet, Briefcase, Award, Globe2, ShieldAlert, Building2 } from "lucide-react";
import { AppShell, useAuthed, Loader } from "@/components/AppShell";
import { Alert, BarChart, Button, Card, ColumnChart, PageHeader, Stat, money } from "@/components/ui";
import { SafeguardingListInline } from "@/components/SafeguardingInline";
import type { ImpactMetrics } from "@/lib/metrics";
import { useApi } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function ImpactPage() {
  return (
    <AppShell roles={["partner", "admin", "mentor", "governor"]}>
      <Impact />
    </AppShell>
  );
}

function Impact() {
  const { user } = useAuthed();
  const { t } = useT();
  const { data: m, error } = useApi<ImpactMetrics>("/impact");
  const now = new Date();
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
  // The CSV is generated on the server (GET /api/impact?format=csv).
  const exportCsv = () => {
    window.location.href = "/api/impact?format=csv";
  };
  if (error) return <Alert kind="error">{error}</Alert>;
  if (!m) return <Loader />;

  return (
    <>
      <PageHeader
        title={t("impact")}
        subtitle={`Real-time impact data · ${quarter} · compatible with UNHCR, donor and government reporting`}
        action={<Button onClick={exportCsv}><Download size={18} /> Export quarterly report (CSV)</Button>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Youth registered" value={m.youth} hint={`${m.refugees} refugee · ${m.host} host community`} icon={<Users size={18} />} />
        <Stat label="Women" value={`${m.womenPct}%`} hint={`${m.women} young women`} />
        <Stat label="Youth earnings" value={money(m.totalEarnings)} hint="Paid through the platform" icon={<Wallet size={18} />} />
        <Stat label="Job placements" value={m.placements} icon={<Briefcase size={18} />} />
        <Stat label="Certificates issued" value={m.certificates} hint={`${m.completionRate}% completion rate`} icon={<Award size={18} />} />
        <Stat label="Course enrolments" value={m.enrolled} />
        <Stat label="Countries of origin" value={m.countries} icon={<Globe2 size={18} />} />
        <Stat label="Verified employers" value={m.employers} icon={<Building2 size={18} />} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">Youth earnings by month (USD)</h2>
          <ColumnChart data={m.months} format={(n) => `$${Math.round(n)}`} />
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Youth by country of origin</h2>
          <BarChart data={m.byNationality} />
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Certificates by skill domain</h2>
          <BarChart data={m.byDomain} color="bg-sun-400" />
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Inclusion</h2>
          <div className="space-y-4 text-sm">
            <Split label="Gender" a={["Women", m.women]} b={["Men", m.youth - m.women]} />
            <Split label="Community" a={["Refugee", m.refugees]} b={["Host", m.host]} />
          </div>
        </Card>
      </div>
      {(user.role === "partner" || user.role === "admin") && (
        <Card className="mt-6" >
          <h2 id="safeguarding" className="mb-4 flex items-center gap-2 font-bold"><ShieldAlert size={18} className="text-red-600" /> Safeguarding escalations</h2>
          <SafeguardingListInline />
        </Card>
      )}
    </>
  );
}

function Split({ label, a, b }: { label: string; a: [string, number]; b: [string, number] }) {
  const total = a[1] + b[1] || 1;
  const pa = Math.round((a[1] / total) * 100);
  return (
    <div>
      <p className="mb-1 font-semibold">{label}</p>
      <div className="flex h-6 overflow-hidden rounded-full text-[11px] font-semibold text-white">
        <div className="flex items-center justify-center bg-brand-600" style={{ width: `${pa}%` }}>{a[0]} {pa}%</div>
        <div className="flex items-center justify-center bg-sun-500" style={{ width: `${100 - pa}%` }}>{b[0]} {100 - pa}%</div>
      </div>
    </div>
  );
}
