import { Model } from "objection";
import { BaseModel } from "./base.model";
import { BusinessMemberModel } from "./business-member.model";
import { InstagramImportModel } from "./instagram-import.model";
import { ListingModel } from "./listing.model";
import { OrderModel } from "./order.model";
import { UserModel } from "./user.model";

export class BusinessModel extends BaseModel {
  static tableName = "businesses";

  ownerUserId!: string;
  name!: string;
  slug!: string;
  storefrontTheme!: "belo-fur" | "lefore" | "emox";
  paymentMode!: "escrow" | "fee_only_offline";
  platformFeePercent?: string;
  igProfileUrl?: string;
  igImportEnabled!: boolean;
  igImportMode!: "draft" | "live";
  brandSettings!: Record<string, unknown>;
  isActive!: boolean;

  static relationMappings = () => ({
    owner: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "businesses.ownerUserId", to: "users.id" }
    },
    members: {
      relation: Model.HasManyRelation,
      modelClass: BusinessMemberModel,
      join: { from: "businesses.id", to: "business_members.business_id" }
    },
    listings: {
      relation: Model.HasManyRelation,
      modelClass: ListingModel,
      join: { from: "businesses.id", to: "listings.businessId" }
    },
    orders: {
      relation: Model.HasManyRelation,
      modelClass: OrderModel,
      join: { from: "businesses.id", to: "orders.businessId" }
    },
    instagramImports: {
      relation: Model.HasManyRelation,
      modelClass: InstagramImportModel,
      join: { from: "businesses.id", to: "instagram_imports.business_id" }
    }
  });
}
