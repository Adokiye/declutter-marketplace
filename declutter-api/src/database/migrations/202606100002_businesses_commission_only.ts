import type { Knex } from "knex";

// Existing businesses were seeded with the old "escrow" default. Commission-only is
// now the platform default, so bring existing businesses in line — admins can opt a
// business back into escrow from the admin settings going forward.
export async function up(knex: Knex): Promise<void> {
  await knex("businesses").where({ payment_mode: "escrow" }).update({ payment_mode: "fee_only_offline" });
}

export async function down(): Promise<void> {
  // No-op: we can't tell which businesses were originally escrow.
}
