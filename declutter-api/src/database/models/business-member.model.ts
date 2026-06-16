import { Model } from "objection";
import { BaseModel } from "./base.model";
import { BusinessModel } from "./business.model";
import { UserModel } from "./user.model";

export class BusinessMemberModel extends BaseModel {
  static tableName = "business_members";

  businessId!: string;
  userId!: string;
  role!: "owner" | "seller" | "support" | "admin";

  static relationMappings = () => ({
    business: {
      relation: Model.BelongsToOneRelation,
      modelClass: BusinessModel,
      join: { from: "business_members.business_id", to: "businesses.id" }
    },
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: UserModel,
      join: { from: "business_members.user_id", to: "users.id" }
    }
  });
}
