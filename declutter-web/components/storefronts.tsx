import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, Sparkles, Tag } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { StorefrontSearch } from "@/components/storefront-search";
import { Button } from "@/components/ui/button";
import type { Category, Listing } from "@/lib/types";
import type { ThemeKey } from "@/lib/theme";

const editorialImages = {
  table: "https://images.unsplash.com/photo-1532372320978-9d397ff5d79c?auto=format&fit=crop&w=1200&q=85",
  decor: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85",
  pilates: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?auto=format&fit=crop&w=1600&q=85",
  phone: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1600&q=85",
  sneaker: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85"
};

type StorefrontProps = {
  theme: ThemeKey;
  categories: Category[];
  fresh: Listing[];
  distress: Listing[];
  bestDeals: Listing[];
};

export function Storefront({ theme, categories, fresh, distress, bestDeals }: StorefrontProps) {
  const sections = <StorefrontSections fresh={fresh} distress={distress} bestDeals={bestDeals} />;
  if (theme === "belo-fur") return <BeloFurStorefront categories={categories}>{sections}</BeloFurStorefront>;
  if (theme === "lefore") return <LeforeStorefront categories={categories}>{sections}</LeforeStorefront>;
  return <EmoxStorefront categories={categories}>{sections}</EmoxStorefront>;
}

function CategoryStrip({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;
  return (
    <div className="flex flex-wrap gap-2.5">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/marketplace?categoryId=${category.id}`}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-brand hover:text-brand"
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}

/** A single horizontal row of listings (one row, never wraps). */
function ListingRow({
  title,
  href,
  listings,
  icon
}: {
  title: string;
  href: string;
  listings: Listing[];
  icon?: React.ReactNode;
}) {
  if (!listings.length) return null;
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-zinc-950">
          {icon} {title}
        </h2>
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-3 scrollbar-hide">
        {listings.map((listing) => (
          <div key={listing.id} className="w-60 shrink-0 snap-start sm:w-64">
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>
    </section>
  );
}

function StorefrontSections({ fresh, distress, bestDeals }: { fresh: Listing[]; distress: Listing[]; bestDeals: Listing[] }) {
  const empty = !fresh.length && !distress.length && !bestDeals.length;
  if (empty) {
    return (
      <div className="rounded-brand border border-dashed border-zinc-300 bg-white p-12 text-center">
        <p className="text-sm font-semibold text-zinc-900">No listings yet</p>
        <p className="mt-1 text-sm text-zinc-500">Be the first to list — sellers can post in minutes.</p>
        <Button asChild className="mt-4"><Link href="/seller/new-listing">Start selling</Link></Button>
      </div>
    );
  }
  return (
    <div className="space-y-12">
      <ListingRow title="Fresh listings" href="/marketplace" listings={fresh} icon={<Sparkles className="h-5 w-5 text-brand" />} />
      <ListingRow title="Best deals" href="/marketplace?isGoodDeal=true" listings={bestDeals} icon={<Tag className="h-5 w-5 text-emerald-500" />} />
      <ListingRow title="Distress sales" href="/marketplace?isDistressSale=true" listings={distress} icon={<Flame className="h-5 w-5 text-red-500" />} />
    </div>
  );
}

/* -------------------------- Emox: clean marketplace -------------------------- */
function EmoxStorefront({ categories, children }: { categories: Category[]; children: React.ReactNode }) {
  return (
    <main className="bg-canvas">
      <section className="mx-auto w-full max-w-7xl px-5 py-8">
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="relative min-h-[320px] overflow-hidden rounded-brand bg-zinc-900 p-10 text-white">
            <Image src={editorialImages.phone} alt="" fill className="object-cover opacity-55" priority />
            <div className="relative max-w-md">
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">Lagos · Peer-to-peer</p>
              <h1 className="mt-3 text-4xl font-black leading-tight">Find great deals on pre-loved things.</h1>
              <p className="mt-3 text-sm text-white/80">Verified sellers, transparent commission, and protected checkout.</p>
              <StorefrontSearch tone="dark" className="mt-6 max-w-md" />
            </div>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-brand bg-zinc-200 p-9 text-zinc-950">
            <Image src={editorialImages.sneaker} alt="" fill className="object-cover opacity-50" />
            <div className="relative">
              <p className="text-2xl font-black">Sell in minutes</p>
              <p className="mt-2 max-w-[14rem] text-sm text-zinc-700">List an item, set your price, get paid securely.</p>
              <Button asChild className="mt-6"><Link href="/seller/new-listing">Start selling</Link></Button>
            </div>
          </div>
        </div>

        <section className="py-10">
          <h2 className="mb-5 text-2xl font-black">Shop by category</h2>
          <CategoryStrip categories={categories} />
        </section>

        <div className="pb-16">{children}</div>
      </section>
    </main>
  );
}

/* -------------------------- Belo.Fur: editorial furniture -------------------------- */
function BeloFurStorefront({ categories, children }: { categories: Category[]; children: React.ReactNode }) {
  return (
    <main className="bg-canvas text-zinc-950">
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Curated interiors</p>
          <h1 className="mt-5 text-6xl font-semibold leading-[0.95] md:text-7xl">Enduring comfort, pre-loved.</h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-zinc-600">
            Bedroom, living room, and workspace pieces from Lagos sellers — arranged with an editorial rhythm.
          </p>
          <StorefrontSearch placeholder="Search furniture & decor" className="mt-8 max-w-md" />
          <div className="mt-8">
            <Button asChild className="rounded-brand"><Link href="/marketplace">Shop the collection <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </div>
        <div className="relative min-h-[460px] overflow-hidden rounded-brand bg-zinc-50">
          <Image src={editorialImages.table} alt="Editorial interior" fill className="object-cover" priority />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10 lg:px-8">
        <CategoryStrip categories={categories} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">{children}</section>
    </main>
  );
}

/* -------------------------- Lefore: premium movement studio -------------------------- */
function LeforeStorefront({ categories, children }: { categories: Category[]; children: React.ReactNode }) {
  return (
    <main className="bg-canvas">
      <section className="relative mx-auto min-h-[520px] max-w-7xl overflow-hidden rounded-brand">
        <Image src={editorialImages.pilates} alt="Intentional movement" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
        <div className="absolute bottom-14 left-8 max-w-xl text-white lg:left-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Premium · pre-owned</p>
          <h1 className="mt-4 text-5xl font-medium leading-tight md:text-6xl">Designed for intentional movement.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/80">
            Reformers and training systems shaped through precision engineering — at Lagos peer-to-peer prices.
          </p>
          <StorefrontSearch tone="dark" placeholder="Search equipment" className="mt-7 max-w-md" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <CategoryStrip categories={categories} />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">{children}</section>
    </main>
  );
}
