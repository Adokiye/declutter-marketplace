import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { BusinessesService } from "./businesses.service";
import { CreateBusinessDto, UpdateBusinessSettingsDto } from "./dto";

@Controller("businesses")
export class BusinessesController {
  constructor(private readonly businesses: BusinessesService) {}

  @Post()
  create(@Body() dto: CreateBusinessDto) {
    return this.businesses.create(dto);
  }

  @Get()
  list(@Query() query: { page?: number; limit?: number }) {
    return this.businesses.list(query);
  }

  @Get("slug/:slug")
  bySlug(@Param("slug") slug: string) {
    return this.businesses.getBySlug(slug);
  }

  @Patch(":id/settings")
  updateSettings(@Param("id") id: string, @Body() dto: UpdateBusinessSettingsDto) {
    return this.businesses.updateSettings(id, dto);
  }
}
