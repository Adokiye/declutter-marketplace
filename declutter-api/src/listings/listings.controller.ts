import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CreateListingDto, ListingSearchQuery } from "./dto";
import { ListingsService } from "./listings.service";

@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Post()
  create(@Body() dto: CreateListingDto) {
    return this.listings.create(dto);
  }

  @Get()
  search(@Query() query: ListingSearchQuery) {
    return this.listings.search(query);
  }

  @Get("seller/:sellerUserId/stats")
  sellerStats(@Param("sellerUserId") sellerUserId: string) {
    return this.listings.sellerStats(sellerUserId);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.listings.get(id);
  }

  @Patch(":id/approve")
  approve(@Param("id") id: string, @Body() body: { adminUserId: string; igPostUrl?: string }) {
    return this.listings.approve(id, body.adminUserId, body.igPostUrl);
  }

  @Patch(":id/reject")
  reject(@Param("id") id: string) {
    return this.listings.reject(id);
  }
}
