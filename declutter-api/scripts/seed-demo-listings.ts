import "dotenv/config";
import Knex from "knex";
import config from "../knexfile";

// Demo data so the landing page's "Best deals" and "Distress sales" rows have
// content. Every row created here is tagged source_url='demo-seed' — re-running
// this script first deletes the previous demo set, and you can wipe it with:
//   delete from listings where source_url = 'demo-seed';
const SOURCE = "demo-seed";

const IMAGES = [
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85"
];

const CATEGORIES = [
  { id: "e0000000-0000-4000-8000-000000000001", name: "Electronics", base: 420000 },
  { id: "e0000000-0000-4000-8000-000000000002", name: "Furniture", base: 300000 },
  { id: "e0000000-0000-4000-8000-000000000003", name: "Fashion", base: 90000 },
  { id: "e0000000-0000-4000-8000-000000000004", name: "Fitness", base: 600000 }
];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

async function main() {
  const knex = Knex((config as any).development);
  try {
    const sellerId = (await knex("users").where({ role: "seller" }).first("id"))?.id
      ?? (await knex("users").first("id"))?.id;
    if (!sellerId) throw new Error("No users in DB to own demo listings");

    // Clear any previous demo run.
    const old = await knex("listings").where({ source_url: SOURCE }).select("id");
    if (old.length) {
      await knex("listing_images").whereIn("listing_id", old.map((r: any) => r.id)).del();
      await knex("listings").whereIn("id", old.map((r: any) => r.id)).del();
    }

    let created = 0;
    let deals = 0;
    let distress = 0;

    for (const [ci, cat] of CATEGORIES.entries()) {
      // 3 comparables clustered around base, plus 1 clear bargain at ~45%.
      const prices = [cat.base, Math.round(cat.base * 1.1), Math.round(cat.base * 0.95), Math.round(cat.base * 0.45)];
      const med = median(prices);
      for (const [i, price] of prices.entries()) {
        const isBargain = i === 3;
        const isGoodDeal = price <= med * 0.85;
        const isDistress = i === 0 && ci % 2 === 0; // a couple of distress sales
        const [row] = await knex("listings")
          .insert({
            seller_user_id: sellerId,
            category_id: cat.id,
            title: `${cat.name} ${isBargain ? "Bargain" : "Item"} ${i + 1}`,
            description: `Demo ${cat.name.toLowerCase()} listing for showcasing the marketplace.`,
            condition: "good",
            brand: cat.name,
            price_ngn: price.toFixed(2),
            is_distress_sale: isDistress,
            is_good_deal: isGoodDeal,
            deal_score: (price / med).toFixed(2),
            reference_price_ngn: med.toFixed(2),
            status: "active",
            moderation_status: "approved",
            location_label: "Lekki, Lagos",
            city: "Lagos",
            state: "Lagos",
            source: "manual",
            source_url: SOURCE,
            approved_at: new Date().toISOString()
          })
          .returning("id");
        await knex("listing_images").insert({
          listing_id: row.id,
          url: IMAGES[(ci + i) % IMAGES.length],
          alt_text: cat.name,
          sort_order: 0,
          is_primary: true
        });
        created += 1;
        if (isGoodDeal) deals += 1;
        if (isDistress) distress += 1;
      }
    }

    console.log(`seeded ${created} demo listings (${deals} good deals, ${distress} distress sales)`);
  } finally {
    await knex.destroy();
  }
}

void main();
