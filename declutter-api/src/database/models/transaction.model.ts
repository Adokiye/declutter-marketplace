import { Model } from "objection";
import { BaseModel } from "./base.model";
import { ListingModel } from "./listing.model";
import { OrderModel } from "./order.model";
import { UserModel } from "./user.model";

export class TransactionModel extends BaseModel {
  static tableName = "transactions";

  orderId!: string;
  listingId!: string;
  buyerUserId!: string;
  sellerUserId!: string;
  type!: "checkout" | "platform_fee" | "escrow_hold" | "escrow_release" | "payout";
  status!: "pending" | "success" | "failed";
  amountNgn!: string;
  paymentProvider!: "bani";
  providerReference?: string;
  providerPayload!: Record<string, unknown>;

  static relationMappings = () => ({
    order: {
      relation: Model.BelongsToOneRelation,
      modelClass: OrderModel,
      join: { from: "transactions.orderId", to: "orders.id" }
    },
    listing: {
      relation: Model.BelongsToOneRelation,
      modelClass: ListingModel,
      join: { from: "transactions.listingId", to: "listings.id" }
    },
    buyer: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "transactions.buyerUserId", to: "users.id" }
    },
    seller: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "transactions.sellerUserId", to: "users.id" }
    }
  });
}
