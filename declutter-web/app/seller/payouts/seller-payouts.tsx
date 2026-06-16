"use client";

import { useEffect, useState } from "react";
import { Banknote, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard-layout";
import { sellerNav } from "@/components/seller-nav";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SellerBalance } from "@/lib/types";
import { formatNaira } from "@/lib/utils";

export function SellerPayouts() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await api.payouts.balance(user!.id);
        if (!cancelled) setBalance(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load balance");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function saveBank() {
    if (!user) return;
    setSavingBank(true);
    setError(null);
    try {
      await api.payouts.createBankAccount({
        userId: user.id,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        isDefault: true
      });
      setSuccess("Bank account saved.");
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Could not save bank account");
    } finally {
      setSavingBank(false);
    }
  }

  async function requestPayout() {
    if (!user) return;
    setRequesting(true);
    setError(null);
    try {
      await api.payouts.request(user.id, { amountNgn: Number(amount) });
      setSuccess("Payout request submitted. You will receive a confirmation shortly.");
      setAmount("");
      const refreshed = await api.payouts.balance(user.id);
      setBalance(refreshed);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Could not request payout");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <DashboardLayout
      brand={{ name: "Declutter", tagline: "Seller console" }}
      nav={sellerNav}
      title="Payouts"
      subtitle="Withdraw your released escrow balance to your Nigerian bank account."
      requireRole="seller"
    >
      {error && <p className="mb-4 rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-700">{error}</p>}
      {success && (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </p>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <article className="rounded-3xl border border-zinc-200 bg-black p-6 text-white">
          <p className="text-xs uppercase tracking-wide text-zinc-300">Available balance</p>
          <p className="mt-2 text-5xl font-bold">{formatNaira(balance?.availableBalanceNgn ?? 0)}</p>
          <p className="mt-2 text-xs text-zinc-400">Released escrow minus pending payouts.</p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <Stat label="Released escrow" value={formatNaira(balance?.releasedEscrowBalanceNgn ?? 0)} />
            <Stat label="Pending payouts" value={formatNaira(balance?.payoutLockedNgn ?? 0)} />
          </div>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6">
          <h3 className="text-base font-semibold text-zinc-950">Request payout</h3>
          <p className="mt-1 text-xs text-zinc-500">Funds transfer to your default Nigerian bank account.</p>
          <div className="mt-5 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Amount (₦)</label>
            <Input
              type="number"
              name="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={1}
              placeholder="Amount"
            />
          </div>
          <Button
            className="mt-6 w-full"
            disabled={requesting || !amount || Number(amount) <= 0}
            onClick={requestPayout}
            data-testid="payout-request"
          >
            <Banknote className="h-4 w-4" />
            {requesting ? "Submitting…" : "Request payout"}
          </Button>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6">
        <h3 className="text-base font-semibold text-zinc-950">Bank account</h3>
        <p className="mt-1 text-xs text-zinc-500">Save your default Nigerian bank account for faster payouts.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Bank name
            <Input
              name="bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. GTBank"
            />
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Account number
            <Input
              name="account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0123456789"
            />
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Account holder
            <Input
              name="account holder"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Full name"
            />
          </label>
        </div>
        <Button
          className="mt-5"
          variant="secondary"
          disabled={savingBank || !bankName || !accountNumber || !accountName}
          onClick={saveBank}
        >
          {savingBank ? "Saving…" : "Save as default"}
        </Button>
      </section>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
