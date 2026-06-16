import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { normalizePagination, toPaginated } from "../common/pagination";
import { ChatMessageModel, ChatThreadModel, OrderModel } from "../database/models";
import { SendMessageDto } from "./dto";

const THREAD_TYPES = ["declutter_buyer", "declutter_seller", "buyer_seller"] as const;

@Injectable()
export class ChatService {
  async listThreads(orderId: string) {
    await this.ensureThreads(orderId);
    return ChatThreadModel.query().where({ orderId }).withGraphFetched("[buyer, seller, messages(orderByRecent)]").modifiers({
      orderByRecent(builder) {
        builder.orderBy("createdAt", "desc").limit(1);
      }
    });
  }

  // Creates any of the canonical threads that an order is missing. Keeps older orders
  // (created before buyer_seller existed) and any future thread types in sync.
  async ensureThreads(orderId: string) {
    const order = await OrderModel.query().findById(orderId);
    if (!order) throw new NotFoundException("Order not found");
    const existing = await ChatThreadModel.query().where({ orderId }).select("type");
    const present = new Set(existing.map((t) => t.type));
    const missing = THREAD_TYPES.filter((type) => !present.has(type));
    if (missing.length) {
      await ChatThreadModel.query().insert(
        missing.map((type) => ({
          orderId,
          type,
          buyerUserId: order.buyerUserId,
          sellerUserId: order.sellerUserId
        }))
      );
    }
  }

  async getMessages(threadId: string, query: { page?: number; limit?: number }) {
    const { page, limit } = normalizePagination(query);
    const result = await ChatMessageModel.query()
      .where({ threadId })
      .orderBy("createdAt", "asc")
      .page(page - 1, limit);
    return toPaginated(result, page, limit);
  }

  async sendMessage(threadId: string, dto: SendMessageDto) {
    const thread = await ChatThreadModel.query().findById(threadId);
    if (!thread) throw new NotFoundException("Chat thread not found");
    this.assertCanUseThread(thread, dto.senderUserId, dto.senderRole);

    const message = await ChatMessageModel.query().insert({
      threadId,
      senderUserId: dto.senderUserId,
      senderRole: dto.senderRole,
      body: dto.body
    });

    await ChatThreadModel.query().patch({
      lastMessageId: message.id,
      lastMessageAt: message.createdAt ?? new Date().toISOString()
    }).where({ id: threadId });

    return message;
  }

  async markRead(threadId: string, userId: string) {
    await ChatMessageModel.query()
      .patch({ readAt: new Date().toISOString() })
      .where({ threadId })
      .whereNot({ senderUserId: userId })
      .whereNull("readAt");
    return { ok: true };
  }

  async assertThreadAccess(threadId: string, userId: string, role: string) {
    const thread = await ChatThreadModel.query().findById(threadId);
    if (!thread) throw new NotFoundException("Chat thread not found");
    this.assertCanUseThread(thread, userId, role);
    return thread;
  }

  private assertCanUseThread(thread: ChatThreadModel, userId: string, role: string) {
    if (role === "admin" || role === "support") return;
    if (thread.type === "declutter_buyer" && thread.buyerUserId === userId) return;
    if (thread.type === "declutter_seller" && thread.sellerUserId === userId) return;
    if (thread.type === "buyer_seller" && (thread.buyerUserId === userId || thread.sellerUserId === userId)) return;
    throw new ForbiddenException("This chat is private to Declutter and the order participant");
  }
}
