import { Injectable } from "@nestjs/common";
import { normalizePagination, toPaginated } from "../common/pagination";
import { InstagramImportModel, ListingImageModel, ListingModel } from "../database/models";
import { DealEvaluatorService } from "./deal-evaluator.service";
import { CreateListingDto, ListingSearchQuery } from "./dto";

@Injectable()
export class ListingsService {
  constructor(private readonly dealEvaluator: DealEvaluatorService) {}

  async create(dto: CreateListingDto) {
    const deal = await this.dealEvaluator.evaluate({
      title: dto.title,
      brand: dto.brand,
      categoryId: dto.categoryId,
      priceNgn: dto.priceNgn
    });

    const trx = await ListingModel.startTransaction();
    try {
      const listing = await ListingModel.query(trx).insert({
        businessId: dto.businessId,
        sellerUserId: dto.sellerUserId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        condition: dto.condition,
        brand: dto.brand?.trim() || undefined,
        priceNgn: dto.priceNgn.toFixed(2),
        isDistressSale: Boolean(dto.isDistressSale),
        isGoodDeal: deal.isGoodDeal,
        dealScore: deal.dealScore?.toFixed(2),
        referencePriceNgn: deal.referencePriceNgn?.toFixed(2),
        status: "draft",
        moderationStatus: "pending",
        locationLabel: dto.locationLabel,
        city: dto.city ?? "Lagos",
        state: dto.state ?? "Lagos",
        latitude: dto.latitude?.toString(),
        longitude: dto.longitude?.toString(),
        source: "manual"
      });

      await ListingImageModel.query(trx).insert(
        dto.imageUrls.map((url, index) => ({
          listingId: listing.id,
          url,
          altText: dto.title,
          sortOrder: index,
          isPrimary: index === 0
        }))
      );

      await trx.commit();
      return ListingModel.query().findById(listing.id).withGraphFetched("[images, category, business, seller]");
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async search(query: ListingSearchQuery) {
    const { page, limit } = normalizePagination(query);
    const builder = ListingModel.query()
      .withGraphFetched("[images, category, business]")
      .where("status", query.status ?? "active")
      .where("moderationStatus", query.moderationStatus ?? "approved");

    if (query.q) {
      builder.where((scope) => {
        scope.whereILike("title", `%${query.q}%`).orWhereILike("description", `%${query.q}%`);
      });
    }
    if (query.categoryId) builder.where("categoryId", query.categoryId);
    if (query.businessId) builder.where("businessId", query.businessId);
    if (query.sellerUserId) builder.where("sellerUserId", query.sellerUserId);
    if (query.condition) builder.whereIn("condition", String(query.condition).split(",").map((c) => c.trim()).filter(Boolean));
    if (query.brand) builder.whereRaw("lower(brand) = ?", [String(query.brand).toLowerCase()]);
    if (query.city) builder.whereILike("city", `%${query.city}%`);
    if (isTrue(query.isDistressSale)) builder.where("isDistressSale", true);
    if (isTrue(query.isGoodDeal)) builder.where("isGoodDeal", true);
    if (query.minPrice) builder.where("priceNgn", ">=", query.minPrice);
    if (query.maxPrice) builder.where("priceNgn", "<=", query.maxPrice);

    if (query.lat && query.lng && query.radiusKm) {
      builder.whereRaw(
        `6371 * acos(
          cos(radians(?)) * cos(radians(latitude::float)) *
          cos(radians(longitude::float) - radians(?)) +
          sin(radians(?)) * sin(radians(latitude::float))
        ) <= ?`,
        [query.lat, query.lng, query.lat, query.radiusKm]
      );
    }

    if (query.sort === "price_asc") builder.orderBy("priceNgn", "asc");
    else if (query.sort === "price_desc") builder.orderBy("priceNgn", "desc");
    else builder.orderBy("createdAt", "desc");

    const results = await builder.page(page - 1, limit);
    return toPaginated(results, page, limit);
  }

  get(id: string) {
    return ListingModel.query().findById(id).withGraphFetched("[images, category, business, seller]").throwIfNotFound();
  }

  async approve(id: string, adminUserId: string, igPostUrl?: string) {
    const now = new Date().toISOString();
    const existing = await ListingModel.query().findById(id);
    const normalizedIg = igPostUrl ? normalizePostUrl(igPostUrl) : undefined;

    const updated = await ListingModel.query().patchAndFetchById(id, {
      status: "active",
      moderationStatus: "approved",
      approvedByUserId: adminUserId,
      approvedAt: now,
      // posted_at marks the original post date; set it when the listing first goes live.
      postedAt: existing?.postedAt ?? now,
      ...(normalizedIg ? { sourceUrl: normalizedIg } : {})
    });

    // When the admin records the Instagram post URL (they've cross-posted this
    // seller listing to IG), register a dedupe row so the scraper won't re-add it.
    if (normalizedIg && existing?.businessId) {
      await InstagramImportModel.query()
        .insert({
          businessId: existing.businessId,
          listingId: id,
          sourceProfileUrl: normalizedIg,
          sourcePostUrl: normalizedIg,
          caption: existing.title,
          parsedJson: {},
          imageUrls: [],
          status: "imported",
          importedAt: now
        })
        .onConflict()
        .ignore()
        .catch(() => undefined);
    }
    return updated;
  }

  reject(id: string) {
    return ListingModel.query().patchAndFetchById(id, {
      moderationStatus: "rejected"
    });
  }

  async sellerStats(sellerUserId: string) {
    const rows = await ListingModel.query()
      .select("status")
      .count("id as total")
      .where({ sellerUserId })
      .groupBy("status");
    return rows.reduce<Record<string, number>>((acc, row: any) => {
      acc[row.status] = Number(row.total);
      return acc;
    }, {});
  }
}

function isTrue(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

// Match the scraper's URL normalisation so a recorded IG post URL dedupes against scrapes.
function normalizePostUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}
