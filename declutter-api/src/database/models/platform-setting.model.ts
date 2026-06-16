import { BaseModel } from "./base.model";

export class PlatformSettingModel extends BaseModel {
  static tableName = "platform_settings";

  key!: string;
  value!: Record<string, unknown>;
}
