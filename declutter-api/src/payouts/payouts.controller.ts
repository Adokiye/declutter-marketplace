import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PayoutsService } from "./payouts.service";

@Controller("payouts")
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post("bank-accounts")
  createBankAccount(
    @Body()
    dto: {
      userId: string;
      bankName: string;
      bankCode?: string;
      accountNumber: string;
      accountName: string;
      isDefault?: boolean;
    }
  ) {
    return this.payouts.createBankAccount(dto);
  }

  @Get("sellers/:sellerUserId/balance")
  balance(@Param("sellerUserId") sellerUserId: string) {
    return this.payouts.sellerBalance(sellerUserId);
  }

  @Post("sellers/:sellerUserId/request")
  request(@Param("sellerUserId") sellerUserId: string, @Body() body: { amountNgn: number; bankAccountId?: string }) {
    return this.payouts.requestPayout(sellerUserId, Number(body.amountNgn), body.bankAccountId);
  }
}
