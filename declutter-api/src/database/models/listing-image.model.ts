import { Model } from "objection";
import { BaseModel } from "./base.model";
import { ListingModel } from "./listing.model";

export class ListingImageModel extends BaseModel {
  static tableName = "listing_images";

  listingId!: string;
  url!: string;
  altText?: string;
  sortOrder!: number;
  isPrimary!: boolean;

  static relationMappings = () => ({
    listing: {
      relation: Model.BelongsToOneRelation,
      modelClass: ListingModel,
      join: { from: "listing_images.listing_id", to: "listings.id" }
    }
  });
}
