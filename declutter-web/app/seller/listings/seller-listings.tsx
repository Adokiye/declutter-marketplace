"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { sellerNav } from "@/components/seller-nav";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { emptyState } from "@/lib/images";
import type { Listing, Paginated } from "@/lib/types";
import { formatDateTime, formatNaira } from "@/lib/utils";

const TABS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "sold", label: "Sold" }
] as const;

export function SellerListings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<(typeof TABS)[number]["value"]>("active");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Listing> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPage(1), [status]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const moderationStatus =
          status === "active" ? "approved" :
          status === "draft" ? "pending" :
          status === "sold" ? "approved" : undefined;
        const res = await api.listings.search({
          sellerUserId: user!.id,
          status,
          moderationStatus,
          page,
          limit: 12
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load listings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user, status, page]);

  return (
    <DashboardLayout
      brand={{ name: "Declutter", tagline: "Seller console" }}
      nav={sellerNav}
      title="Listings"
      subtitle="Manage your inventory across all statuses."
      requireRole="seller"
      actions={
        <Button asChild>
          <Link href="/seller/new-listing"><PackagePlus className="h-4 w-4" /> New listing</Link>
        </Button>
      }
    >
      <div className="mb-6 inline-flex rounded-full border border-zinc-200 bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              status === tab.value ? "bg-black text-white" : "text-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-2xl border border-zinc-300 bg-white p-4 text-sm text-zinc-700">{error}</p>}

      {loading && !data ? (
        <SkeletonList />
      ) : data && data.results.length > 0 ? (
        <>
          <ul className="space-y-3">
            {data.results.map((listing) => (
              <li
                key={listing.id}
                className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-zinc-100">
                  <Image
                    src={listing.images?.[0]?.url ?? "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=85"}
                    alt={listing.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-zinc-950">{listing.title}</p>
                  <p className="text-xs text-zinc-500">
                    {listing.locationLabel} · {listing.condition} · {formatDateTime(listing.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-950">{formatNaira(listing.priceNgn)}</p>
                  <p className="text-xs text-zinc-500">
                    {listing.moderationStatus === "pending"
                      ? "Awaiting moderation"
                      : listing.moderationStatus === "rejected"
                      ? "Rejected"
                      : listing.status}
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/listings/${listing.id}`}>View</Link>
                </Button>
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
      ) : (
        <EmptyState status={status} />
      )}
    </DashboardLayout>
  );
}

const useMemoizedTabs = () => useMemo(() => TABS, []);
void useMemoizedTabs;

function SkeletonList() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="h-20 animate-pulse rounded-2xl bg-white" />
      ))}
    </ul>
  );
}

function EmptyState({ status }: { status: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-dashed border-zinc-300 bg-white">
      <div className="relative h-44 w-full bg-zinc-100">
        <Image src={emptyState.listings} alt="" fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
      </div>
      <div className="p-8 text-center">
        <p className="text-lg font-semibold text-zinc-900">No {status} listings</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">When you publish or sell items they will show up here.</p>
        <Button asChild className="mt-6">
          <Link href="/seller/new-listing">Create your first listing</Link>
        </Button>
      </div>
    </div>
  );
}
