import { Model } from "objection";
import { BankAccountModel } from "./bank-account.model";
import { BaseModel } from "./base.model";
import { UserModel } from "./user.model";

export class PayoutModel extends BaseModel {
  static tableName = "payouts";

  sellerUserId!: string;
  bankAccountId?: string;
  amountNgn!: string;
  status!: "requested" | "processing" | "paid" | "failed";
  paymentProvider!: "bani";
  providerReference?: string;
  providerPayload!: Record<string, unknown>;

  static relationMappings = () => ({
    seller: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "payouts.sellerUserId", to: "users.id" }
    },
    bankAccount: {
      relation: Model.BelongsToOneRelation,
      modelClass: BankAccountModel,
      join: { from: "payouts.bank_account_id", to: "bank_accounts.id" }
    }
  });
}
