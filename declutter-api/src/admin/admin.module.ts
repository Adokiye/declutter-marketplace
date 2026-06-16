import { Module } from "@nestjs/common";
import { ListingsModule } from "../listings/listings.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [ListingsModule],
  controllers: [AdminController]
})
export class AdminModule {}
