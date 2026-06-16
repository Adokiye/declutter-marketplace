import type { Knex } from "knex";

// Commission-only ("fee_only_offline") becomes the platform default payment mode:
// buyers pay only the Declutter commission online and settle the item with the seller
// offline. Escrow (commission + item value) is now opt-in per business / admin choice.
export async function up(knex: Knex): Promise<void> {
  await knex("platform_settings")
    .insert({ key: "default_payment_mode", value: { mode: "fee_only_offline" } })
    .onConflict("key")
    .merge({ value: { mode: "fee_only_offline" }, updated_at: knex.fn.now() });

  await knex.schema.alterTable("businesses", (table) => {
    table.string("payment_mode", 32).notNullable().defaultTo("fee_only_offline").alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex("platform_settings")
    .where({ key: "default_payment_mode" })
    .update({ value: { mode: "escrow" }, updated_at: knex.fn.now() });

  await knex.schema.alterTable("businesses", (table) => {
    table.string("payment_mode", 32).notNullable().defaultTo("escrow").alter();
  });
}
