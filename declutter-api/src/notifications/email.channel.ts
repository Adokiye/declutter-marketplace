import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import type { OrderNotification } from "./whatsapp.channel";

@Injectable()
export class EmailChannel {
  private readonly log = new Logger("Email");
  private readonly client?: Resend;
  private readonly from: string;
  private readonly ops?: string;

  constructor(config: ConfigService) {
    const key = config.get<string>("RESEND_API_KEY");
    if (key) this.client = new Resend(key);
    this.from = config.get<string>("NOTIFY_FROM") ?? "Declutter <onboarding@resend.dev>";
    this.ops = config.get<string>("DECLUTTER_OPS_EMAIL") || undefined;
  }

  async send(to: string | undefined, n: OrderNotification): Promise<void> {
    const recipients = [to, this.ops].filter((x): x is string => Boolean(x));
    const subject = `New order: ${n.item} — ${n.amount}`;
    const lines = [
      `${n.fromInstagram ? "An Instagram-sourced item" : "An item"} was just paid for.`,
      "",
      `Item: ${n.item}`,
      `Amount: ${n.amount}`,
      `Buyer: ${n.buyerName} · ${n.buyerPhone} · ${n.buyerEmail}`,
      `Listing: ${n.url}`,
      ...(n.fromInstagram
        ? [`Instagram post: ${n.igSourceUrl ?? "—"}`, "", "This came from Instagram — there is no platform seller account. Please fulfil this order directly."]
        : [])
    ];
    const text = lines.join("\n");

    if (!this.client || recipients.length === 0) {
      this.log.log(`[dry-run] Email → ${recipients.join(", ") || "?"} :: ${subject}\n${text}`);
      return;
    }
    const { error } = await this.client.emails.send({ from: this.from, to: recipients, subject, text });
    if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
    this.log.log(`Email sent → ${recipients.join(", ")}`);
  }
}
