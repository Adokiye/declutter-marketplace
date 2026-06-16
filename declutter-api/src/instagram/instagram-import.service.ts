import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import {
  BusinessModel,
  CategoryModel,
  InstagramImportModel,
  ListingImageModel,
  ListingModel
} from "../database/models";
import { DealEvaluatorService } from "../listings/deal-evaluator.service";
import { StorageService } from "../storage/storage.service";
import { InstagramParserService } from "./instagram-parser.service";
import { InstagramScraperService, ScrapedInstagramPost } from "./instagram-scraper.service";

export const INSTAGRAM_QUEUE = "instagram-import";

@Injectable()
export class InstagramImportService {
  private readonly log = new Logger("InstagramImport");

  constructor(
    @InjectQueue(INSTAGRAM_QUEUE) private readonly queue: Queue,
    private readonly scraper: InstagramScraperService,
    private readonly parser: InstagramParserService,
    private readonly storage: StorageService,
    private readonly dealEvaluator: DealEvaluatorService
  ) {}

  async enqueueBusinessSync(businessId: string, limit?: number) {
    await this.queue.add(
      "sync-business",
      { businessId, limit },
      {
        // Embed the limit in the jobId so re-enqueuing with a different count
        // gets a fresh job instead of a no-op against a still-cached jobId.
        jobId: `ig-sync-${businessId}-${limit ?? "default"}-${Date.now()}`,
        removeOnComplete: 100,
        removeOnFail: 100
      }
    );
    return { queued: true, businessId, limit: limit ?? null };
  }

