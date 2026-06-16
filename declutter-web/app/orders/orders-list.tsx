"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { emptyState } from "@/lib/images";
import type { Order, Paginated } from "@/lib/types";
import { formatDateTime, formatNaira } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function OrdersList() {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login?next=/orders");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await api.orders.list({ buyerUserId: user!.id, limit: 25 });
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <main className="bg-zinc-50">
      <section className="mx-auto w-full max-w-5xl px-5 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-950">My orders</h1>
            <p className="mt-1 text-sm text-zinc-500">Track everything you&apos;ve purchased through Declutter.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/marketplace"><ShoppingBag className="h-4 w-4" /> Keep shopping</Link>
          </Button>
        </div>

        {loading ? (
          <div className="mt-10 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-zinc-100" />
            ))}
          </div>
        ) : error ? (
          <p className="mt-10 rounded-3xl border border-zinc-300 bg-white p-6 text-sm text-zinc-700">{error}</p>
        ) : !data || data.results.length === 0 ? (
          <div className="mt-10 overflow-hidden rounded-3xl border border-dashed border-zinc-300 bg-white">
            <div className="relative h-56 w-full bg-zinc-100">
              <Image src={emptyState.orders} alt="" fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
            </div>
            <div className="p-10 text-center">
              <p className="text-lg font-semibold text-zinc-900">No orders yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">Browse the marketplace and place your first order.</p>
              <Button asChild className="mt-6">
                <Link href="/marketplace">Browse marketplace</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {data.results.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 rounded-3xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400"
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-zinc-100">
                    <Image
                      src={order.listing?.images?.[0]?.url ?? "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=85"}
                      alt={order.listing?.title ?? "Item"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-950">{order.listing?.title ?? "Item"}</p>
                    <p className="text-xs text-zinc-500">{formatDateTime(order.createdAt)} · {order.status.replace("_", " ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-950">{formatNaira(order.amountDueNgn)}</p>
                    <p className="text-xs text-zinc-500">Order #{order.id.slice(0, 8)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
