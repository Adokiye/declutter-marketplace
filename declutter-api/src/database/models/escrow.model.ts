import { Model } from "objection";
import { BaseModel } from "./base.model";
import { ListingModel } from "./listing.model";
import { OrderModel } from "./order.model";
import { UserModel } from "./user.model";

export class EscrowModel extends BaseModel {
  static tableName = "escrows";

  orderId!: string;
  listingId!: string;
  buyerUserId!: string;
  sellerUserId!: string;
  status!: "pending" | "held" | "released" | "disputed";
  heldAmountNgn!: string;
  platformFeeNgn!: string;
  releaseAfterAt?: string;
  releasedAt?: string;

  static relationMappings = () => ({
    order: {
      relation: Model.BelongsToOneRelation,
      modelClass: OrderModel,
      join: { from: "escrows.orderId", to: "orders.id" }
    },
    listing: {
      relation: Model.BelongsToOneRelation,
      modelClass: ListingModel,
      join: { from: "escrows.listingId", to: "listings.id" }
    },
    buyer: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "escrows.buyerUserId", to: "users.id" }
    },
    seller: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "escrows.sellerUserId", to: "users.id" }
    }
  });
}
