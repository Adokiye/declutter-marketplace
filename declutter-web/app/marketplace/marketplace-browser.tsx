"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";
import { formatCondition } from "@/lib/utils";
import type { Category, Listing, Paginated } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" }
] as const;

const CONDITIONS = ["new", "like_new", "good", "fair", "for_parts"];

type Sort = (typeof SORT_OPTIONS)[number]["value"];

export function MarketplaceBrowser() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Initialise all filter state from the URL so links/filters are shareable.
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "");
  const [categoryId, setCategoryId] = useState(params.get("categoryId") ?? "");
  const [condition, setCondition] = useState(params.get("condition") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") ?? "");
  const [distressOnly, setDistressOnly] = useState(params.get("isDistressSale") === "true");
  const [dealsOnly, setDealsOnly] = useState(params.get("isGoodDeal") === "true");
  const [sort, setSort] = useState<Sort>((params.get("sort") as Sort) ?? "newest");
  const [page, setPage] = useState(Number(params.get("page")) || 1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<Paginated<Listing> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput, 350);
  const debouncedMin = useDebounce(minPrice, 450);
  const debouncedMax = useDebounce(maxPrice, 450);

  useEffect(() => {
    let active = true;
    api.categories.list().then((c) => active && setCategories(c)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Reset to page 1 whenever a filter (other than page itself) changes.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setPage(1);
  }, [debouncedSearch, categoryId, condition, city, debouncedMin, debouncedMax, distressOnly, dealsOnly, sort]);

  // Keep the URL in sync with the active filters.
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch.trim()) next.set("q", debouncedSearch.trim());
    if (categoryId) next.set("categoryId", categoryId);
    if (condition) next.set("condition", condition);
    if (city.trim()) next.set("city", city.trim());
    if (debouncedMin) next.set("minPrice", debouncedMin);
    if (debouncedMax) next.set("maxPrice", debouncedMax);
    if (distressOnly) next.set("isDistressSale", "true");
    if (dealsOnly) next.set("isGoodDeal", "true");
    if (sort !== "newest") next.set("sort", sort);
    if (page > 1) next.set("page", String(page));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedSearch, categoryId, condition, city, debouncedMin, debouncedMax, distressOnly, dealsOnly, sort, page, pathname, router]);

  // Fetch from the backend whenever the (debounced) filters change.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listings.search({
          page,
          limit: 12,
          q: debouncedSearch.trim() || undefined,
          categoryId: categoryId || undefined,
          condition: condition || undefined,
          city: city.trim() || undefined,
          minPrice: debouncedMin ? Number(debouncedMin) : undefined,
          maxPrice: debouncedMax ? Number(debouncedMax) : undefined,
          isDistressSale: distressOnly ? "true" : undefined,
          isGoodDeal: dealsOnly ? "true" : undefined,
          sort
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load listings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, categoryId, condition, city, debouncedMin, debouncedMax, distressOnly, dealsOnly, sort]);

  const activeFilters = useMemo(
    () =>
      [categoryId, condition, city, minPrice, maxPrice].filter(Boolean).length +
      (searchInput.trim() ? 1 : 0) +
      (distressOnly ? 1 : 0) +
      (dealsOnly ? 1 : 0),
    [categoryId, condition, city, minPrice, maxPrice, searchInput, distressOnly, dealsOnly]
  );

  const clearAll = useCallback(() => {
    setSearchInput("");
    setCategoryId("");
    setCondition("");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setDistressOnly(false);
    setDealsOnly(false);
    setSort("newest");
  }, []);

  return (
    <main className="bg-canvas">
      <section className="relative overflow-hidden border-b border-zinc-200 bg-zinc-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-zinc-900/50" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Lagos · Peer-to-peer</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Buy used. Sell better.</h1>
            <p className="mt-3 max-w-xl text-sm text-white/80">Verified sellers, transparent commission, protected checkout.</p>
          </div>
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, brand, or keyword"
              aria-label="Search listings"
              data-testid="marketplace-search"
              className="h-12 w-full rounded-full border border-white/20 bg-white/10 pl-11 pr-10 text-sm text-white outline-none placeholder:text-white/60 focus:border-white/60"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              </p>
              {activeFilters > 0 && (
                <button onClick={clearAll} className="text-xs font-semibold text-brand hover:underline">Clear all</button>
              )}
            </div>

            <div className="rounded-brand border border-zinc-200 bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Highlights</p>
              <div className="space-y-2.5 text-sm">
                <label className="flex items-center gap-2.5">
                  <input type="checkbox" checked={dealsOnly} onChange={(e) => setDealsOnly(e.target.checked)} className="h-4 w-4 accent-[color:var(--brand)]" data-testid="filter-good-deal" />
                  <span className="text-zinc-700">Best deals only</span>
                </label>
                <label className="flex items-center gap-2.5">
                  <input type="checkbox" checked={distressOnly} onChange={(e) => setDistressOnly(e.target.checked)} className="h-4 w-4 accent-[color:var(--brand)]" data-testid="filter-distress" />
                  <span className="text-zinc-700">Distress sales only</span>
                </label>
              </div>
            </div>

            <FilterGroup title="Category">
              <FilterChip label="All categories" active={categoryId === ""} onClick={() => setCategoryId("")} />
              {categories.map((cat) => (
                <FilterChip key={cat.id} label={cat.name} active={categoryId === cat.id} onClick={() => setCategoryId(cat.id)} />
              ))}
            </FilterGroup>

            <FilterGroup title="Condition">
              <FilterChip label="Any condition" active={condition === ""} onClick={() => setCondition("")} />
              {CONDITIONS.map((c) => (
                <FilterChip key={c} label={formatCondition(c)} active={condition === c} onClick={() => setCondition(c)} />
              ))}
            </FilterGroup>

            <div className="rounded-brand border border-zinc-200 bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Price (₦)</p>
              <div className="flex items-center gap-2">
                <input type="number" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min" data-testid="marketplace-min-price" className="h-10 w-full rounded-full border border-zinc-200 px-3 text-sm outline-none focus:border-brand" />
                <span className="text-zinc-400">–</span>
                <input type="number" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max" data-testid="marketplace-max-price" className="h-10 w-full rounded-full border border-zinc-200 px-3 text-sm outline-none focus:border-brand" />
              </div>
            </div>

            <div className="rounded-brand border border-zinc-200 bg-white p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Location</p>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lekki, Ikeja" className="h-10 w-full rounded-full border border-zinc-200 px-3 text-sm outline-none focus:border-brand" />
            </div>
          </aside>

          <section>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-zinc-500">{data ? `${data.total} listings` : loading ? "Loading…" : "—"}</p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="h-10 rounded-full border border-zinc-200 bg-white px-4 text-sm"
                data-testid="marketplace-sort"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="mb-6 rounded-brand border border-zinc-300 bg-zinc-100 p-4 text-sm text-zinc-700">{error}</div>
            )}

            {loading && !data ? (
              <SkeletonGrid />
            ) : data && data.results.length > 0 ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.results.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
                <Pagination data={data} page={page} setPage={setPage} />
              </>
            ) : (
              <EmptyState onReset={clearAll} hasFilters={activeFilters > 0} />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-brand border border-zinc-200 bg-white p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-full px-3 py-2 text-sm transition ${
        active ? "bg-brand text-brand-foreground" : "text-zinc-700 hover:bg-zinc-100"
      }`}
    >
      <span>{label}</span>
    </button>
  );
}

function Pagination({ data, page, setPage }: { data: Paginated<Listing>; page: number; setPage: (n: number) => void }) {
  return (
    <div className="mt-10 flex items-center justify-between border-t border-zinc-200 pt-6">
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
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-brand border border-zinc-200 bg-white">
          <div className="aspect-square animate-pulse bg-zinc-100" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onReset, hasFilters }: { onReset: () => void; hasFilters: boolean }) {
  return (
    <div className="overflow-hidden rounded-brand border border-dashed border-zinc-300 bg-white">
      <div className="relative h-48 w-full">
        <Image src="https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=720&q=80" alt="" fill sizes="720px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
      </div>
      <div className="p-10 text-center">
        <p className="text-lg font-semibold text-zinc-900">No listings match</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">Try a broader search or different filters.</p>
        {hasFilters && (
          <Button variant="secondary" className="mt-4" onClick={onReset}>Clear filters</Button>
        )}
      </div>
    </div>
  );
}
