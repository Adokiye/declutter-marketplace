"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, Check, Loader2, Percent, Settings, ShieldCheck, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { InstagramBusinesses } from "./instagram-businesses";
import { api, ApiError } from "@/lib/api";

const adminNav = [
  { href: "/dashboard", label: "Overview", icon: ShieldCheck },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/listings", label: "Listings", icon: Tag },
  { href: "/dashboard/escrows", label: "Escrows", icon: Banknote },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

type Mode = "escrow" | "fee_only_offline";

const MODES: { value: Mode; title: string; description: string }[] = [
  {
    value: "fee_only_offline",
    title: "Buyer pays commission only",
    description: "Buyers pay just the Declutter commission online and settle the item price with the seller offline. Recommended default."
  },
  {
    value: "escrow",
    title: "Buyer pays commission + item value",
    description: "Buyers pay the full item price plus commission. Funds are held in escrow and released to the seller after the 24-hour inspection window."
  }
];

export function AdminSettings() {
  const [mode, setMode] = useState<Mode>("fee_only_offline");
  const [feePercent, setFeePercent] = useState("5");
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [savingFee, setSavingFee] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.settings
      .all()
      .then((rows) => {
        if (!active) return;
        const m = rows.find((r) => r.key === "default_payment_mode")?.value?.mode;
        if (m === "escrow" || m === "fee_only_offline") setMode(m);
        const fee = rows.find((r) => r.key === "platform_fee_percent")?.value?.percent;
        if (fee != null) setFeePercent(String(fee));
      })
      .catch((err) => active && setError(err instanceof ApiError ? err.message : "Could not load settings"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  function flashSaved(label: string) {
    setSaved(label);
    setTimeout(() => setSaved(null), 2500);
  }

  async function selectMode(next: Mode) {
    if (next === mode || savingMode) return;
    const prev = mode;
    setMode(next);
    setSavingMode(true);
    setError(null);
    try {
      await api.settings.setDefaultPaymentMode(next);
      flashSaved("Payment mode updated");
    } catch (err) {
      setMode(prev);
      setError(err instanceof ApiError ? err.message : "Could not update payment mode");
    } finally {
      setSavingMode(false);
    }
  }

  async function saveFee() {
    const percent = Number(feePercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setError("Enter a commission between 0 and 100.");
      return;
    }
    setSavingFee(true);
    setError(null);
    try {
      await api.settings.setPlatformFee(percent);
      flashSaved("Commission updated");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update commission");
    } finally {
      setSavingFee(false);
    }
  }

  return (
    <DashboardLayout
      brand={{ name: "Declutter", tagline: "Admin console" }}
      nav={adminNav}
      title="Settings"
      subtitle="Platform-wide payment configuration."
      requireRole="admin"
    >
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-700">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}
      {saved && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Check className="h-4 w-4" /> {saved}
        </div>
      )}

      <section className="max-w-3xl space-y-6">
        <article className="rounded-3xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-950">Default payment mode</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Applies to every checkout. Buyers never choose — this is what they&apos;ll be charged.
          </p>

          {loading ? (
            <div className="mt-6 h-32 animate-pulse rounded-2xl bg-zinc-100" />
          ) : (
            <div className="mt-5 grid gap-3">
              {MODES.map((m) => {
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => selectMode(m.value)}
                    disabled={savingMode}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      active ? "border-brand bg-brand-soft" : "border-zinc-200 hover:border-zinc-300"
                    }`}
                    data-testid={`payment-mode-${m.value}`}
                  >
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${active ? "border-brand bg-brand text-brand-foreground" : "border-zinc-300"}`}>
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-zinc-950">{m.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-500">{m.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-950">Platform commission</h2>
          <p className="mt-1 text-sm text-zinc-500">The percentage Declutter charges on each order.</p>
          <div className="mt-5 flex items-center gap-3">
            <div className="relative w-40">
              <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                className="h-11 w-full rounded-full border border-zinc-200 pl-9 pr-4 text-sm outline-none focus:border-brand"
                data-testid="platform-fee-input"
              />
            </div>
            <Button onClick={saveFee} disabled={savingFee || loading}>
              {savingFee ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {savingFee ? "Saving…" : "Save commission"}
            </Button>
          </div>
        </article>

        <InstagramBusinesses />
      </section>
    </DashboardLayout>
  );
}
