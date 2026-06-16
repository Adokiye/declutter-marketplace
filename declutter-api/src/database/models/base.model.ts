import { Model, snakeCaseMappers } from "objection";

export class BaseModel extends Model {
  id!: string;
  createdAt!: string;
  updatedAt!: string;

  static columnNameMappers = snakeCaseMappers();
}
