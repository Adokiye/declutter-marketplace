import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { ListingModel } from "../database/models";

export type DealInput = {
  title: string;
  brand?: string | null;
  categoryId?: string | null;
  priceNgn: number;
  excludeListingId?: string;
};

export type DealResult = {
  isGoodDeal: boolean;
  dealScore: number | null; // price ÷ comparable median (lower = better)
  referencePriceNgn: number | null; // comparable median
  reason?: string;
};

type Provider = "openai" | "deepseek" | "none";

const MIN_COMPARABLES = 3;
const GOOD_DEAL_THRESHOLD = 0.85; // deterministic fallback: <=85% of median is a good deal

@Injectable()
export class DealEvaluatorService {
  private readonly log = new Logger("DealEvaluator");
  private readonly client?: OpenAI;
  private readonly provider: Provider;
  private readonly model: string;

  constructor(config: ConfigService) {
    const explicit = (config.get<string>("AI_PROVIDER") ?? "").toLowerCase();
    const openaiKey = config.get<string>("OPENAI_API_KEY");
    const deepseekKey = config.get<string>("DEEPSEEK_API_KEY");
    const selected: Provider =
      explicit === "deepseek" ? (deepseekKey ? "deepseek" : "none") :
      explicit === "openai" ? (openaiKey ? "openai" : "none") :
      deepseekKey ? "deepseek" :
      openaiKey ? "openai" :
      "none";

    if (selected === "deepseek") {
      this.client = new OpenAI({
        apiKey: deepseekKey!,
        baseURL: config.get<string>("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com/v1"
      });
      this.model = config.get<string>("DEEPSEEK_MODEL") ?? "deepseek-chat";
    } else if (selected === "openai") {
      this.client = new OpenAI({ apiKey: openaiKey! });
      this.model = config.get<string>("OPENAI_MODEL") ?? "gpt-4o-mini";
    } else {
      this.model = "";
    }
    this.provider = selected;
  }

  async evaluate(input: DealInput): Promise<DealResult> {
    const none: DealResult = { isGoodDeal: false, dealScore: null, referencePriceNgn: null };
    if (!Number.isFinite(input.priceNgn) || input.priceNgn <= 0) return none;

    // Prefer same-brand comparables; fall back to the category when a brand has
    // too few listings to judge against.
    let prices = input.brand?.trim() ? await this.comparablePrices(input, "brand") : [];
    if (prices.length < MIN_COMPARABLES && input.categoryId) {
      prices = await this.comparablePrices(input, "category");
    }
    if (prices.length < MIN_COMPARABLES) return none;

    const median = medianOf(prices);
    if (!median) return none;
    const dealScore = Number((input.priceNgn / median).toFixed(2));
    const stats = {
      count: prices.length,
      median,
      min: Math.min(...prices),
      max: Math.max(...prices)
    };

    // Deterministic verdict is the safety net; AI can refine it.
    let isGoodDeal = input.priceNgn <= median * GOOD_DEAL_THRESHOLD;
    let reason: string | undefined;

    if (this.client) {
      try {
        const ai = await this.askAi(input, stats);
        if (ai) {
          isGoodDeal = ai.isGoodDeal;
          reason = ai.reason;
        }
      } catch (err) {
        this.log.warn(`AI deal check failed (${this.provider}), using heuristic: ${err instanceof Error ? err.message : err}`);
      }
    }

    return { isGoodDeal, dealScore, referencePriceNgn: median, reason };
  }

  private async comparablePrices(input: DealInput, by: "brand" | "category"): Promise<number[]> {
    const builder = ListingModel.query()
      .where("status", "active")
      .where("moderationStatus", "approved")
      .whereNotNull("priceNgn")
      .select("priceNgn")
      .limit(100);

    if (by === "brand" && input.brand?.trim()) {
      builder.whereRaw("lower(brand) = ?", [input.brand.trim().toLowerCase()]);
    } else if (by === "category" && input.categoryId) {
      builder.where("categoryId", input.categoryId);
    } else {
      return [];
    }
    if (input.excludeListingId) builder.whereNot("id", input.excludeListingId);

    const rows = await builder;
    return rows.map((r) => Number(r.priceNgn)).filter((n) => Number.isFinite(n) && n > 0);
  }

  private async askAi(
    input: DealInput,
    stats: { count: number; median: number; min: number; max: number }
  ): Promise<{ isGoodDeal: boolean; reason: string } | null> {
    const completion = await this.client!.chat.completions.create(
      {
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You price used marketplace items in Nigeria (prices in Naira). Given an item and the price " +
              "distribution of comparable listings, decide whether it is a genuinely good deal for a buyer " +
              "(clearly cheaper than comparable items, not just marginally). Return strict JSON: " +
              "{\"isGoodDeal\": boolean, \"reason\": string (max 16 words)}."
          },
          {
            role: "user",
            content: JSON.stringify({
              item: input.title,
              brand: input.brand ?? null,
              priceNgn: input.priceNgn,
              comparables: stats
            })
          }
        ]
      },
      { timeout: 12_000 }
    );
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return { isGoodDeal: Boolean(parsed.isGoodDeal), reason: String(parsed.reason ?? "") };
  }
}

function medianOf(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
