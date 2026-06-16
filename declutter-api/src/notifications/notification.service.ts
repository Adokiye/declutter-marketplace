import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BusinessModel, ListingModel, OrderModel, UserModel } from "../database/models";
import { EmailChannel } from "./email.channel";
import { OrderNotification, WhatsAppChannel } from "./whatsapp.channel";

@Injectable()
export class NotificationService {
  private readonly log = new Logger("Notifications");
  private readonly frontendUrl: string;
  private readonly opsWhatsApp?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly whatsapp: WhatsAppChannel,
    private readonly email: EmailChannel
  ) {
    this.frontendUrl = (config.get<string>("FRONTEND_URL") ?? "http://localhost:3000").split(",")[0].trim().replace(/\/$/, "");
    this.opsWhatsApp = config.get<string>("DECLUTTER_OPS_WHATSAPP") || undefined;
  }

  /** Notify the Declutter business when an order is paid. Best-effort, never throws. */
  async notifyOrderPaid(orderId: string): Promise<void> {
    try {
      const order = (await OrderModel.query()
        .findById(orderId)
        .withGraphFetched("[listing.[business], buyer]")) as
        | (OrderModel & { listing?: ListingModel; buyer?: UserModel })
        | undefined;
      if (!order || !order.listing) return;

      const owner = order.listing.businessId
        ? await BusinessModel.query().findById(order.listing.businessId).then((b) =>
            b ? UserModel.query().findById(b.ownerUserId) : undefined
          )
        : undefined;

      const buyer = order.buyer;
      const fromInstagram = order.listing.source === "instagram";
      const payload: OrderNotification = {
        to: owner?.phone ?? this.opsWhatsApp,
        item: order.listing.title,
        buyerName: [buyer?.firstName, buyer?.lastName].filter(Boolean).join(" ") || "A buyer",
        buyerPhone: buyer?.phone ?? "—",
        buyerEmail: buyer?.email ?? "—",
        amount: `₦${Number(order.amountDueNgn).toLocaleString("en-NG")}`,
        url: `${this.frontendUrl}/listings/${order.listingId}`,
        fromInstagram,
        igSourceUrl: order.listing.sourceUrl ?? null
      };

      await Promise.allSettled([
        this.whatsapp.send(payload).catch((e) => this.log.warn(`whatsapp: ${e instanceof Error ? e.message : e}`)),
        this.email.send(owner?.email ?? undefined, payload).catch((e) => this.log.warn(`email: ${e instanceof Error ? e.message : e}`))
      ]);
    } catch (err) {
      this.log.warn(`notifyOrderPaid failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}
