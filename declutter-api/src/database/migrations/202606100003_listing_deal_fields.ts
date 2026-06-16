import type { Knex } from "knex";

// Richer listing metadata:
//  - brand: extracted on create / from IG captions, used to find comparables.
//  - is_distress_sale: seller checkbox or detected from IG ("urgent", "must sell"…).
//  - is_good_deal / deal_score / reference_price_ngn: computed by the deal evaluator
//    (deal_score = price ÷ comparable median; lower is a better deal).
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("listings", (table) => {
    table.string("brand", 120);
    table.boolean("is_distress_sale").notNullable().defaultTo(false);
    table.boolean("is_good_deal").notNullable().defaultTo(false);
    table.decimal("deal_score", 6, 2);
    table.decimal("reference_price_ngn", 14, 2);
    table.index(["is_distress_sale"]);
    table.index(["is_good_deal"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("listings", (table) => {
    table.dropIndex(["is_distress_sale"]);
    table.dropIndex(["is_good_deal"]);
    table.dropColumn("brand");
    table.dropColumn("is_distress_sale");
    table.dropColumn("is_good_deal");
    table.dropColumn("deal_score");
    table.dropColumn("reference_price_ngn");
  });
}
