import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  BusinessModel,
  ChatThreadModel,
  EscrowModel,
  ListingModel,
  OrderModel,
  TransactionModel,
  UserModel
} from "../database/models";
import { normalizePagination, toPaginated } from "../common/pagination";
import { NotificationService } from "../notifications/notification.service";
import { PAYMENT_PROVIDER, PaymentProvider, VerifyPaymentResult } from "../payments/payment-provider";
import { SettingsService } from "../settings/settings.service";
import { CreateOrderDto } from "./dto";
import { calculateCheckoutAmounts } from "./order-calculations";

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProvider,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationService
  ) {}

  async createCheckout(dto: CreateOrderDto) {
    const listing = await ListingModel.query().findById(dto.listingId).withGraphFetched("[business, seller]");
    if (!listing || listing.status !== "active" || listing.moderationStatus !== "approved") {
      throw new NotFoundException("Listing is not available");
    }
    if (listing.sellerUserId === dto.buyerUserId) {
      throw new BadRequestException("Seller cannot buy their own listing");
    }
    const buyer = await UserModel.query().findById(dto.buyerUserId);
    if (!buyer) {
      throw new BadRequestException("Buyer not found");
    }

    const business = listing.businessId ? await BusinessModel.query().findById(listing.businessId) : undefined;
    const platformFeePercent = Number(business?.platformFeePercent ?? (await this.settings.getPlatformFeePercent()));
    const paymentMode = business?.paymentMode ?? (await this.settings.getDefaultPaymentMode());
    const itemPrice = Number(listing.priceNgn);
    const amounts = calculateCheckoutAmounts(itemPrice, platformFeePercent, paymentMode);
    const reference = `bani_${randomUUID()}`;

    const trx = await OrderModel.startTransaction();
    let orderId = "";
    try {
      const order = await OrderModel.query(trx).insert({
        businessId: listing.businessId,
        listingId: listing.id,
        buyerUserId: dto.buyerUserId,
        sellerUserId: listing.sellerUserId,
        paymentMode,
        status: "pending_payment",
        itemPriceNgn: itemPrice.toFixed(2),
        platformFeePercent: platformFeePercent.toFixed(2),
        platformFeeNgn: amounts.platformFeeNgn.toFixed(2),
        amountDueNgn: amounts.amountDueNgn.toFixed(2),
        paymentProvider: "bani",
        providerReference: reference,
        providerStatus: "initialized",
        providerPayload: {}
      });

      await TransactionModel.query(trx).insert({
        orderId: order.id,
        listingId: listing.id,
        buyerUserId: dto.buyerUserId,
        sellerUserId: listing.sellerUserId,
        type: paymentMode === "escrow" ? "checkout" : "platform_fee",
        status: "pending",
        amountNgn: amounts.amountDueNgn.toFixed(2),
        paymentProvider: "bani",
        providerReference: reference,
        providerPayload: {}
      });

      await ChatThreadModel.query(trx).insert([
        {
          orderId: order.id,
          type: "declutter_buyer",
          buyerUserId: dto.buyerUserId,
          sellerUserId: listing.sellerUserId
        },
        {
          orderId: order.id,
          type: "declutter_seller",
          buyerUserId: dto.buyerUserId,
          sellerUserId: listing.sellerUserId
        },
        {
          orderId: order.id,
          type: "buyer_seller",
          buyerUserId: dto.buyerUserId,
          sellerUserId: listing.sellerUserId
        }
      ]);

      orderId = order.id;
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }

    const checkout = await this.payments.initializePayment({
      reference,
      amountNgn: amounts.amountDueNgn,
      email: dto.buyerEmail,
      callbackUrl: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/orders/${orderId}`,
      metadata: {
        type: "DECLUTTER_ORDER",
        orderId,
        listingId: listing.id,
        buyerId: buyer.id,
        buyerEmail: dto.buyerEmail,
        paymentMode
      },
      customer: {
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        phone: buyer.phone
      }
    });

    await OrderModel.query().patch({ providerPayload: checkout.providerPayload }).where({ id: orderId });
    return { orderId, checkout };
  }

  async handlePaymentResult(result: VerifyPaymentResult) {
    const order = await OrderModel.query().findOne({ providerReference: result.reference });
    if (!order) throw new NotFoundException("Order not found for provider reference");

    if (result.status === "pending") {
      await this.markPaymentPending(order.id, result);
      return OrderModel.query().findById(order.id);
    }

    if (result.status !== "success") {
      await this.markPaymentFailed(order.id, result);
      return OrderModel.query().findById(order.id);
    }

    if (order.paidAt) return order;

    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextStatus = order.paymentMode === "escrow" ? "escrow_paid" : "fee_paid";

    const trx = await OrderModel.startTransaction();
    try {
      await OrderModel.query(trx).patch({
        status: nextStatus,
        providerStatus: "success",
        providerPayload: result.providerPayload,
        paidAt: now.toISOString(),
        sellerContactRevealedAt: now.toISOString(),
        inspectionDeadlineAt: order.paymentMode === "escrow" ? deadline.toISOString() : undefined
      }).where({ id: order.id });

      await TransactionModel.query(trx).patch({
        status: "success",
        providerPayload: result.providerPayload
      }).where({ providerReference: result.reference });

      if (order.paymentMode === "escrow") {
        await EscrowModel.query(trx).insert({
          orderId: order.id,
          listingId: order.listingId,
          buyerUserId: order.buyerUserId,
          sellerUserId: order.sellerUserId,
          status: "held",
          heldAmountNgn: order.itemPriceNgn,
          platformFeeNgn: order.platformFeeNgn,
          releaseAfterAt: deadline.toISOString()
        });
      }

      await ListingModel.query(trx).patch({
        status: "sold",
        soldAt: now.toISOString()
      }).where({ id: order.listingId });

      await trx.commit();

      // Tell the Declutter business an order was paid (WhatsApp + email; best-effort).
      void this.notifications.notifyOrderPaid(order.id);

      return OrderModel.query().findById(order.id).withGraphFetched("[listing.images, buyer, seller, escrow, chatThreads]");
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async verifyProviderReference(reference: string) {
    const result = await this.payments.verifyPayment(reference);
    return this.handlePaymentResult(result);
  }

  async markItemOk(orderId: string) {
    const order = await OrderModel.query().findById(orderId).withGraphFetched("escrow");
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentMode !== "escrow") {
      return OrderModel.query().patchAndFetchById(orderId, {
        status: "completed",
        completedAt: new Date().toISOString()
      });
    }
    return this.releaseEscrow(orderId);
  }

  async releaseExpiredEscrows() {
    const due = await EscrowModel.query()
      .where("status", "held")
      .where("releaseAfterAt", "<=", new Date().toISOString());

    const released = [];
    for (const escrow of due) {
      released.push(await this.releaseEscrow(escrow.orderId));
    }
    return { released: released.length };
  }

  async releaseEscrow(orderId: string) {
    const now = new Date().toISOString();
    const trx = await OrderModel.startTransaction();
    try {
      const order = await OrderModel.query(trx).findById(orderId).throwIfNotFound();
      await EscrowModel.query(trx).patch({ status: "released", releasedAt: now }).where({ orderId });
      await OrderModel.query(trx).patch({ status: "completed", completedAt: now }).where({ id: orderId });
      await TransactionModel.query(trx).insert({
        orderId,
        listingId: order.listingId,
        buyerUserId: order.buyerUserId,
        sellerUserId: order.sellerUserId,
        type: "escrow_release",
        status: "success",
        amountNgn: order.itemPriceNgn,
        paymentProvider: "bani",
        providerPayload: { internalLedger: true }
      });
      await trx.commit();
      return OrderModel.query().findById(orderId).withGraphFetched("[escrow, listing.images]");
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async list(query: { page?: number; limit?: number; buyerUserId?: string; sellerUserId?: string; status?: string }) {
    const { page, limit } = normalizePagination(query);
    const builder = OrderModel.query().withGraphFetched("[listing.images, buyer, seller, escrow]").orderBy("createdAt", "desc");
    if (query.buyerUserId) builder.where({ buyerUserId: query.buyerUserId });
    if (query.sellerUserId) builder.where({ sellerUserId: query.sellerUserId });
    if (query.status) builder.where({ status: query.status });
    return toPaginated(await builder.page(page - 1, limit), page, limit);
  }

  get(id: string) {
    return OrderModel.query().findById(id).withGraphFetched("[listing.images, buyer, seller, escrow, chatThreads]").throwIfNotFound();
  }

  private async markPaymentFailed(orderId: string, result: VerifyPaymentResult) {
    await OrderModel.query().patch({
      providerStatus: result.status,
      providerPayload: result.providerPayload
    }).where({ id: orderId });
    await TransactionModel.query().patch({
      status: "failed",
      providerPayload: result.providerPayload
    }).where({ providerReference: result.reference });
  }

  private async markPaymentPending(orderId: string, result: VerifyPaymentResult) {
    await OrderModel.query().patch({
      providerStatus: result.status,
      providerPayload: result.providerPayload
    }).where({ id: orderId });
    await TransactionModel.query().patch({
      providerPayload: result.providerPayload
    }).where({ providerReference: result.reference, status: "pending" });
  }
}
