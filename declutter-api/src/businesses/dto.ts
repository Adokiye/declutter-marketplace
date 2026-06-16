import { IsBoolean, IsIn, IsOptional, IsString, IsUrl } from "class-validator";

export class CreateBusinessDto {
  @IsString()
  ownerUserId!: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsIn(["belo-fur", "lefore", "emox"])
  storefrontTheme?: "belo-fur" | "lefore" | "emox";
}

export class UpdateBusinessSettingsDto {
  @IsOptional()
  @IsIn(["belo-fur", "lefore", "emox"])
  storefrontTheme?: "belo-fur" | "lefore" | "emox";

  @IsOptional()
  @IsIn(["escrow", "fee_only_offline"])
  paymentMode?: "escrow" | "fee_only_offline";

  @IsOptional()
  platformFeePercent?: number;

  @IsOptional()
  @IsUrl()
  igProfileUrl?: string;

  @IsOptional()
  @IsBoolean()
  igImportEnabled?: boolean;

  @IsOptional()
  @IsIn(["draft", "live"])
  igImportMode?: "draft" | "live";
}
