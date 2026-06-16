import { IsEmail, IsUUID } from "class-validator";

export class CreateOrderDto {
  @IsUUID()
  listingId!: string;

  @IsUUID()
  buyerUserId!: string;

  @IsEmail()
  buyerEmail!: string;
}
