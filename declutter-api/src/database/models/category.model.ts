import { Model } from "objection";
import { BaseModel } from "./base.model";
import { ListingModel } from "./listing.model";

export class CategoryModel extends BaseModel {
  static tableName = "categories";

  parentId?: string;
  name!: string;
  slug!: string;
  icon?: string;
  sortOrder!: number;

  static relationMappings = () => ({
    listings: {
      relation: Model.HasManyRelation,
      modelClass: ListingModel,
      join: { from: "categories.id", to: "listings.categoryId" }
    }
  });
}
