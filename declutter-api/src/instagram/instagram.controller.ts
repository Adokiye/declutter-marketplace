import { Controller, Param, Post, Query } from "@nestjs/common";
import { InstagramImportService } from "./instagram-import.service";

@Controller("instagram")
export class InstagramController {
  constructor(private readonly imports: InstagramImportService) {}

  @Post("businesses/:businessId/sync")
  sync(
    @Param("businessId") businessId: string,
    @Query("limit") limit?: string
  ) {
    const parsed = limit ? Number(limit) : undefined;
    const safeLimit =
      parsed && Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : undefined;
    return this.imports.enqueueBusinessSync(businessId, safeLimit);
  }
}
