import { Model } from "objection";
import { BaseModel } from "./base.model";
import { BusinessModel } from "./business.model";
import { ChatThreadModel } from "./chat-thread.model";
import { EscrowModel } from "./escrow.model";
import { ListingModel } from "./listing.model";
import { TransactionModel } from "./transaction.model";
import { UserModel } from "./user.model";

export class OrderModel extends BaseModel {
  static tableName = "orders";

  businessId?: string;
  listingId!: string;
  buyerUserId!: string;
  sellerUserId!: string;
  paymentMode!: "escrow" | "fee_only_offline";
  status!: "pending_payment" | "fee_paid" | "escrow_paid" | "connected" | "completed" | "cancelled" | "disputed";
  itemPriceNgn!: string;
  platformFeePercent!: string;
  platformFeeNgn!: string;
  amountDueNgn!: string;
  paymentProvider!: "bani";
  providerReference?: string;
  providerStatus?: string;
  providerPayload!: Record<string, unknown>;
  paidAt?: string;
  sellerContactRevealedAt?: string;
  inspectionDeadlineAt?: string;
  completedAt?: string;

  static relationMappings = () => ({
    business: {
      relation: Model.BelongsToOneRelation,
      modelClass: BusinessModel,
      join: { from: "orders.businessId", to: "businesses.id" }
    },
    listing: {
      relation: Model.BelongsToOneRelation,
      modelClass: ListingModel,
      join: { from: "orders.listingId", to: "listings.id" }
    },
    buyer: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "orders.buyerUserId", to: "users.id" }
    },
    seller: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "orders.sellerUserId", to: "users.id" }
    },
    transactions: {
      relation: Model.HasManyRelation,
      modelClass: TransactionModel,
      join: { from: "orders.id", to: "transactions.orderId" }
    },
    escrow: {
      relation: Model.HasOneRelation,
      modelClass: EscrowModel,
      join: { from: "orders.id", to: "escrows.orderId" }
    },
    chatThreads: {
      relation: Model.HasManyRelation,
      modelClass: ChatThreadModel,
      join: { from: "orders.id", to: "chat_threads.order_id" }
    }
  });
}
