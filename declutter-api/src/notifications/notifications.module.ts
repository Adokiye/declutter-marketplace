import { Module } from "@nestjs/common";
import { EmailChannel } from "./email.channel";
import { NotificationService } from "./notification.service";
import { WhatsAppChannel } from "./whatsapp.channel";

@Module({
  providers: [NotificationService, WhatsAppChannel, EmailChannel],
  exports: [NotificationService]
})
export class NotificationsModule {}
