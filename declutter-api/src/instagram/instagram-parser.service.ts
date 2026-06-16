import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

export type ParsedListing = {
  title: string;
  description: string;
  priceNgn: number;
  category: string;
  condition: string;
  brand: string;
  distressSale: boolean;
  locationLabel: string;
  city: string;
};

// Phrases Nigerian resellers use to signal an urgent / distress sale.
const DISTRESS_RE =
  /\b(distress(?:\s*sale)?|urgent(?:\s*sale)?|must\s*(?:go|sell)|quick\s*sale|relocat(?:e|ing|ion)|leaving\s*(?:the\s*)?(?:country|nigeria|lagos)|travell?ing|moving\s*(?:abroad|out)|price\s*(?:slashed|reduced|drop)|fire\s*sale|give\s*away\s*price)\b/i;

type Provider = "openai" | "deepseek" | "none";

@Injectable()
export class InstagramParserService {
  private readonly log = new Logger("InstagramParser");
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
    this.log.log(`provider=${this.provider} model=${this.model || "—"}`);
  }

  /**
   * Parse a caption into a listing.
   * @param caption raw og:description
   * @param categoryNames closed set of names the model must pick from
   */
  async parseCaption(caption: string, categoryNames: string[] = []): Promise<ParsedListing> {
    const cleaned = stripInstagramMeta(caption);
    if (!this.client) return this.fallbackParse(cleaned, categoryNames);

    const categoryList =
      categoryNames.length > 0
        ? categoryNames.join(", ")
        : "Electronics, Furniture, Fashion, Beauty, Home, Fitness, Appliances, General";

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Extract marketplace listing details from a Nigerian Instagram post caption. " +
              "Return strict JSON with these keys: " +
              "title (concise product name, no like/comment counts), " +
              "description (full caption rewritten as a buyer-friendly summary), " +
              "priceNgn (integer in Naira, 0 if not stated), " +
              `category (MUST be exactly one of: ${categoryList}; pick the closest match — do not invent new categories), ` +
              "condition (one of: new, like_new, good, fair), " +
              "brand (the product brand if clearly stated, e.g. \"Apple\", \"Samsung\", \"Nike\"; empty string if none), " +
              "distressSale (boolean — true only if the caption signals an urgent/distress sale: 'distress', 'urgent', 'must go', 'relocating', 'leaving the country', 'price slashed', etc.), " +
              "locationLabel (the specific neighbourhood / pickup spot mentioned in the caption, e.g. \"Sangotedo, Ajah, Lagos\"; just use \"Lagos\" if nothing specific is stated), " +
              "city (a single city name like Lagos, Abuja, Ibadan — default Lagos)."
          },
          { role: "user", content: cleaned }
        ]
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const category = String(parsed.category ?? parsed.Category ?? "General");
      return {
        title: cleanTitle(String(parsed.title ?? parsed.Title ?? "Instagram item")),
        description: String(parsed.description ?? parsed.Description ?? cleaned),
        priceNgn: Math.max(0, Number(parsed.priceNgn ?? parsed.price ?? parsed["Price (in NGN)"] ?? 0) | 0),
        category: matchCategory(category, categoryNames),
        condition: normalizeCondition(String(parsed.condition ?? parsed.Condition ?? "used")),
        brand: cleanLine(String(parsed.brand ?? parsed.Brand ?? "")).slice(0, 120),
        distressSale: parsed.distressSale === true || parsed.distressSale === "true" || DISTRESS_RE.test(cleaned),
        locationLabel: cleanLine(String(parsed.locationLabel ?? parsed.location ?? "")) || "Lagos",
        city: cleanLine(String(parsed.city ?? "Lagos")) || "Lagos"
      };
    } catch (err) {
      this.log.warn(`AI parse failed (${this.provider}), falling back: ${err instanceof Error ? err.message : err}`);
      return this.fallbackParse(cleaned, categoryNames);
    }
  }

  private fallbackParse(caption: string, categoryNames: string[]): ParsedListing {
    const priceMatch = caption.match(/(?:NGN|₦|N)\s?([\d,]+)/i);
    const priceNgn = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : 0;

    const lines = caption
      .split(/\r?\n|(?<=[.!])\s+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const itemDesc = lines.find((l) => /^item\s+description[: ]/i.test(l));
    const firstUseful = lines.find((l) => l.length > 5 && !/^contact|^whatsapp|^dm|^backup page|^@/i.test(l));
    const title = cleanTitle((itemDesc ? itemDesc.replace(/^item\s+description[: ]\s*/i, "") : firstUseful) ?? "Instagram item");

    // Pull a location hint via common Lagos neighbourhood / pickup markers.
    const locLine = lines.find((l) =>
      /(?:^location[: ])|(?:📍)|(?:pickup\s*[:@])|(?:sangotedo|ajah|lekki|ikeja|yaba|surulere|vi|victoria island|ikoyi|gbagada|magodo|festac)/i.test(l)
    );
    const locationLabel =
      cleanLine((locLine ?? "")
        .replace(/^location[: ]\s*/i, "")
        .replace(/^📍\s*/u, "")
        .replace(/^pickup\s*[:@]\s*/i, "")) || "Lagos";

    return {
      title,
      description: caption,
      priceNgn,
      category: matchCategory("General", categoryNames),
      condition: /\bnew\b/i.test(caption) ? "new" : /like[- ]?new/i.test(caption) ? "like_new" : "used",
      brand: "",
      distressSale: DISTRESS_RE.test(caption),
      locationLabel,
      city: "Lagos"
    };
  }
}

/** Strip the "N likes, M comments - user on date: " prefix Instagram puts in og:description. */
function stripInstagramMeta(caption: string) {
  return caption
    .replace(/^\s*\d+\s+likes?,?\s*\d*\s*comments?\s*-\s*[\w._]+\s+on[^:]*:\s*"?/i, "")
    .replace(/"?\s*$/, "")
    .trim();
}

function cleanTitle(title: string) {
  return cleanLine(title).slice(0, 120) || "Instagram item";
}

function cleanLine(value: string) {
  return value.replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim();
}

function normalizeCondition(input: string) {
  const v = input.toLowerCase().trim();
  if (v === "new") return "new";
  if (v.includes("like") && v.includes("new")) return "like_new";
  if (v === "good" || v === "fair") return v;
  return "used";
}

/**
 * Snap a free-form category string to one of the names we already have in
 * the categories table. Case-insensitive exact match first, then a fuzzy
 * substring match, then fall back to "General" (or the model's value if no
 * list was supplied at all).
 */
function matchCategory(value: string, choices: string[]): string {
  const v = value.trim();
  if (choices.length === 0) return v || "General";
  const lower = v.toLowerCase();
  const exact = choices.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;
  const partial = choices.find((c) => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase()));
  if (partial) return partial;
  return choices.find((c) => c.toLowerCase() === "general") ?? choices[0];
}
