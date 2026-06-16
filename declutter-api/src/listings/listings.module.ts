import { Module } from "@nestjs/common";
import { DealEvaluatorService } from "./deal-evaluator.service";
import { ListingsController } from "./listings.controller";
import { ListingsService } from "./listings.service";

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, DealEvaluatorService],
  exports: [ListingsService, DealEvaluatorService]
})
export class ListingsModule {}
