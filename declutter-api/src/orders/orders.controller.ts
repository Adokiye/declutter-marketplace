import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { PAYMENT_PROVIDER, PaymentProvider } from "../payments/payment-provider";
import { CreateOrderDto } from "./dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider
  ) {}

  @Post("checkout")
  checkout(@Body() dto: CreateOrderDto) {
    return this.orders.createCheckout(dto);
  }

  @Get()
  list(@Query() query: { page?: number; limit?: number; buyerUserId?: string; sellerUserId?: string; status?: string }) {
    return this.orders.list(query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.orders.get(id);
  }

  @Post(":id/item-ok")
  itemOk(@Param("id") id: string) {
    return this.orders.markItemOk(id);
  }

  @Post("jobs/release-expired-escrows")
  releaseExpiredEscrows() {
    return this.orders.releaseExpiredEscrows();
  }

  @Post("payments/bani/verify/:reference")
  verify(@Param("reference") reference: string) {
    return this.orders.verifyProviderReference(reference);
  }

  @Post("payments/bani/webhook")
  async baniWebhook(@Body() body: Record<string, unknown>, @Headers() headers: Record<string, string | undefined>) {
    const sharedKey = headers["bani-shared-key"] ?? headers["x-bani-shared-key"] ?? headers["bani-key"];
    const result = await this.payments.parseWebhook(body, sharedKey);
    return this.orders.handlePaymentResult(result);
  }
}
