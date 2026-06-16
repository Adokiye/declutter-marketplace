import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { BusinessModel } from "../database/models";
import { InstagramImportService } from "./instagram-import.service";

// Periodic IG sync. The schedule itself is fixed at load time, but each tick is a
// no-op unless IG_SYNC_ENABLED=true, so it's safe to ship off-by-default.
@Injectable()
export class InstagramScheduleService {
  private readonly log = new Logger("InstagramSchedule");

  constructor(
    private readonly config: ConfigService,
    private readonly imports: InstagramImportService
  ) {}

  @Cron(process.env.IG_SYNC_CRON || "*/30 * * * *")
  async run() {
    if ((this.config.get<string>("IG_SYNC_ENABLED") ?? "").toLowerCase() !== "true") return;
    const businesses = await BusinessModel.query().where({ igImportEnabled: true }).whereNotNull("igProfileUrl");
    if (!businesses.length) return;
    this.log.log(`scheduled sync: enqueuing ${businesses.length} business(es)`);
    for (const b of businesses) {
      await this.imports.enqueueBusinessSync(b.id).catch((e) =>
        this.log.warn(`enqueue failed for ${b.id}: ${e instanceof Error ? e.message : e}`)
      );
    }
  }
}
