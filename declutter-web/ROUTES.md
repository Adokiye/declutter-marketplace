# Declutter Web Routes

## Buyer

- `/` — Emox-inspired marketplace storefront (kept for reference).
- `/marketplace` — Default grayscale marketplace; live listing search, filters, pagination.
- `/themes/emox`, `/themes/belo-fur`, `/themes/lefore` — Branded business storefronts (theme references).
- `/listings/[id]` — Product detail with image gallery, seller card, "Buy now".
- `/checkout/[listingId]` — Order summary with item + 5% platform fee breakdown, initiates payment.
- `/orders` — Buyer order history.
- `/orders/[id]` — Order detail with 24-hour escrow countdown, "Item OK" release, seller contact reveal.

## Auth

- `/login` — Phone → static OTP (`000000` dev) → profile completion. `?next=` redirects back after sign-in.

## Seller console (`/seller/*`)

- `/seller` — Overview: active/sold counts, balance, recent orders.
- `/seller/listings` — Active / Draft / Sold tabs.
- `/seller/new-listing` — Create listing form (images, title, description, condition, price, location).
- `/seller/payouts` — Released escrow balance, bank account form, payout request.

## Admin console (`/dashboard/*`)

- `/dashboard` — Global metrics (users, GMV, fees) + escrow table with status filter.
- `/dashboard/users` — User table with ban / unban.
- `/dashboard/listings` — Pending / approved / rejected tabs with approve & reject actions.
