import { Model } from "objection";
import { BaseModel } from "./base.model";
import { BusinessMemberModel } from "./business-member.model";
import { BusinessModel } from "./business.model";
import { ChatMessageModel } from "./chat-message.model";
import { ListingModel } from "./listing.model";
import { OrderModel } from "./order.model";
import { PayoutModel } from "./payout.model";

export class UserModel extends BaseModel {
  static tableName = "users";

  phone!: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role!: "buyer" | "seller" | "admin" | "support";
  isPhoneVerified!: boolean;
  isBanned!: boolean;
  lastLoginAt?: string;

  static relationMappings = () => ({
    ownedBusinesses: {
      relation: Model.HasManyRelation,
      modelClass: BusinessModel,
      join: { from: "users.id", to: "businesses.ownerUserId" }
    },
    businessMemberships: {
      relation: Model.HasManyRelation,
      modelClass: BusinessMemberModel,
      join: { from: "users.id", to: "business_members.user_id" }
    },
    listings: {
      relation: Model.HasManyRelation,
      modelClass: ListingModel,
      join: { from: "users.id", to: "listings.sellerUserId" }
    },
    buyerOrders: {
      relation: Model.HasManyRelation,
      modelClass: OrderModel,
      join: { from: "users.id", to: "orders.buyerUserId" }
    },
    sellerOrders: {
      relation: Model.HasManyRelation,
      modelClass: OrderModel,
      join: { from: "users.id", to: "orders.sellerUserId" }
    },
    payouts: {
      relation: Model.HasManyRelation,
      modelClass: PayoutModel,
      join: { from: "users.id", to: "payouts.sellerUserId" }
    },
    chatMessages: {
      relation: Model.HasManyRelation,
      modelClass: ChatMessageModel,
      join: { from: "users.id", to: "chat_messages.sender_user_id" }
    }
  });
}
