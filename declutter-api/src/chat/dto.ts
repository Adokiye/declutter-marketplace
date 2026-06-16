import { IsString, IsUUID } from "class-validator";

export class SendMessageDto {
  @IsUUID()
  senderUserId!: string;

  @IsString()
  senderRole!: "buyer" | "seller" | "admin" | "support";

  @IsString()
  body!: string;
}
