import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Flame, MapPin, Tag } from "lucide-react";
import { displayDate, formatCondition, formatNaira } from "@/lib/utils";
import type { Listing } from "@/lib/types";

export function ListingCard({ listing }: { listing: Listing }) {
  const image = listing.images?.[0]?.url ?? "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85";
  const condition = formatCondition(listing.condition);
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block overflow-hidden rounded-brand border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
      data-testid={`listing-card-${listing.id}`}
    >
      <div className="relative aspect-square bg-zinc-100">
        <Image src={image} alt={listing.title} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="(max-width: 768px) 50vw, 25vw" />
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {listing.isGoodDeal && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              <Tag className="h-2.5 w-2.5" /> Good deal
            </span>
          )}
          {listing.isDistressSale && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              <Flame className="h-2.5 w-2.5" /> Distress
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="line-clamp-1 text-sm font-semibold text-zinc-950">{listing.title}</h3>
        <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {listing.locationLabel}</span>
          {condition && <span className="text-zinc-300">·</span>}
          {condition && <span className="text-zinc-500">{condition}</span>}
        </p>
        <p className="pt-1 text-base font-bold text-zinc-950">{formatNaira(listing.priceNgn)}</p>
        <p className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
          <CalendarDays className="h-3 w-3" /> {displayDate(listing)}
        </p>
      </div>
    </Link>
  );
}
