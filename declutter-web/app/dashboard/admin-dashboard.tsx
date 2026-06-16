"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api, ApiError } from "@/lib/api";
import type { AdminMetrics, Escrow, Listing, Paginated, User } from "@/lib/types";
import { formatDateTime, formatNaira } from "@/lib/utils";

const adminNav = [
  { href: "/dashboard", label: "Overview", icon: ShieldCheck },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/listings", label: "Listings", icon: Tag },
  { href: "/dashboard/escrows", label: "Escrows", icon: Banknote },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

type AdminEscrow = Escrow & { listing?: Listing; buyer?: User; seller?: User };

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [escrows, setEscrows] = useState<Paginated<AdminEscrow> | null>(null);
  const [page, setPage] = useState(1);
  const [escrowStatus, setEscrowStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const m = await api.admin.metrics();
        if (!cancelled) setMetrics(m);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load metrics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.admin.escrows({ page, limit: 8, status: escrowStatus || undefined });
        if (!cancelled) setEscrows(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load escrows");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, escrowStatus]);

  return (
    <DashboardLayout
      brand={{ name: "Declutter", tagline: "Admin console" }}
      nav={adminNav}
      title="Overview"
      subtitle="Marketplace health across users, listings, and escrow."
      requireRole="admin"
    >
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-700">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total users" value={loading ? "—" : String(metrics?.totalUsers ?? 0)} icon={<Users className="h-4 w-4" />} />
        <Metric label="Active sellers" value={loading ? "—" : String(metrics?.activeSellers ?? 0)} icon={<ShoppingBag className="h-4 w-4" />} />
        <Metric label="Active listings" value={loading ? "—" : String(metrics?.activeListings ?? 0)} icon={<Tag className="h-4 w-4" />} />
        <Metric label="Orders placed" value={loading ? "—" : String(metrics?.totalOrders ?? 0)} icon={<ShieldCheck className="h-4 w-4" />} />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-zinc-200 bg-black p-6 text-white">
          <p className="text-xs uppercase tracking-wide text-zinc-300">Gross merchandise value</p>
          <p className="mt-2 text-4xl font-bold">{loading ? "—" : formatNaira(metrics?.gmvNgn ?? 0)}</p>
          <p className="mt-1 text-xs text-zinc-400">Across paid and completed orders.</p>
        </article>
        <article className="rounded-3xl border border-zinc-200 bg-white p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Fees collected</p>
          <p className="mt-2 text-4xl font-bold text-zinc-950">{loading ? "—" : formatNaira(metrics?.feesCollectedNgn ?? 0)}</p>
          <p className="mt-1 text-xs text-zinc-500">Total platform fees earned to date.</p>
        </article>
      </section>

      <section className="mt-8 rounded-3xl border border-zinc-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Escrows</h2>
            <p className="text-xs text-zinc-500">Funds held across all active orders.</p>
          </div>
          <div className="inline-flex rounded-full border border-zinc-200 p-1">
            {[
              { value: "", label: "All" },
              { value: "held", label: "Held" },
              { value: "released", label: "Released" },
              { value: "disputed", label: "Disputed" }
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  setEscrowStatus(opt.value);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  escrowStatus === opt.value ? "bg-black text-white" : "text-zinc-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-6 py-3">Listing</th>
                <th className="px-6 py-3">Buyer</th>
                <th className="px-6 py-3">Seller</th>
                <th className="px-6 py-3">Held</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Releases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(escrows?.results ?? []).map((escrow) => (
                <tr key={escrow.id}>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-zinc-950">{escrow.listing?.title ?? "—"}</p>
                    <p className="text-xs text-zinc-500">#{escrow.orderId.slice(0, 8)}</p>
                  </td>
                  <td className="px-6 py-4 text-zinc-700">{escrow.buyer?.phone ?? "—"}</td>
                  <td className="px-6 py-4 text-zinc-700">{escrow.seller?.phone ?? "—"}</td>
                  <td className="px-6 py-4 font-semibold text-zinc-950">{formatNaira(escrow.heldAmountNgn)}</td>
                  <td className="px-6 py-4 capitalize text-zinc-700">{escrow.status}</td>
                  <td className="px-6 py-4 text-xs text-zinc-500">{formatDateTime(escrow.releaseAfterAt)}</td>
                </tr>
              ))}
              {(!escrows || escrows.results.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-zinc-500">No escrows match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {escrows && escrows.results.length > 0 && (
          <footer className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
            <p className="text-xs text-zinc-500">
              Page {escrows.page} of {Math.max(escrows.totalPages, 1)}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={!escrows.hasPrev} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="secondary" size="sm" disabled={!escrows.hasNext} onClick={() => setPage(page + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </footer>
        )}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <QuickAction title="Moderate listings" description="Approve or reject pending listings." href="/dashboard/listings" />
        <QuickAction title="Manage users" description="Ban or unban users by phone number." href="/dashboard/users" />
      </section>
    </DashboardLayout>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {icon} {label}
      </div>
      <p className="mt-3 text-2xl font-bold text-zinc-950">{value}</p>
    </div>
  );
}

function QuickAction({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} className="block rounded-3xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-400">
      <p className="text-base font-semibold text-zinc-950">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-900">
        Open <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
