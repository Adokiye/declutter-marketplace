export type PaymentMode = "escrow" | "fee_only_offline";

export function calculateCheckoutAmounts(itemPriceNgn: number, feePercent: number, paymentMode: PaymentMode) {
  const platformFeeNgn = Math.round(itemPriceNgn * (feePercent / 100));
  const amountDueNgn = paymentMode === "escrow" ? itemPriceNgn + platformFeeNgn : platformFeeNgn;

  return {
    itemPriceNgn,
    platformFeePercent: feePercent,
    platformFeeNgn,
    amountDueNgn
  };
}
