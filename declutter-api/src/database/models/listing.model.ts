import { Model } from "objection";
import { BaseModel } from "./base.model";
import { BusinessModel } from "./business.model";
import { CategoryModel } from "./category.model";
import { ListingImageModel } from "./listing-image.model";
import { OrderModel } from "./order.model";
import { UserModel } from "./user.model";

export class ListingModel extends BaseModel {
  static tableName = "listings";

  businessId?: string;
  sellerUserId!: string;
  categoryId?: string;
  title!: string;
  description!: string;
  condition!: string;
  brand?: string;
  priceNgn!: string;
  isDistressSale!: boolean;
  isGoodDeal!: boolean;
  dealScore?: string;
  referencePriceNgn?: string;
  status!: "draft" | "active" | "sold" | "archived";
  moderationStatus!: "pending" | "approved" | "rejected";
  locationLabel!: string;
  city!: string;
  state!: string;
  latitude?: string;
  longitude?: string;
  source!: "manual" | "instagram";
  sourceUrl?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  postedAt?: string;
  soldAt?: string;

  static relationMappings = () => ({
    business: {
      relation: Model.BelongsToOneRelation,
      modelClass: BusinessModel,
      join: { from: "listings.businessId", to: "businesses.id" }
    },
    seller: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "listings.sellerUserId", to: "users.id" }
    },
    category: {
      relation: Model.BelongsToOneRelation,
      modelClass: CategoryModel,
      join: { from: "listings.categoryId", to: "categories.id" }
    },
    images: {
      relation: Model.HasManyRelation,
      modelClass: ListingImageModel,
      join: { from: "listings.id", to: "listing_images.listing_id" }
    },
    orders: {
      relation: Model.HasManyRelation,
      modelClass: OrderModel,
      join: { from: "listings.id", to: "orders.listingId" }
    }
  });
}
