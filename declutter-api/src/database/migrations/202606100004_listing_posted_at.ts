import type { Knex } from "knex";

// posted_at = when the item was originally posted (its Instagram date, or when a
// seller listing went live). created_at stays the platform insert time, so a 3-week-old
// IG post scraped today is still "fresh" on the feed but displays its real posted date.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("listings", (table) => {
    table.timestamp("posted_at", { useTz: true });
    table.index(["posted_at"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("listings", (table) => {
    table.dropIndex(["posted_at"]);
    table.dropColumn("posted_at");
  });
}
