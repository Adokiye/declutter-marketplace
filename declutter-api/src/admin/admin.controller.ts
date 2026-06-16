import { Body, Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { normalizePagination, toPaginated } from "../common/pagination";
import { EscrowModel, ListingModel, OrderModel, TransactionModel, UserModel } from "../database/models";
import { ListingsService } from "../listings/listings.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly listings: ListingsService) {}

  @Get("metrics")
  async metrics() {
    const [users, buyers, sellers, listings, orders, gmv, fees] = await Promise.all([
      UserModel.query().resultSize(),
      UserModel.query().where("role", "buyer").resultSize(),
      UserModel.query().where("role", "seller").resultSize(),
      ListingModel.query().where("status", "active").resultSize(),
      OrderModel.query().resultSize(),
      OrderModel.query().sum("item_price_ngn as total").whereIn("status", ["escrow_paid", "fee_paid", "completed"]).first(),
      OrderModel.query().sum("platform_fee_ngn as total").whereIn("status", ["escrow_paid", "fee_paid", "completed"]).first()
    ]);

    return {
      totalUsers: users,
      activeBuyers: buyers,
      activeSellers: sellers,
      activeListings: listings,
      totalOrders: orders,
      gmvNgn: Number((gmv as any)?.total ?? 0),
      feesCollectedNgn: Number((fees as any)?.total ?? 0)
    };
  }

  @Get("escrows")
  async escrows(@Query() query: { page?: number; limit?: number; status?: string }) {
    const { page, limit } = normalizePagination(query);
    const builder = EscrowModel.query().withGraphFetched("[order, listing, buyer, seller]").orderBy("createdAt", "desc");
    if (query.status) builder.where({ status: query.status });
    return toPaginated(await builder.page(page - 1, limit), page, limit);
  }

  @Patch("users/:id/ban")
  banUser(@Param("id") id: string) {
    return UserModel.query().patchAndFetchById(id, { isBanned: true });
  }

  @Patch("users/:id/unban")
  unbanUser(@Param("id") id: string) {
    return UserModel.query().patchAndFetchById(id, { isBanned: false });
  }

  @Patch("listings/:id/approve")
  approve(@Param("id") id: string, @Body() body: { adminUserId: string; igPostUrl?: string }) {
    return this.listings.approve(id, body.adminUserId, body.igPostUrl);
  }

  @Patch("listings/:id/reject")
  reject(@Param("id") id: string) {
    return this.listings.reject(id);
  }

  @Patch("listings/:id")
  editListing(@Param("id") id: string, @Body() body: Partial<ListingModel>) {
    return ListingModel.query().patchAndFetchById(id, body);
  }
}
