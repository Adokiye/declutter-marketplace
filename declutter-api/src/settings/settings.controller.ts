import { Body, Controller, Get, Put } from "@nestjs/common";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  all() {
    return this.settings.all();
  }

  @Put("platform-fee")
  setFee(@Body() body: { percent: number }) {
    return this.settings.upsert("platform_fee_percent", { percent: body.percent });
  }

  @Put("default-payment-mode")
  setPaymentMode(@Body() body: { mode: "escrow" | "fee_only_offline" }) {
    return this.settings.upsert("default_payment_mode", { mode: body.mode });
  }
}
