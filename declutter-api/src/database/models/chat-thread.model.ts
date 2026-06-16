import { Model } from "objection";
import { BaseModel } from "./base.model";
import { ChatMessageModel } from "./chat-message.model";
import { OrderModel } from "./order.model";
import { UserModel } from "./user.model";

export class ChatThreadModel extends BaseModel {
  static tableName = "chat_threads";

  orderId!: string;
  type!: "declutter_buyer" | "declutter_seller" | "buyer_seller";
  buyerUserId?: string;
  sellerUserId?: string;
  lastMessageId?: string;
  lastMessageAt?: string;

  static relationMappings = () => ({
    order: {
      relation: Model.BelongsToOneRelation,
      modelClass: OrderModel,
      join: { from: "chat_threads.order_id", to: "orders.id" }
    },
    buyer: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "chat_threads.buyer_user_id", to: "users.id" }
    },
    seller: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "chat_threads.seller_user_id", to: "users.id" }
    },
    messages: {
      relation: Model.HasManyRelation,
      modelClass: ChatMessageModel,
      join: { from: "chat_threads.id", to: "chat_messages.thread_id" }
    }
  });
}