  async syncBusiness(businessId: string, limit?: number) {
    const business = await BusinessModel.query().findById(businessId);
    if (!business) throw new NotFoundException("Business not found");
    if (!business.igImportEnabled || !business.igProfileUrl) {
      return { imported: 0, skipped: 0, reason: "Instagram import disabled or missing URL" };
    }

    const posts = await this.scraper.scrapeRecentPosts(business.igProfileUrl, limit);
    const categoryNames = (await CategoryModel.query().select("name")).map((c) => c.name);
    let imported = 0;
    let skipped = 0;
    let soldFlipped = 0;

    for (const post of posts) {
      const existing = await InstagramImportModel.query().findOne({
        businessId: business.id,
        sourcePostUrl: post.postUrl
      });
      const sold = isMarkedSold(post.caption);

      if (sold) {
        // Flip the matching web listing(s) to sold so they leave the feed. Match
        // first by the imported post URL, then — for reposts that get a NEW URL —
        // by normalised title within this business.
        const now = new Date().toISOString();
        let flipped = 0;
        if (existing?.listingId) {
          flipped += await ListingModel.query()
            .patch({ status: "sold", soldAt: now })
            .where({ id: existing.listingId })
            .whereNot("status", "sold");
        }
        const title = stripSoldMarkers(post.caption);
        flipped += await this.flipSoldByTitle(business.id, title, now);
        if (flipped > 0) soldFlipped += 1;
        // Either way, do not import or re-import a sold post.
        skipped += 1;
        continue;
      }

      // Backstop dedupe: skip posts whose product already exists as an active
      // listing for this business (e.g. a seller item the admin posted to IG),
      // even when we never recorded this exact post URL.
      if (!existing && (await this.hasActiveTitleMatch(business.id, post.caption))) {
        await InstagramImportModel.query().insert({
          businessId: business.id,
          sourceProfileUrl: business.igProfileUrl!,
          sourcePostUrl: post.postUrl,
          caption: post.caption,
          parsedJson: {},
          imageUrls: post.imageUrls,
          status: "skipped",
          errorMessage: "Duplicate of an existing active listing (title match)"
        });
        skipped += 1;
        continue;
      }

      if (existing) {
        skipped += 1;
        continue;
      }

      try {
        await this.importPost(business, post, categoryNames);
        imported += 1;
      } catch (error) {
        if (error instanceof SkippedNonProductError) {
          // Already recorded as a "skipped" import row in importPost.
          skipped += 1;
          continue;
        }
        await InstagramImportModel.query().insert({
          businessId: business.id,
          sourceProfileUrl: business.igProfileUrl!,
          sourcePostUrl: post.postUrl,
          caption: post.caption,
          parsedJson: {},
          imageUrls: post.imageUrls,
          status: "failed",
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { imported, skipped, soldFlipped };
  }

  async importPost(business: BusinessModel, post: ScrapedInstagramPost, categoryNames: string[] = []) {
    const parsed = await this.parser.parseCaption(post.caption, categoryNames);

    // Drop announcements / non-product posts: any post without a stated price
    // OR whose title screams "we're closed today" rather than describing an
    // item. Both signals catch the "Closure Notice" / "Public Holiday" posts
    // without false-positive-ing real listings (the seller always quotes a
    // price for actual products).
    if (!isLikelyProduct(parsed.title, parsed.priceNgn)) {
      await InstagramImportModel.query().insert({
        businessId: business.id,
        sourceProfileUrl: business.igProfileUrl!,
        sourcePostUrl: post.postUrl,
        caption: post.caption,
        parsedJson: parsed,
        imageUrls: post.imageUrls,
        status: "skipped",
        errorMessage: "Non-product announcement (no price or matches block-list)"
      });
      throw new SkippedNonProductError(`non-product: ${parsed.title}`);
    }

    const category = await this.findOrCreateCategory(parsed.category);
    // Scraped IG posts publish live (already public on Instagram). Seller-created
    // listings are the ones that go through draft/moderation.
    const now = new Date().toISOString();

    // IG CDN URLs expire — download each image and persist it to our own storage
    // so the listing keeps working. Fall back to the original URL on failure.
    const persistedImages = await this.persistImages(post.imageUrls);

    const deal = await this.dealEvaluator.evaluate({
      title: parsed.title,
      brand: parsed.brand,
      categoryId: category.id,
      priceNgn: Math.max(parsed.priceNgn, 0)
    });

    const trx = await ListingModel.startTransaction();
    try {
      const listing = await ListingModel.query(trx).insert({
        businessId: business.id,
        sellerUserId: business.ownerUserId,
        categoryId: category.id,
        title: parsed.title,
        description: parsed.description,
        condition: parsed.condition,
        brand: parsed.brand?.trim() || undefined,
        priceNgn: Math.max(parsed.priceNgn, 0).toFixed(2),
        isDistressSale: parsed.distressSale,
        isGoodDeal: deal.isGoodDeal,
        dealScore: deal.dealScore?.toFixed(2),
        referencePriceNgn: deal.referencePriceNgn?.toFixed(2),
        status: "active",
        moderationStatus: "approved",
        locationLabel: parsed.locationLabel || "Lagos",
        city: parsed.city || "Lagos",
        state: "Lagos",
        source: "instagram",
        sourceUrl: post.postUrl,
        approvedAt: now,
        postedAt: post.postedAt ?? now
      });

      if (persistedImages.length) {
        await ListingImageModel.query(trx).insert(
          persistedImages.map((url, index) => ({
            listingId: listing.id,
            url,
            altText: parsed.title,
            sortOrder: index,
            isPrimary: index === 0
          }))
        );
      }

      const importRow = await InstagramImportModel.query(trx).insert({
        businessId: business.id,
        listingId: listing.id,
        sourceProfileUrl: business.igProfileUrl!,
        sourcePostUrl: post.postUrl,
        caption: post.caption,
        parsedJson: parsed,
        imageUrls: post.imageUrls,
        status: "imported",
        importedAt: new Date().toISOString()
      });

      await trx.commit();
      return importRow;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /** Active listings of a business whose normalised title appears within the caption text. */
  private async matchingActiveListings(businessId: string, captionText: string) {
    const haystack = normalizeText(captionText);
    if (haystack.length < 6) return [] as { id: string }[];
    const actives = await ListingModel.query()
      .where({ businessId })
      .where("status", "active")
      .select("id", "title");
    return actives.filter((l) => {
      const t = normalizeText(l.title);
      return t.length >= 6 && haystack.includes(t);
    });
  }

  private async hasActiveTitleMatch(businessId: string, captionText: string): Promise<boolean> {
    return (await this.matchingActiveListings(businessId, captionText)).length > 0;
  }

  private async flipSoldByTitle(businessId: string, captionText: string, now: string): Promise<number> {
    const matches = await this.matchingActiveListings(businessId, captionText);
    if (!matches.length) return 0;
    return ListingModel.query()
      .patch({ status: "sold", soldAt: now })
      .whereIn("id", matches.map((m) => m.id))
      .whereNot("status", "sold");
  }

  /** Download IG images and re-host them via StorageService; keep the original URL if a download fails. */
  private async persistImages(urls: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const url of urls) {
      try {
        out.push(await this.storage.uploadFromUrl(url));
      } catch (err) {
        this.log.warn(`image persist failed, keeping source url: ${err instanceof Error ? err.message : err}`);
        out.push(url);
      }
    }
    return out;
  }

  private async findOrCreateCategory(name: string) {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "general";
    return CategoryModel.query()
      .insert({ name, slug, sortOrder: 0 })
      .onConflict("slug")
      .merge({ updatedAt: new Date().toISOString() })
      .returning("*");
  }
}

class SkippedNonProductError extends Error {}

/**
 * A post is treated as a real product listing only if both:
 *  - a non-zero price was extracted, AND
 *  - the title doesn't read like a shop announcement.
 * The Declutter seller always quotes a price for actual items, so the
 * zero-price heuristic alone catches the closure / holiday / reminder posts.
 */
function isLikelyProduct(title: string, priceNgn: number): boolean {
  if (!Number.isFinite(priceNgn) || priceNgn <= 0) return false;
  const lower = (title || "").toLowerCase();
  const announcement = [
    "closure", "closed", "closed for", "back tomorrow", "back on", "open tomorrow",
    "public holiday", "holiday notice", "announcement", "reminder", "notice"
  ];
  return !announcement.some((needle) => lower.includes(needle));
}

/**
 * Detect captions where the seller has marked the item sold. We look for:
 *  - "sold" / "[sold]" at the start of the caption,
 *  - all-caps "SOLD" as a standalone word anywhere,
 *  - emoji + "sold" combos (🚫 SOLD, 🛑 SOLD, ✅ SOLD).
 * Avoids matching prose like "we sold our last one".
 */
function isMarkedSold(caption: string): boolean {
  const text = caption || "";
  if (/^\s*[\[(]?\s*sold\b/i.test(text)) return true;
  if (/\bSOLD\b/.test(text)) return true;
  if (/[🚫🛑✅❌]\s*sold/iu.test(text)) return true;
  return false;
}

/** Remove "SOLD" markers so the remaining caption can be title-matched to a listing. */
function stripSoldMarkers(caption: string): string {
  return (caption || "").replace(/[🚫🛑✅❌]/gu, " ").replace(/\bsold\b/gi, " ");
}

/** Lowercase alphanumeric form for fuzzy title↔caption matching. */
function normalizeText(value: string): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
