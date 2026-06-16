-- Declutter local seed
-- Deterministic v4 UUIDs so Selenium tests can address records directly.
-- Safe to re-run.

truncate table
  chat_messages,
  chat_threads,
  transactions,
  escrows,
  payouts,
  bank_accounts,
  listing_images,
  listings,
  business_members,
  businesses,
  instagram_imports,
  orders,
  categories,
  platform_settings,
  users
restart identity cascade;

-- Platform settings
insert into platform_settings(id, key, value)
values
  (gen_random_uuid(), 'platform_fee_percent', '{"percent": 5}'::jsonb),
  (gen_random_uuid(), 'default_payment_mode', '{"mode": "escrow"}'::jsonb);

-- Users (fixed v4 UUIDs)
insert into users(id, phone, first_name, last_name, email, role, is_phone_verified, is_banned) values
  ('a0000000-0000-4000-8000-000000000001', '+2348010000001', 'Ada',   'Admin',  'admin@declutter.test', 'admin',  true, false),
  ('b0000000-0000-4000-8000-000000000001', '+2348010000002', 'Sade',  'Seller', 'sade@declutter.test',  'seller', true, false),
  ('b0000000-0000-4000-8000-000000000002', '+2348010000003', 'Tunde', 'Trader', 'tunde@declutter.test', 'seller', true, false),
  ('c0000000-0000-4000-8000-000000000001', '+2348010000004', 'Bisi',  'Buyer',  'bisi@declutter.test',  'buyer',  true, false),
  ('c0000000-0000-4000-8000-000000000002', '+2348010000005', 'Femi',  'Fresh',  'femi@declutter.test',  'buyer',  true, false);

-- Businesses
insert into businesses(id, owner_user_id, name, slug, storefront_theme, payment_mode, platform_fee_percent, ig_profile_url, ig_import_enabled, ig_import_mode, brand_settings, is_active) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Sade Studio',  'sade-studio',  'belo-fur', 'escrow',           5.00, null, false, 'draft', '{}'::jsonb, true),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Tunde Goods',  'tunde-goods',  'emox',     'fee_only_offline', 5.00, null, false, 'draft', '{}'::jsonb, true);

insert into business_members(business_id, user_id, role) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'owner'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'owner');

-- Categories — broad canonical list so the IG parser can snap to an
-- existing slug instead of inventing "Other" or "Home".
insert into categories(id, name, slug, sort_order) values
  ('e0000000-0000-4000-8000-000000000001', 'Electronics',  'electronics',  1),
  ('e0000000-0000-4000-8000-000000000002', 'Furniture',    'furniture',    2),
  ('e0000000-0000-4000-8000-000000000003', 'Fashion',      'fashion',      3),
  ('e0000000-0000-4000-8000-000000000004', 'Fitness',      'fitness',      4),
  ('e0000000-0000-4000-8000-000000000005', 'Home Decor',   'home-decor',   5),
  ('e0000000-0000-4000-8000-000000000006', 'Appliances',   'appliances',   6),
  ('e0000000-0000-4000-8000-000000000007', 'Kitchenware',  'kitchenware',  7),
  ('e0000000-0000-4000-8000-000000000008', 'Beauty',       'beauty',       8),
  ('e0000000-0000-4000-8000-000000000009', 'Tools',        'tools',        9),
  ('e0000000-0000-4000-8000-00000000000a', 'Office',       'office',       10),
  ('e0000000-0000-4000-8000-00000000000b', 'Baby & Kids',  'baby-kids',    11),
  ('e0000000-0000-4000-8000-00000000000c', 'Bags & Luggage','bags-luggage',12),
  ('e0000000-0000-4000-8000-00000000000d', 'Sports',       'sports',       13),
  ('e0000000-0000-4000-8000-00000000000e', 'Auto',         'auto',         14),
  ('e0000000-0000-4000-8000-00000000000f', 'Groceries',    'groceries',    15),
  ('e0000000-0000-4000-8000-000000000010', 'General',      'general',      16);

