import { Injectable } from "@nestjs/common";
import { PlatformSettingModel } from "../database/models";

@Injectable()
export class SettingsService {
  async getPlatformFeePercent() {
    const setting = await PlatformSettingModel.query().findOne({ key: "platform_fee_percent" });
    const percent = Number(setting?.value?.percent ?? 5);
    return Number.isFinite(percent) ? percent : 5;
  }

  async getDefaultPaymentMode(): Promise<"escrow" | "fee_only_offline"> {
    const setting = await PlatformSettingModel.query().findOne({ key: "default_payment_mode" });
    // Commission-only ("fee_only_offline") is the platform default; escrow is opt-in.
    return setting?.value?.mode === "escrow" ? "escrow" : "fee_only_offline";
  }

  async upsert(key: string, value: Record<string, unknown>) {
    return PlatformSettingModel.query()
      .insert({ key, value })
      .onConflict("key")
      .merge({ value, updatedAt: new Date().toISOString() })
      .returning("*");
  }

  async all() {
    return PlatformSettingModel.query().orderBy("key", "asc");
  }
}
