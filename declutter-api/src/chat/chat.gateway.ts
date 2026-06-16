import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "./chat.service";

@WebSocketGateway({
  namespace: "orders",
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true
  }
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chat: ChatService) {}

  handleConnection(client: Socket) {
    client.emit("connected", { socketId: client.id });
  }

  @SubscribeMessage("thread:join")
  async joinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId: string; userId: string; role: string }
  ) {
    await this.chat.assertThreadAccess(body.threadId, body.userId, body.role);
    await client.join(this.room(body.threadId));
    return { ok: true };
  }

  @SubscribeMessage("message:send")
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId: string; senderUserId: string; senderRole: "buyer" | "seller" | "admin" | "support"; body: string }
  ) {
    const message = await this.chat.sendMessage(body.threadId, {
      senderUserId: body.senderUserId,
      senderRole: body.senderRole,
      body: body.body
    });
    this.server.to(this.room(body.threadId)).emit("message:new", message);
    return message;
  }

  @SubscribeMessage("message:read")
  async markRead(@MessageBody() body: { threadId: string; userId: string }) {
    return this.chat.markRead(body.threadId, body.userId);
  }

  private room(threadId: string) {
    return `thread:${threadId}`;
  }
}
