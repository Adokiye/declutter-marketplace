import { Injectable } from "@nestjs/common";
import { CategoryModel } from "../database/models";

@Injectable()
export class CategoriesService {
  list() {
    return CategoryModel.query().orderBy("sortOrder", "asc").orderBy("name", "asc");
  }
}
