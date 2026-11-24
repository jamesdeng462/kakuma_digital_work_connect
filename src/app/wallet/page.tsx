"use client";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Smartphone, Wallet as WalletIcon, Clock, TrendingUp, Landmark, Info } from "lucide-react";
import { AppShell, useAuthed } from "@/components/AppShell";
import { Alert, Badge, Button, Card, ColumnChart, Input, Label, Modal, PageHeader, Select, Stat, fmtDate, money, useToast } from "@/components/ui";
import { balanceOf, deposit, requestMfiReferral, withdraw } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function WalletPage() {
  return (
    <AppShell roles={["worker", "employer"]}>
      <Wallet />
    </AppShell>
  );
}

function Wallet() {
  const { db, user } = useAuthed();
  const { t } = useT();
  const { toast, toastNode } = useToast();
  const [open, setOpen] = useState<"withdraw" | "deposit" | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("M-Pesa");
  const [account, setAccount] = useState(user.phone);
  const [err, setErr] = useState("");
  const isWorker = user.role === "worker";

  const tx = db.transactions.filter((x) => x.userId === user.id).sort((a, b) => b.at.localeCompare(a.at));
  const balance = balanceOf(db, user.id);
  const pending = db.contracts
    .filter((c) => (isWorker ? c.workerId : c.employerId) === user.id && ["active", "submitted", "revision", "approved"].includes(c.status))
    .reduce((s, c) => s + (isWorker ? c.amount * 0.95 : c.amount), 0);

  const analytics = useMemo(() => {
    const earn = tx.filter((x) => x.type === "earning" || x.type === "fee");
    const sumSince = (days: number) => earn.filter((x) => Date.now() - new Date(x.at).getTime() < days * 86400000).reduce((s, x) => s + x.amount, 0);
    const months: { label: string; value: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString("en", { month: "short" }),
        value: Math.round(earn.filter((x) => { const a = new Date(x.at); return a.getMonth() === d.getMonth() && a.getFullYear() === d.getFullYear(); }).reduce((s, x) => s + x.amount, 0)),
      });
    }
    return { week: sumSince(7), month: sumSince(30), total: earn.reduce((s, x) => s + x.amount, 0), months };
  }, [tx]);

  const monthsOfIncome = new Set(tx.filter((x) => x.type === "earning").map((x) => x.at.slice(0, 7))).size;

  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const n = parseFloat(amount);
    if (isNaN(n)) return setErr("Enter a valid amount.");
    setBusy(true);
    const r = open === "withdraw" ? await withdraw(n, method, account) : await deposit(n, method);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setOpen(null); setAmount(""); setErr("");
    toast(`${open === "withdraw" ? "Withdrawal" : "Top-up"} successful (ref ${r.ref}).`);
  };

  return (
    <>
      <PageHeader title={t("wallet")} subtitle={isWorker ? "Your KDWC e-wallet: earnings, withdrawals to mobile money and transaction history." : "Fund your wallet to pay workers when you approve their work."} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-brand-800 to-brand-600 text-white lg:col-span-1">
          <p className="flex items-center gap-2 text-sm text-brand-100"><WalletIcon size={16} /> {t("balance")}</p>
          <p className="mt-2 text-4xl font-extrabold">{money(balance)}</p>
          <p className="mt-1 text-sm text-brand-100">USD · ≈ KES {(balance * 129).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <div className="mt-5 flex gap-2">
            {isWorker ? (
              <Button variant="warn" onClick={() => { setOpen("withdraw"); setMethod("M-Pesa"); }}><ArrowUpRight size={16} /> {t("withdraw")}</Button>
            ) : (
              <Button variant="warn" onClick={() => { setOpen("deposit"); setMethod("M-Pesa"); }}><ArrowDownLeft size={16} /> Top up</Button>
            )}
          </div>
        </Card>
        <Stat label={isWorker ? "Pending (active contracts)" : "Committed to active contracts"} value={money(Math.round(pending * 100) / 100)} icon={<Clock size={18} />} />
        {isWorker ? (
          <div className="grid grid-cols-2 gap-4">
            <Stat label="This week" value={money(Math.round(analytics.week * 100) / 100)} icon={<TrendingUp size={18} />} />
            <Stat label="This month" value={money(Math.round(analytics.month * 100) / 100)} />
            <div className="col-span-2"><Stat label="Total earned (after fees)" value={money(Math.round(analytics.total * 100) / 100)} /></div>
          </div>
        ) : (
          <Stat label="Total paid to workers" value={money(-tx.filter((x) => x.type === "payment").reduce((s, x) => s + x.amount, 0))} />
        )}
      </div>

      {isWorker && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h2 className="mb-4 font-bold">Earnings (last 6 months)</h2>
            <ColumnChart data={analytics.months} format={(n) => `$${n}`} />
          </Card>
          <Card>
            <h2 className="mb-2 flex items-center gap-2 font-bold"><Landmark size={18} className="text-brand-600" /> Microfinance referral</h2>
            {monthsOfIncome >= 3 ? (
              <>
                <p className="text-sm text-slate-600">You have {monthsOfIncome} months of documented income on KDWC. You are eligible for a verified referral to a partner microfinance institution.</p>
                <Button variant="secondary" className="mt-3 w-full" onClick={async () => { const r = await requestMfiReferral(); toast(r.ok ? "Referral request sent to a partner MFI." : r.error, r.ok ? "success" : "error"); }}>Request referral</Button>
              </>
            ) : (
              <p className="text-sm text-slate-600">Earn on KDWC for 3 different months to unlock referrals to partner microfinance institutions ({monthsOfIncome}/3).</p>
            )}
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><Info size={14} className="mt-0.5 shrink-0" /> Never share your M-Pesa PIN or OTP with anyone. KDWC staff will never ask for it.</p>
          </Card>
        </div>
      )}

      <Card className="mt-6 overflow-x-auto p-0">
        <h2 className="px-5 pt-5 font-bold">Transaction history</h2>
        <table className="mt-3 w-full min-w-[600px] text-sm">
          <thead className="border-y bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-5 py-2">Date</th><th className="px-5 py-2">Description</th><th className="px-5 py-2">Method</th><th className="px-5 py-2">Ref</th><th className="px-5 py-2 text-right">Amount</th></tr>
          </thead>
          <tbody>
            {tx.map((x) => (
              <tr key={x.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-5 py-3 text-slate-500">{fmtDate(x.at)}</td>
                <td className="px-5 py-3">{x.description} {x.type === "fee" && <Badge>fee</Badge>}</td>
                <td className="px-5 py-3 text-slate-500">{x.method}</td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{x.ref}</td>
                <td className={`px-5 py-3 text-right font-semibold tabular-nums ${x.amount >= 0 ? "text-brand-700" : "text-slate-700"}`}>{x.amount >= 0 ? "+" : "−"}{money(Math.abs(x.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open === "withdraw" ? "Withdraw to mobile money" : "Top up wallet"}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="method">Method</Label>
            <Select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>M-Pesa</option>
              <option>Airtel Money</option>
              <option>Chipper Cash</option>
              <option>Bank transfer (SWIFT)</option>
            </Select>
            {method !== "M-Pesa" && <p className="mt-1 text-xs text-slate-500">Alternative payment rails for users without a Kenyan SIM.</p>}
          </div>
          {open === "withdraw" && (
            <div>
              <Label htmlFor="acct">{method.includes("Bank") ? "Account number / IBAN" : "Phone number"}</Label>
              <Input id="acct" value={account} onChange={(e) => setAccount(e.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="amt">Amount (USD)</Label>
            <Input id="amt" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            {open === "withdraw" && <p className="mt-1 text-xs text-slate-500">Available: {money(balance)}</p>}
          </div>
          {err && <Alert kind="error">{err}</Alert>}
          <p className="flex items-center gap-2 text-xs text-slate-500"><Smartphone size={14} /> Sandbox mode - no real money moves in this prototype.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(null)}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={busy}>{open === "withdraw" ? t("withdraw") : "Top up"}</Button>
          </div>
        </div>
      </Modal>
      {toastNode}
    </>
  );
}
