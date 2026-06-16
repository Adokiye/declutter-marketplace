export type InitializePaymentInput = {
  reference: string;
  amountNgn: number;
  email: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
};

export type BaniCheckoutParams = {
  amount: string;
  phoneNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  merchantKey: string;
  bankTransfer?: boolean;
  metadata: Record<string, unknown>;
};

export type InitializePaymentResult = {
  reference: string;
  checkoutUrl?: string;
  checkoutParams?: BaniCheckoutParams;
  providerPayload: Record<string, unknown>;
};

export type VerifyPaymentResult = {
  reference: string;
  status: "success" | "failed" | "pending";
  amountNgn?: number;
  providerPayload: Record<string, unknown>;
};

export interface PaymentProvider {
  initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
  parseWebhook(payload: Record<string, unknown>, signature?: string): Promise<VerifyPaymentResult>;
}

export const PAYMENT_PROVIDER = Symbol("PAYMENT_PROVIDER");
