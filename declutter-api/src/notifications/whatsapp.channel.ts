import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { normalizePhone } from "../auth/phone-normalizer";

export type OrderNotification = {
  to?: string | null; // recipient phone (E.164-ish)
  item: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  amount: string;
  url: string;
  fromInstagram: boolean;
  igSourceUrl?: string | null;
};

@Injectable()
export class WhatsAppChannel {
  private readonly log = new Logger("WhatsApp");
  private readonly token?: string;
  private readonly phoneNumberId?: string;
  private readonly template?: string;
  private readonly lang: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>("WHATSAPP_TOKEN") || undefined;
    this.phoneNumberId = config.get<string>("WHATSAPP_PHONE_NUMBER_ID") || undefined;
    this.template = config.get<string>("WHATSAPP_TEMPLATE") || undefined;
    this.lang = config.get<string>("WHATSAPP_TEMPLATE_LANG") || "en";
  }

  private get configured() {
    return Boolean(this.token && this.phoneNumberId && this.template);
  }

  async send(n: OrderNotification): Promise<void> {
    const to = n.to ? normalizePhone(n.to) : "";
    const params = [n.item, n.buyerName, n.buyerPhone, n.amount, n.url];

    if (!this.configured || !to) {
      this.log.log(`[dry-run] WhatsApp → ${to || "?"} template=${this.template ?? "—"} params=${JSON.stringify(params)}`);
      return;
    }

    const body = {
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: this.template,
        language: { code: this.lang },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text: String(text) })) }]
      }
    };

    const res = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      throw new Error(`WhatsApp send failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    this.log.log(`WhatsApp template sent → ${to}`);
  }
}
