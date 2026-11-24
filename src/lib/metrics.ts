import type { DB } from "./types";

/** Impact metrics for admin, partner, mentor and governor dashboards (SRS 6.5 impact reporting). */
export function impactMetrics(db: DB) {
  const youth = db.users.filter((u) => u.role === "worker");
  const earnings = db.transactions.filter((t) => t.type === "earning");
  const totalEarnings = earnings.reduce((s, t) => s + t.amount, 0);
  const fees = -db.transactions.filter((t) => t.type === "fee").reduce((s, t) => s + t.amount, 0);
  const placements = db.contracts.length + Math.max(0, earnings.length - db.contracts.filter((c) => c.status === "paid").length);
  const women = youth.filter((u) => u.gender === "Female").length;

  const byNationality = Object.entries(
    youth.reduce<Record<string, number>>((acc, u) => ((acc[u.nationality] = (acc[u.nationality] ?? 0) + 1), acc), {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const byDomain = Object.entries(
    db.certificates.reduce<Record<string, number>>((acc, c) => {
      const d = db.courses.find((x) => x.id === c.courseId)?.domain ?? "Other";
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Earnings by month for the last 4 months
  const months: { label: string; value: number }[] = [];
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en", { month: "short" });
    const value = earnings
      .filter((t) => {
        const x = new Date(t.at);
        return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear();
      })
      .reduce((s, t) => s + t.amount, 0);
    months.push({ label, value });
  }

  const enrolled = db.enrollments.length;
  const completionRate = enrolled ? Math.round((db.certificates.length / enrolled) * 100) : 0;

  return {
    youth: youth.length,
    women,
    womenPct: youth.length ? Math.round((women / youth.length) * 100) : 0,
    refugees: youth.filter((u) => !u.nationality.startsWith("Kenya")).length,
    host: youth.filter((u) => u.nationality.startsWith("Kenya")).length,
    countries: new Set(youth.map((u) => u.nationality)).size,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    fees: Math.round(fees * 100) / 100,
    placements,
    certificates: db.certificates.length,
    enrolled,
    completionRate,
    employers: db.users.filter((u) => u.role === "employer" && u.employerStatus === "verified").length,
    byNationality,
    byDomain,
    months,
  };
}

export type ImpactMetrics = ReturnType<typeof impactMetrics> & {
  safeguardingReports: number;
  flaggedItems: number;
  pendingEmployers: number;
  openDisputes: number;
  totalUsers: number;
};
