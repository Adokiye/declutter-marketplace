import { Model } from "objection";
import { BaseModel } from "./base.model";
import { BusinessModel } from "./business.model";
import { ListingModel } from "./listing.model";

export class InstagramImportModel extends BaseModel {
  static tableName = "instagram_imports";
  static jsonAttributes = ["parsedJson", "imageUrls"];

  businessId!: string;
  listingId?: string;
  sourceProfileUrl!: string;
  sourcePostUrl!: string;
  caption?: string;
  parsedJson!: Record<string, unknown>;
  imageUrls!: string[];
  status!: "pending" | "imported" | "skipped" | "failed";
  errorMessage?: string;
  importedAt?: string;

  static relationMappings = () => ({
    business: {
      relation: Model.BelongsToOneRelation,
      modelClass: BusinessModel,
      join: { from: "instagram_imports.business_id", to: "businesses.id" }
    },
    listing: {
      relation: Model.BelongsToOneRelation,
      modelClass: ListingModel,
      join: { from: "instagram_imports.listing_id", to: "listings.id" }
    }
  });
}
