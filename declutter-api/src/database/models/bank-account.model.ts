import { Model } from "objection";
import { BaseModel } from "./base.model";
import { UserModel } from "./user.model";

export class BankAccountModel extends BaseModel {
  static tableName = "bank_accounts";

  userId!: string;
  bankName!: string;
  bankCode?: string;
  accountNumber!: string;
  accountName!: string;
  isDefault!: boolean;
  metadata!: Record<string, unknown>;

  static relationMappings = () => ({
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "bank_accounts.user_id", to: "users.id" }
    }
  });
}
