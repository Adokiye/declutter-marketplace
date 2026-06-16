import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ListingsModule } from "../listings/listings.module";
import { InstagramController } from "./instagram.controller";
import { InstagramImportService, INSTAGRAM_QUEUE } from "./instagram-import.service";
import { InstagramParserService } from "./instagram-parser.service";
import { InstagramProcessor } from "./instagram.processor";
import { InstagramScheduleService } from "./instagram-schedule.service";
import { InstagramScraperService } from "./instagram-scraper.service";

@Module({
  imports: [BullModule.registerQueue({ name: INSTAGRAM_QUEUE }), ListingsModule],
  controllers: [InstagramController],
  providers: [InstagramImportService, InstagramParserService, InstagramProcessor, InstagramScraperService, InstagramScheduleService],
  exports: [InstagramImportService]
})
export class InstagramModule {}
