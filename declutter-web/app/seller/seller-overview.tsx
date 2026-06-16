"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Banknote, Boxes, ChevronRight, LineChart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { sellerNav } from "@/components/seller-nav";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fallbackListingImage, heroImages } from "@/lib/images";
import type { Listing, Order, Paginated, SellerBalance } from "@/lib/types";
import { formatDateTime, formatNaira } from "@/lib/utils";

export function SellerOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [orders, setOrders] = useState<Paginated<Order> | null>(null);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const [statsRes, balanceRes, ordersRes, listingsRes] = await Promise.all([
          api.listings.sellerStats(user!.id),
          api.payouts.balance(user!.id),
          api.orders.list({ sellerUserId: user!.id, limit: 5 }),
          api.listings.search({ sellerUserId: user!.id, limit: 6 })
        ]);
        if (cancelled) return;
        setStats(statsRes);
        setBalance(balanceRes);
        setOrders(ordersRes);
        setRecentListings(listingsRes.results);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load dashboard");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <DashboardLayout
      brand={{ name: "Declutter", tagline: "Seller console" }}
      nav={sellerNav}
      title="Overview"
      subtitle="Performance across your listings, escrows, and payouts."
      requireRole="seller"
      actions={
        <Button asChild>
          <Link href="/seller/new-listing">New listing</Link>
        </Button>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active listings" value={String(stats?.active ?? 0)} icon={<Boxes className="h-4 w-4" />} />
        <Metric label="Sold this month" value={String(stats?.sold ?? 0)} icon={<ShoppingCart className="h-4 w-4" />} />
        <Metric
          label="Available balance"
          value={formatNaira(balance?.availableBalanceNgn ?? 0)}
          icon={<Banknote className="h-4 w-4" />}
        />
        <Metric
          label="Locked in escrow"
          value={formatNaira(balance?.payoutLockedNgn ?? 0)}
          icon={<LineChart className="h-4 w-4" />}
        />
      </section>

      {error && <p className="mt-6 rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-700">{error}</p>}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-zinc-200 bg-white">
          <header className="flex items-center justify-between border-b border-zinc-100 p-6">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Recent orders</h2>
              <p className="text-xs text-zinc-500">Latest orders containing your listings.</p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/seller/listings">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </header>
          <ul className="divide-y divide-zinc-100">
            {(orders?.results ?? []).map((order) => (
              <li key={order.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-semibold text-zinc-950">{order.listing?.title ?? "Listing"}</p>
                  <p className="text-xs text-zinc-500">{formatDateTime(order.createdAt)} · {order.status.replace("_", " ")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-zinc-950">{formatNaira(order.itemPriceNgn)}</p>
                  <p className="text-xs text-zinc-500">#{order.id.slice(0, 8)}</p>
                </div>
              </li>
            ))}
            {(!orders || orders.results.length === 0) && (
              <li className="p-10 text-center text-sm text-zinc-500">No orders yet.</li>
            )}
          </ul>
        </article>

        <article className="rounded-3xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-zinc-950">Payouts at a glance</h2>
          <p className="mt-1 text-xs text-zinc-500">Funds available for transfer to your bank account.</p>

          <div className="mt-6 rounded-2xl bg-black p-6 text-white">
            <p className="text-xs uppercase tracking-wide text-zinc-300">Available now</p>
            <p className="mt-2 text-3xl font-bold">{formatNaira(balance?.availableBalanceNgn ?? 0)}</p>
            <p className="mt-1 text-xs text-zinc-400">Released escrow minus pending payouts.</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Stat label="Released escrow" value={formatNaira(balance?.releasedEscrowBalanceNgn ?? 0)} />
            <Stat label="Pending payouts" value={formatNaira(balance?.payoutLockedNgn ?? 0)} />
          </div>

          <Button asChild className="mt-6 w-full">
            <Link href="/seller/payouts">Request payout</Link>
          </Button>
        </article>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <StatusCard label="Draft" value={stats?.draft ?? 0} />
        <StatusCard label="Active" value={stats?.active ?? 0} />
        <StatusCard label="Sold" value={stats?.sold ?? 0} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-3">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-zinc-950">{value}</p>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label} listings</p>
      <p className="mt-2 text-3xl font-bold text-zinc-950">{value}</p>
    </div>
  );
}
