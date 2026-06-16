import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BaniCheckoutParams,
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProvider,
  VerifyPaymentResult
} from "./payment-provider";

const DEFAULT_BANI_BASE_URL = "https://api.bani.africa";

@Injectable()
export class BaniPaymentProvider implements PaymentProvider {
  constructor(private readonly config: ConfigService) {}

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const checkoutParams = this.buildCheckoutParams(input);

    return {
      reference: input.reference,
      checkoutParams,
      providerPayload: {
        mode: "bani_checkout",
        provider: "bani",
        reference: input.reference,
        amountNgn: input.amountNgn,
        callbackUrl: input.callbackUrl,
        metadata: checkoutParams.metadata
      }
    };
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResult> {
    const verifyPath = this.config.get<string>("BANI_VERIFY_PATH");
    if (!verifyPath) {
      return {
        reference,
        status: "pending",
        providerPayload: {
          provider: "bani",
          reference,
          message: "Awaiting Bani webhook"
        }
      };
    }

    const payload = await this.request(
      verifyPath.replace(":reference", encodeURIComponent(reference)),
      { method: "GET" }
    );
    return this.parsePaymentPayload(payload, reference);
  }

  async parseWebhook(payload: Record<string, any>, sharedKey?: string): Promise<VerifyPaymentResult> {
    this.verifyWebhookSignature(sharedKey);
    return this.parsePaymentPayload(payload);
  }

  private buildCheckoutParams(input: InitializePaymentInput): BaniCheckoutParams {
    const merchantKey = this.getConfiguredValue("BANI_PUBLIC_KEY");
    if (!merchantKey) {
      throw new BadRequestException("Bani checkout is not configured on this server");
    }

    const fallbackName = this.nameFromEmail(input.email);
    const metadata = {
      ...input.metadata,
      custom_ref: input.reference,
      providerReference: input.reference,
      orderReference: input.reference,
      callbackUrl: input.callbackUrl
    };

    return {
      amount: String(Math.round(input.amountNgn)),
      phoneNumber: input.customer?.phone ?? "",
      email: input.email,
      firstName: input.customer?.firstName?.trim() || fallbackName.firstName,
      lastName: input.customer?.lastName?.trim() || fallbackName.lastName,
      merchantKey,
      bankTransfer: true,
      metadata
    };
  }

  private async request(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown }
  ): Promise<Record<string, any>> {
    const accessToken = this.getConfiguredValue("BANI_ACCESS_TOKEN") ?? this.getConfiguredValue("BANI_SECRET_KEY");
    if (!accessToken) {
      throw new BadRequestException("Bani server API is not configured on this server");
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: init.method,
      headers: this.headers(accessToken),
      body: init.body ? JSON.stringify(init.body) : undefined
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, any>;
    if (!response.ok || payload.status === false) {
      throw new BadRequestException(payload.message ?? `Bani request failed: ${path}`);
    }
    return payload;
  }

  private parsePaymentPayload(payload: Record<string, any>, fallbackReference?: string): VerifyPaymentResult {
    const data = this.objectOrEmpty(payload.data ?? payload);
    const metadata = this.parseMetadata(
      data.custom_data ?? data.customData ?? data.metadata ?? payload.custom_data ?? payload.metadata
    );
    const baniReference =
      data.pay_ref ??
      data.reference ??
      payload.pay_ref ??
      payload.reference ??
      data.transaction_reference ??
      payload.transaction_reference ??
      data.customer_ref ??
      payload.customer_ref;
    const orderReference =
      metadata.providerReference ??
      metadata.provider_reference ??
      metadata.orderReference ??
      metadata.order_reference ??
      metadata.custom_ref ??
      data.customer_ref ??
      payload.customer_ref ??
      fallbackReference ??
      baniReference;

    if (!orderReference) {
      throw new BadRequestException("Bani payload did not include a reference");
    }

    const amount = Number(
      data.pay_amount ??
        data.actual_amount_paid ??
        data.amount ??
        data.amount_ngn ??
        payload.amount ??
        payload.amount_ngn
    );

    return {
      reference: String(orderReference),
      status: this.normalizeStatus(data.pay_status ?? data.status ?? payload.status ?? payload.event ?? data.event),
      amountNgn: Number.isFinite(amount) ? amount : undefined,
      providerPayload: {
        ...payload,
        baniReference,
        metadata
      }
    };
  }

  private headers(accessToken: string): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    };
    const tribeRef = this.getConfiguredValue("BANI_TRIBE_ACCOUNT_REF");
    if (tribeRef) headers["Active-Token-Tribe"] = tribeRef;
    return headers;
  }

  private get baseUrl() {
    return (
      this.getConfiguredValue("BANI_API_URL") ??
      this.getConfiguredValue("BANI_BASE_URL") ??
      DEFAULT_BANI_BASE_URL
    ).replace(/\/$/, "");
  }

  private verifyWebhookSignature(sharedKey?: string) {
    const secret = this.getConfiguredValue("BANI_WEBHOOK_SECRET");
    if (!secret) {
      if (this.config.get<string>("NODE_ENV") === "production") {
        throw new UnauthorizedException("Bani webhook secret is not configured");
      }
      return;
    }
    if (!sharedKey || sharedKey !== secret) {
      throw new UnauthorizedException("Invalid Bani webhook signature");
    }
  }

  private getConfiguredValue(key: string) {
    const value = this.config.get<string>(key)?.trim();
    if (!value || value === "todo:secret") return undefined;
    return value;
  }

  private parseMetadata(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
      } catch {
        return {};
      }
    }
    return {};
  }

  private objectOrEmpty(value: unknown): Record<string, any> {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, any>) : {};
  }

  private nameFromEmail(email: string) {
    const local = email.split("@")[0] || "Declutter";
    const parts = local.split(/[._-]+/).filter(Boolean);
    return {
      firstName: this.capitalize(parts[0] ?? "Declutter"),
      lastName: this.capitalize(parts.slice(1).join(" ") || "Buyer")
    };
  }

  private capitalize(value: string) {
    return value ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}` : value;
  }

  private normalizeStatus(status: unknown): "success" | "failed" | "pending" {
    const value = String(status ?? "").toLowerCase();
    if (["success", "successful", "paid", "completed", "payment.success", "pay.success"].includes(value)) return "success";
    if (["failed", "failure", "cancelled", "canceled", "payment.failed", "pay.failed"].includes(value)) return "failed";
    return "pending";
  }
}
