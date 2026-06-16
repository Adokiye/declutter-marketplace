"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, Flame, MapPin, ShieldCheck, Star, Tag as TagIcon, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingGallery } from "@/components/listing-gallery";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Listing } from "@/lib/types";
import { displayDate, formatCondition, formatNaira } from "@/lib/utils";

export function ListingDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await api.listings.get(id);
        if (!cancelled) setListing(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError("Could not load listing");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleBuy() {
    if (!hydrated) return;
    if (!user) {
      router.push(`/login?next=/checkout/${id}`);
      return;
    }
    router.push(`/checkout/${id}`);
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-5 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="aspect-square animate-pulse rounded-3xl bg-zinc-100" />
          <div className="space-y-3">
            <div className="h-7 w-2/3 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
            <div className="h-10 w-1/3 animate-pulse rounded bg-zinc-100" />
            <div className="h-32 w-full animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
        <p className="text-lg font-semibold text-zinc-900">Listing not available</p>
        <p className="mt-2 text-sm text-zinc-500">{error ?? "This listing may have been removed."}</p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/marketplace">
            <ChevronLeft className="h-4 w-4" /> Back to marketplace
          </Link>
        </Button>
      </main>
    );
  }

  const images = listing.images?.length
    ? listing.images
    : [{ id: "fallback", listingId: listing.id, url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85", altText: listing.title, sortOrder: 0, isPrimary: true }];

  return (
    <main className="bg-zinc-50">
      <div className="mx-auto w-full max-w-7xl px-5 py-8">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-black">
          <ChevronLeft className="h-4 w-4" /> Back to marketplace
        </Link>
      </div>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-5 pb-16 lg:grid-cols-[1.1fr_0.9fr]">
        <ListingGallery images={images} title={listing.title} />

        <div className="space-y-6">
          <div>
            {listing.category?.name && (
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">{listing.category.name}</p>
            )}
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">{listing.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-zinc-500">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {listing.locationLabel}</span>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">{formatCondition(listing.condition)}</span>
              {listing.brand && (
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">{listing.brand}</span>
              )}
              {listing.isGoodDeal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <TagIcon className="h-3 w-3" /> Good deal
                </span>
              )}
              {listing.isDistressSale && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  <Flame className="h-3 w-3" /> Distress sale
                </span>
              )}
              {listing.source === "instagram" && (
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold uppercase text-white">From Instagram</span>
              )}
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400">
              <CalendarDays className="h-3.5 w-3.5" /> Posted {displayDate(listing)}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Listed price</p>
            <p className="mt-2 text-4xl font-semibold text-zinc-950">{formatNaira(listing.priceNgn)}</p>
            <p className="mt-1 text-xs text-zinc-500">Declutter commission is calculated at checkout.</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={handleBuy} className="flex-1 min-w-[160px]" data-testid="listing-buy-now">
                Buy now
              </Button>
              <Button asChild variant="secondary">
                <Link href="/marketplace">Keep browsing</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Feature icon={<ShieldCheck className="h-4 w-4" />} label="Buyer protection" value="Protected checkout" />
            <Feature icon={<Truck className="h-4 w-4" />} label="Pickup" value={listing.city ?? "Lagos"} />
            <Feature icon={<Star className="h-4 w-4" />} label="Verified seller" value="Phone number confirmed" />
          </div>

          <article className="rounded-3xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-zinc-950">About this item</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-zinc-700">{listing.description}</p>
          </article>

          {listing.seller && (
            <article className="rounded-3xl border border-zinc-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-zinc-950">Seller</h2>
              <div className="mt-3 flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-sm font-bold text-white">
                  {(listing.seller.firstName ?? listing.seller.phone).slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-950">
                    {listing.seller.firstName?.trim() || listing.seller.lastName?.trim() || "Verified seller"}
                  </p>
                  <p className="text-xs text-zinc-500">Contact details revealed after payment.</p>
                </div>
              </div>
            </article>
          )}
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-700">{icon}<span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span></div>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
