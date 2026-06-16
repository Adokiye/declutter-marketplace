import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { SendMessageDto } from "./dto";

@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get("orders/:orderId/threads")
  threads(@Param("orderId") orderId: string) {
    return this.chat.listThreads(orderId);
  }

  @Get("threads/:threadId/messages")
  messages(@Param("threadId") threadId: string, @Query() query: { page?: number; limit?: number }) {
    return this.chat.getMessages(threadId, query);
  }

  @Post("threads/:threadId/messages")
  send(@Param("threadId") threadId: string, @Body() dto: SendMessageDto) {
    return this.chat.sendMessage(threadId, dto);
  }

  @Patch("threads/:threadId/read")
  read(@Param("threadId") threadId: string, @Body() body: { userId: string }) {
    return this.chat.markRead(threadId, body.userId);
  }
}
