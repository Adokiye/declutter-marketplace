"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Banknote, Check, ChevronLeft, ChevronRight, Settings, ShieldCheck, Tag, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard-layout";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Listing, Paginated } from "@/lib/types";
import { formatDateTime, formatNaira } from "@/lib/utils";

const adminNav = [
  { href: "/dashboard", label: "Overview", icon: ShieldCheck },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/listings", label: "Listings", icon: Tag },
  { href: "/dashboard/escrows", label: "Escrows", icon: Banknote },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" }
];

export function AdminListings() {
  const { user } = useAuth();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Listing> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => setPage(1), [status]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.listings.search({ moderationStatus: status, status: "draft", page, limit: 12 });
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load listings");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, status]);

  async function approve(id: string) {
    if (!user) return;
    // Optionally record the IG post URL if the admin cross-posted this to Instagram —
    // this registers a dedupe row so the scraper won't re-import it.
    const igPostUrl =
      window.prompt("Posted this to Instagram? Paste the IG post URL to stop the scraper re-adding it (optional):")?.trim() || undefined;
    setPendingId(id);
    try {
      await api.admin.approveListing(id, user.id, igPostUrl);
      setData((current) => current && { ...current, results: current.results.filter((l) => l.id !== id) });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  async function reject(id: string) {
    setPendingId(id);
    try {
      await api.admin.rejectListing(id);
      setData((current) => current && { ...current, results: current.results.filter((l) => l.id !== id) });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <DashboardLayout
      brand={{ name: "Declutter", tagline: "Admin console" }}
      nav={adminNav}
      title="Listings"
      subtitle="Review pending listings and moderate the marketplace."
      requireRole="admin"
    >
      <div className="mb-6 inline-flex rounded-full border border-zinc-200 bg-white p-1">
        {STATUS_TABS.map((tab) => (
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

      <ul className="space-y-3">
        {(data?.results ?? []).map((listing) => (
          <li key={listing.id} className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
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
            <p className="text-sm font-bold text-zinc-950">{formatNaira(listing.priceNgn)}</p>
            {status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pendingId === listing.id}
                  onClick={() => approve(listing.id)}
                  data-testid={`approve-${listing.id}`}
                >
                  <Check className="h-4 w-4" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pendingId === listing.id}
                  onClick={() => reject(listing.id)}
                  data-testid={`reject-${listing.id}`}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              </div>
            )}
          </li>
        ))}
        {(!data || data.results.length === 0) && (
          <li className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-500">
            No {status} listings.
          </li>
        )}
      </ul>

      {data && data.results.length > 0 && (
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
      )}
    </DashboardLayout>
  );
}
