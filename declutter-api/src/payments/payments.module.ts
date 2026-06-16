import { Module } from "@nestjs/common";
import { BaniPaymentProvider } from "./bani-payment.provider";
import { PAYMENT_PROVIDER } from "./payment-provider";

@Module({
  providers: [
    BaniPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: BaniPaymentProvider
    }
  ],
  exports: [PAYMENT_PROVIDER]
})
export class PaymentsModule {}
