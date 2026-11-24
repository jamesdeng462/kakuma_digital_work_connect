"use client";
import { Badge } from "./ui";

export function ContractBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    awaiting_signatures: ["amber", "Awaiting signatures"],
    active: ["blue", "In progress"],
    submitted: ["purple", "Submitted"],
    revision: ["amber", "Revision requested"],
    approved: ["green", "Approved - awaiting payment"],
    paid: ["green", "Paid"],
    disputed: ["red", "Disputed"],
  };
  const [c, l] = map[status] ?? ["gray", status];
  return <Badge color={c}>{l}</Badge>;
}

