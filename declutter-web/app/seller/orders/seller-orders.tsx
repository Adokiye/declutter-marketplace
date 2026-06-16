"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { sellerNav } from "@/components/seller-nav";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Order, Paginated } from "@/lib/types";
import { formatDateTime, formatNaira } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "fee_paid", label: "Awaiting pickup" },
  { value: "escrow_paid", label: "In escrow" },
  { value: "completed", label: "Completed" }
];

function statusLabel(status: Order["status"]) {
  switch (status) {
    case "pending_payment": return "Awaiting payment";
    case "escrow_paid": return "In escrow";
    case "fee_paid": return "Commission paid";
    case "completed": return "Completed";
    case "disputed": return "Disputed";
    case "refunded": return "Refunded";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

export function SellerOrders() {
  const { user, hydrated } = useAuth();
  const [data, setData] = useState<Paginated<Order> | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !user) return;
    let cancelled = false;
    setLoading(true);
    api.orders
      .list({ sellerUserId: user.id, page, limit: 15, status: status || undefined })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Could not load orders"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [hydrated, user, page, status]);

  return (
    <DashboardLayout
      brand={{ name: "Declutter", tagline: "Seller" }}
      nav={sellerNav}
      title="Orders"
      subtitle="Sales of your listings — track payment, pickup, and completion."
      requireRole="seller"
    >
      <div className="mb-6 inline-flex flex-wrap rounded-full border border-zinc-200 bg-white p-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${status === f.value ? "bg-brand text-brand-foreground" : "text-zinc-600"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-700">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      ) : !data || data.results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-zinc-900">No orders yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">When buyers purchase your listings, their orders show up here.</p>
          <Button asChild className="mt-5"><Link href="/seller/listings">View your listings</Link></Button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {data.results.map((order) => (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`} className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400">
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-zinc-100">
                    <Image
                      src={order.listing?.images?.[0]?.url ?? "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80"}
                      alt={order.listing?.title ?? "Item"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-950">{order.listing?.title ?? "Item"}</p>
                    <p className="text-xs text-zinc-500">{formatDateTime(order.createdAt)} · Order #{order.id.slice(0, 8)}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-bold text-zinc-950">{formatNaira(order.itemPriceNgn)}</p>
                    <p className="text-xs text-zinc-500">item value</p>
                  </div>
                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">{statusLabel(order.status)}</span>
                  <ChevronRight className="h-5 w-5 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6">
            <p className="text-xs text-zinc-500">Page {data.page} of {Math.max(data.totalPages, 1)}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={!data.hasPrev} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button variant="secondary" size="sm" disabled={!data.hasNext} onClick={() => setPage(page + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
