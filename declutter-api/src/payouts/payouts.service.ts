import { BadRequestException, Injectable } from "@nestjs/common";
import { BankAccountModel, EscrowModel, PayoutModel } from "../database/models";

@Injectable()
export class PayoutsService {
  async createBankAccount(dto: {
    userId: string;
    bankName: string;
    bankCode?: string;
    accountNumber: string;
    accountName: string;
    isDefault?: boolean;
  }) {
    if (dto.isDefault) {
      await BankAccountModel.query().patch({ isDefault: false }).where({ userId: dto.userId });
    }
    return BankAccountModel.query().insert({ ...dto, isDefault: dto.isDefault ?? true, metadata: {} });
  }

  async sellerBalance(sellerUserId: string) {
    const released = await EscrowModel.query()
      .sum("held_amount_ngn as total")
      .where({ sellerUserId, status: "released" })
      .first();
    const paidOrPending = await PayoutModel.query()
      .sum("amount_ngn as total")
      .where({ sellerUserId })
      .whereIn("status", ["requested", "processing", "paid"])
      .first();

    const releasedTotal = Number((released as any)?.total ?? 0);
    const payoutTotal = Number((paidOrPending as any)?.total ?? 0);
    return {
      releasedEscrowBalanceNgn: releasedTotal,
      payoutLockedNgn: payoutTotal,
      availableBalanceNgn: Math.max(releasedTotal - payoutTotal, 0)
    };
  }

  async requestPayout(sellerUserId: string, amountNgn: number, bankAccountId?: string) {
    const balance = await this.sellerBalance(sellerUserId);
    if (amountNgn <= 0 || amountNgn > balance.availableBalanceNgn) {
      throw new BadRequestException("Insufficient released escrow balance");
    }

    const bankAccount =
      bankAccountId
        ? await BankAccountModel.query().findById(bankAccountId)
        : await BankAccountModel.query().findOne({ userId: sellerUserId, isDefault: true });

    return PayoutModel.query().insert({
      sellerUserId,
      bankAccountId: bankAccount?.id,
      amountNgn: amountNgn.toFixed(2),
      status: "requested",
      paymentProvider: "bani",
      providerPayload: { note: "Bani transfer endpoint pending merchant docs" }
    });
  }
}