-- Listings: 6 active+approved (visible in marketplace) + 1 pending (visible to admin moderation)
insert into listings(id, business_id, seller_user_id, category_id, title, description, condition, price_ngn, status, moderation_status, location_label, city, state, latitude, longitude, source, approved_by_user_id, approved_at) values
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002',
   'Mid-century Oak Dining Table',
   'Solid oak six-seater dining table in excellent shape. Light wear on the legs, otherwise immaculate. Pickup in Lekki.',
   'good',     980000.00, 'active', 'approved', 'Lekki Phase 1, Lagos', 'Lagos', 'Lagos', 6.4474, 3.4602, 'manual', 'a0000000-0000-4000-8000-000000000001', now()),

  ('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002',
   'Wood + Metal Sofa',
   'Three-seater frame sofa with new linen cushions. Disassembles for transport.',
   'like_new', 1200000.00, 'active', 'approved', 'Yaba, Lagos', 'Lagos', 'Lagos', 6.5095, 3.3711, 'manual', 'a0000000-0000-4000-8000-000000000001', now()),

  ('f0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
   'iPhone 16 Pro Max 256GB',
   'Sealed unit, Apple Nigeria warranty. Receipt available.',
   'new',      5076900.00, 'active', 'approved', 'Victoria Island, Lagos', 'Lagos', 'Lagos', 6.4281, 3.4219, 'manual', 'a0000000-0000-4000-8000-000000000001', now()),

  ('f0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000003',
   'Open Story Weekender Bag',
   'Genuine leather weekender bag. Lightly used for one trip.',
   'like_new', 219900.00, 'active', 'approved', 'Ikoyi, Lagos', 'Lagos', 'Lagos', 6.4541, 3.4378, 'manual', 'a0000000-0000-4000-8000-000000000001', now()),

  ('f0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004',
   'Elite Pilates Reformer',
   'Studio-grade pilates reformer. Springs and ropes replaced six months ago.',
   'good',     2450000.00, 'active', 'approved', 'Ikeja, Lagos', 'Lagos', 'Lagos', 6.5959, 3.3421, 'manual', 'a0000000-0000-4000-8000-000000000001', now()),

  ('f0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
   'Sony WH-1000XM5 Headphones',
   'Flagship noise-cancelling headphones. Charger and original case included.',
   'like_new', 380000.00, 'active', 'approved', 'Surulere, Lagos', 'Lagos', 'Lagos', 6.4969, 3.3597, 'manual', 'a0000000-0000-4000-8000-000000000001', now()),

  ('f0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005',
   'Vintage Brass Wall Mirror',
   'Hand-finished brass frame mirror. Awaiting moderation.',
   'good',     145000.00, 'draft',  'pending',  'Ikoyi, Lagos', 'Lagos', 'Lagos', 6.4541, 3.4378, 'manual', null, null);

-- Listing images
insert into listing_images(listing_id, url, alt_text, sort_order, is_primary) values
  ('f0000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1200&q=85', 'Oak dining table', 0, true),
  ('f0000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=1200&q=85', 'Dining chair detail', 1, false),
  ('f0000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=85', 'Wood and metal sofa', 0, true),
  ('f0000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=85', 'iPhone 16 Pro Max', 0, true),
  ('f0000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1200&q=85', 'Weekender bag', 0, true),
  ('f0000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=1200&q=85', 'Pilates reformer', 0, true),
  ('f0000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85', 'Sony headphones', 0, true),
  ('f0000000-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=85', 'Brass mirror', 0, true);

-- Seeded escrow order (Bisi bought Sony WH-1000XM5 from Tunde, ~23h left on inspection)
insert into orders(
  id, business_id, listing_id, buyer_user_id, seller_user_id, payment_mode, status,
  item_price_ngn, platform_fee_percent, platform_fee_ngn, amount_due_ngn,
  payment_provider, provider_reference, provider_status, provider_payload,
  paid_at, seller_contact_revealed_at, inspection_deadline_at
) values (
  '10000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  'f0000000-0000-4000-8000-000000000006',
  'c0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'escrow', 'escrow_paid',
  380000.00, 5.00, 19000.00, 399000.00,
  'bani', 'bani_seeded_001', 'success', '{"mode":"seed"}'::jsonb,
  now() - interval '1 hour', now() - interval '1 hour', now() + interval '23 hours'
);

insert into escrows(order_id, listing_id, buyer_user_id, seller_user_id, status, held_amount_ngn, platform_fee_ngn, release_after_at) values (
  '10000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000006',
  'c0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'held', 380000.00, 19000.00, now() + interval '23 hours'
);

insert into transactions(order_id, listing_id, buyer_user_id, seller_user_id, type, status, amount_ngn, payment_provider, provider_reference, provider_payload) values (
  '10000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000006',
  'c0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'checkout', 'success', 399000.00, 'bani', 'bani_seeded_001', '{"mode":"seed"}'::jsonb
);

insert into chat_threads(order_id, type, buyer_user_id, seller_user_id) values
  ('10000000-0000-4000-8000-000000000001', 'declutter_buyer',  'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000001', 'declutter_seller', 'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');

select 'Seed complete.' as info;
select role, phone, email, id from users order by role, phone;
