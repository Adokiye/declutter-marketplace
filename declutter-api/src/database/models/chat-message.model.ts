import { Model } from "objection";
import { BaseModel } from "./base.model";
import { ChatThreadModel } from "./chat-thread.model";
import { UserModel } from "./user.model";

export class ChatMessageModel extends BaseModel {
  static tableName = "chat_messages";

  threadId!: string;
  senderUserId!: string;
  senderRole!: "buyer" | "seller" | "admin" | "support";
  body!: string;
  readAt?: string;

  static relationMappings = () => ({
    thread: {
      relation: Model.BelongsToOneRelation,
      modelClass: ChatThreadModel,
      join: { from: "chat_messages.thread_id", to: "chat_threads.id" }
    },
    sender: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "chat_messages.sender_user_id", to: "users.id" }
    }
  });
}
