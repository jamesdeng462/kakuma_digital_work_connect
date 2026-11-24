"use client";
import { useAuthed } from "./AppShell";
import { Badge, Button, Card, Empty, cx, timeAgo } from "./ui";
import { setReportStatus } from "@/lib/store";

export function SafeguardingListInline() {
  const { db } = useAuthed();
  return (
    <div className="space-y-3">
      {db.reports.length === 0 && <Empty title="No reports" />}
      {db.reports.map((r) => (
        <Card key={r.id} className={cx("p-4", r.status === "new" && "border-red-300")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold">{r.category} <Badge color={r.status === "new" ? "red" : r.status === "escalated" ? "amber" : "green"}>{r.status}</Badge></p>
              <p className="mt-1 text-sm text-slate-700">{r.description}</p>
              <p className="mt-1 text-xs text-slate-500">Anonymous · {timeAgo(r.at)}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {r.status === "new" && <Button variant="warn" className="py-1.5" onClick={() => void setReportStatus(r.id, "escalated")}>Escalate to partner</Button>}
              {r.status !== "resolved" && <Button variant="secondary" className="py-1.5" onClick={() => void setReportStatus(r.id, "resolved")}>Mark resolved</Button>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

