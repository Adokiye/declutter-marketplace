import { calculateCheckoutAmounts } from "../src/orders/order-calculations";

describe("calculateCheckoutAmounts", () => {
  it("charges item price plus platform fee in escrow mode", () => {
    expect(calculateCheckoutAmounts(100_000, 5, "escrow")).toEqual({
      itemPriceNgn: 100_000,
      platformFeePercent: 5,
      platformFeeNgn: 5_000,
      amountDueNgn: 105_000
    });
  });

  it("charges only the platform fee in offline seller collection mode", () => {
    expect(calculateCheckoutAmounts(100_000, 5, "fee_only_offline")).toEqual({
      itemPriceNgn: 100_000,
      platformFeePercent: 5,
      platformFeeNgn: 5_000,
      amountDueNgn: 5_000
    });
  });
});
