import type { Knex } from "knex";

const timestamps = (knex: Knex, table: Knex.CreateTableBuilder) => {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
};

export async function up(knex: Knex): Promise<void> {
  await knex.raw('create extension if not exists "pgcrypto"');

  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("phone", 32).notNullable().unique();
    table.string("first_name", 120);
    table.string("last_name", 120);
    table.string("email", 255).unique();
    table.string("role", 24).notNullable().defaultTo("buyer");
    table.boolean("is_phone_verified").notNullable().defaultTo(false);
    table.boolean("is_banned").notNullable().defaultTo(false);
    table.timestamp("last_login_at", { useTz: true });
    timestamps(knex, table);
    table.index(["role"]);
    table.index(["is_banned"]);
  });

  await knex.schema.createTable("businesses", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("owner_user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("name", 180).notNullable();
    table.string("slug", 180).notNullable().unique();
    table.string("storefront_theme", 32).notNullable().defaultTo("emox");
    table.string("payment_mode", 32).notNullable().defaultTo("escrow");
    table.decimal("platform_fee_percent", 5, 2);
    table.string("ig_profile_url", 500);
    table.boolean("ig_import_enabled").notNullable().defaultTo(false);
    table.string("ig_import_mode", 16).notNullable().defaultTo("draft");
    table.jsonb("brand_settings").notNullable().defaultTo("{}");
    table.boolean("is_active").notNullable().defaultTo(true);
    timestamps(knex, table);
    table.index(["owner_user_id"]);
    table.index(["storefront_theme"]);
    table.index(["payment_mode"]);
  });

  await knex.schema.createTable("business_members", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("business_id").notNullable().references("id").inTable("businesses").onDelete("CASCADE");
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("role", 32).notNullable().defaultTo("seller");
    timestamps(knex, table);
    table.unique(["business_id", "user_id"]);
    table.index(["business_id", "role"]);
  });

  await knex.schema.createTable("categories", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("parent_id").references("id").inTable("categories").onDelete("SET NULL");
    table.string("name", 120).notNullable();
    table.string("slug", 140).notNullable().unique();
    table.string("icon", 80);
    table.integer("sort_order").notNullable().defaultTo(0);
    timestamps(knex, table);
  });

  await knex.schema.createTable("listings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("business_id").references("id").inTable("businesses").onDelete("SET NULL");
    table.uuid("seller_user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.uuid("category_id").references("id").inTable("categories").onDelete("SET NULL");
    table.string("title", 180).notNullable();
    table.text("description").notNullable();
    table.string("condition", 32).notNullable().defaultTo("used");
    table.decimal("price_ngn", 14, 2).notNullable();
    table.string("status", 32).notNullable().defaultTo("draft");
    table.string("moderation_status", 32).notNullable().defaultTo("pending");
    table.string("location_label", 180).notNullable().defaultTo("Lagos");
    table.string("city", 120).notNullable().defaultTo("Lagos");
    table.string("state", 120).notNullable().defaultTo("Lagos");
    table.decimal("latitude", 10, 7);
    table.decimal("longitude", 10, 7);
    table.string("source", 32).notNullable().defaultTo("manual");
    table.string("source_url", 500);
    table.uuid("approved_by_user_id").references("id").inTable("users").onDelete("SET NULL");
    table.timestamp("approved_at", { useTz: true });
    table.timestamp("sold_at", { useTz: true });
    timestamps(knex, table);
    table.index(["business_id"]);
    table.index(["seller_user_id"]);
    table.index(["category_id"]);
    table.index(["status", "moderation_status"]);
    table.index(["city", "state"]);
  });

  await knex.schema.createTable("listing_images", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("listing_id").notNullable().references("id").inTable("listings").onDelete("CASCADE");
    table.string("url", 1000).notNullable();
    table.string("alt_text", 240);
    table.integer("sort_order").notNullable().defaultTo(0);
    table.boolean("is_primary").notNullable().defaultTo(false);
    timestamps(knex, table);
    table.index(["listing_id", "sort_order"]);
  });

  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("business_id").references("id").inTable("businesses").onDelete("SET NULL");
    table.uuid("listing_id").notNullable().references("id").inTable("listings").onDelete("RESTRICT");
    table.uuid("buyer_user_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.uuid("seller_user_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.string("payment_mode", 32).notNullable();
    table.string("status", 32).notNullable().defaultTo("pending_payment");
    table.decimal("item_price_ngn", 14, 2).notNullable();
    table.decimal("platform_fee_percent", 5, 2).notNullable();
    table.decimal("platform_fee_ngn", 14, 2).notNullable();
    table.decimal("amount_due_ngn", 14, 2).notNullable();
    table.string("payment_provider", 32).notNullable().defaultTo("bani");
    table.string("provider_reference", 180).unique();
    table.string("provider_status", 80);
    table.jsonb("provider_payload").notNullable().defaultTo("{}");
    table.timestamp("paid_at", { useTz: true });
    table.timestamp("seller_contact_revealed_at", { useTz: true });
    table.timestamp("inspection_deadline_at", { useTz: true });
    table.timestamp("completed_at", { useTz: true });
    table.timestamp("cancelled_at", { useTz: true });
    timestamps(knex, table);
    table.index(["buyer_user_id", "status"]);
    table.index(["seller_user_id", "status"]);
    table.index(["business_id", "status"]);
    table.index(["payment_mode"]);
  });

  await knex.schema.createTable("transactions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.uuid("listing_id").notNullable().references("id").inTable("listings").onDelete("RESTRICT");
    table.uuid("buyer_user_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.uuid("seller_user_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.string("type", 40).notNullable();
    table.string("status", 40).notNullable().defaultTo("pending");
    table.decimal("amount_ngn", 14, 2).notNullable();
    table.string("payment_provider", 32).notNullable().defaultTo("bani");
    table.string("provider_reference", 180);
    table.jsonb("provider_payload").notNullable().defaultTo("{}");
    timestamps(knex, table);
    table.index(["order_id"]);
    table.index(["type", "status"]);
    table.index(["provider_reference"]);
  });

  await knex.schema.createTable("escrows", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("order_id").notNullable().unique().references("id").inTable("orders").onDelete("CASCADE");
    table.uuid("listing_id").notNullable().references("id").inTable("listings").onDelete("RESTRICT");
    table.uuid("buyer_user_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.uuid("seller_user_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.string("status", 32).notNullable().defaultTo("pending");
    table.decimal("held_amount_ngn", 14, 2).notNullable();
    table.decimal("platform_fee_ngn", 14, 2).notNullable();
    table.timestamp("release_after_at", { useTz: true });
    table.timestamp("released_at", { useTz: true });
    table.timestamp("disputed_at", { useTz: true });
    timestamps(knex, table);
    table.index(["seller_user_id", "status"]);
    table.index(["status", "release_after_at"]);
  });

  await knex.schema.createTable("bank_accounts", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.string("bank_name", 160).notNullable();
    table.string("bank_code", 32);
    table.string("account_number", 32).notNullable();
    table.string("account_name", 180).notNullable();
    table.boolean("is_default").notNullable().defaultTo(false);
    table.jsonb("metadata").notNullable().defaultTo("{}");
    timestamps(knex, table);
    table.index(["user_id", "is_default"]);
  });

  await knex.schema.createTable("payouts", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("seller_user_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.uuid("bank_account_id").references("id").inTable("bank_accounts").onDelete("SET NULL");
    table.decimal("amount_ngn", 14, 2).notNullable();
    table.string("status", 32).notNullable().defaultTo("requested");
    table.string("payment_provider", 32).notNullable().defaultTo("bani");
    table.string("provider_reference", 180);
    table.jsonb("provider_payload").notNullable().defaultTo("{}");
    timestamps(knex, table);
    table.index(["seller_user_id", "status"]);
  });

  await knex.schema.createTable("platform_settings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("key", 120).notNullable().unique();
    table.jsonb("value").notNullable();
    timestamps(knex, table);
  });

  await knex.schema.createTable("instagram_imports", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("business_id").notNullable().references("id").inTable("businesses").onDelete("CASCADE");
    table.uuid("listing_id").references("id").inTable("listings").onDelete("SET NULL");
    table.string("source_profile_url", 500).notNullable();
    table.string("source_post_url", 500).notNullable();
    table.text("caption");
    table.jsonb("parsed_json").notNullable().defaultTo("{}");
    table.jsonb("image_urls").notNullable().defaultTo("[]");
    table.string("status", 32).notNullable().defaultTo("pending");
    table.text("error_message");
    table.timestamp("imported_at", { useTz: true });
    timestamps(knex, table);
    table.unique(["business_id", "source_post_url"]);
    table.index(["business_id", "status"]);
  });

  await knex.schema.createTable("chat_threads", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
    table.string("type", 32).notNullable();
    table.uuid("buyer_user_id").references("id").inTable("users").onDelete("SET NULL");
    table.uuid("seller_user_id").references("id").inTable("users").onDelete("SET NULL");
    table.uuid("last_message_id");
    table.timestamp("last_message_at", { useTz: true });
    timestamps(knex, table);
    table.unique(["order_id", "type"]);
    table.index(["order_id"]);
  });

  await knex.schema.createTable("chat_messages", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("thread_id").notNullable().references("id").inTable("chat_threads").onDelete("CASCADE");
    table.uuid("sender_user_id").notNullable().references("id").inTable("users").onDelete("RESTRICT");
    table.string("sender_role", 32).notNullable();
    table.text("body").notNullable();
    table.timestamp("read_at", { useTz: true });
    timestamps(knex, table);
    table.index(["thread_id", "created_at"]);
  });

  await knex.schema.alterTable("chat_threads", (table) => {
    table.foreign("last_message_id").references("id").inTable("chat_messages").onDelete("SET NULL");
  });

  await knex("platform_settings").insert([
    { key: "platform_fee_percent", value: { percent: 5 } },
    { key: "default_payment_mode", value: { mode: "escrow" } }
  ]);

  await knex("categories").insert([
    { name: "Electronics", slug: "electronics", icon: "headphones", sort_order: 1 },
    { name: "Fashion", slug: "fashion", icon: "shirt", sort_order: 2 },
    { name: "Furniture", slug: "furniture", icon: "armchair", sort_order: 3 },
    { name: "Home Decor", slug: "home-decor", icon: "lamp", sort_order: 4 },
    { name: "Health & Beauty", slug: "health-beauty", icon: "sparkles", sort_order: 5 },
    { name: "Groceries", slug: "groceries", icon: "shopping-basket", sort_order: 6 },
    { name: "Fitness", slug: "fitness", icon: "dumbbell", sort_order: 7 },
    { name: "General", slug: "general", icon: "package", sort_order: 99 }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("chat_threads", (table) => {
    table.dropForeign(["last_message_id"]);
  });

  await knex.schema
    .dropTableIfExists("chat_messages")
    .dropTableIfExists("chat_threads")
    .dropTableIfExists("instagram_imports")
    .dropTableIfExists("platform_settings")
    .dropTableIfExists("payouts")
    .dropTableIfExists("bank_accounts")
    .dropTableIfExists("escrows")
    .dropTableIfExists("transactions")
    .dropTableIfExists("orders")
    .dropTableIfExists("listing_images")
    .dropTableIfExists("listings")
    .dropTableIfExists("categories")
    .dropTableIfExists("business_members")
    .dropTableIfExists("businesses")
    .dropTableIfExists("users");
}
