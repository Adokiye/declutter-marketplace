import { Controller, Get, Param, Query } from "@nestjs/common";
import { normalizePagination, toPaginated } from "../common/pagination";
import { UserModel } from "../database/models";

@Controller("users")
export class UsersController {
  @Get()
  async list(@Query() query: { page?: number; limit?: number }) {
    const { page, limit } = normalizePagination(query);
    const users = await UserModel.query()
      .orderBy([
        { column: "createdAt", order: "desc" },
        { column: "phone", order: "desc" }
      ])
      .page(page - 1, limit);
    return toPaginated(users, page, limit);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return UserModel.query().findById(id).throwIfNotFound();
  }
}
