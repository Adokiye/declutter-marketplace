import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateListingDto {
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @IsUUID()
  sellerUserId!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsString()
  condition!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true" || value === 1 || value === "1")
  @IsBoolean()
  isDistressSale?: boolean;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  priceNgn!: number;

  @IsString()
  locationLabel!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  @IsArray()
  imageUrls!: string[];
}

export type ListingSearchQuery = {
  page?: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  businessId?: string;
  sellerUserId?: string;
  condition?: string;
  brand?: string;
  city?: string;
  isDistressSale?: string | boolean;
  isGoodDeal?: string | boolean;
  minPrice?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  status?: string;
  moderationStatus?: string;
  sort?: "newest" | "price_asc" | "price_desc";
};
