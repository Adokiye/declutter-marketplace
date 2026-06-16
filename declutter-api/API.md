# Declutter API Surface

All list endpoints use `page` and `limit` and return `{ data, pagination }`.

## Auth

- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify` with OTP `000000`
- `POST /api/auth/profile`

## Businesses

- `POST /api/businesses`
- `GET /api/businesses`
- `GET /api/businesses/slug/:slug`
- `PATCH /api/businesses/:id/settings`

Business settings include `storefrontTheme`, `paymentMode`, `platformFeePercent`, `igProfileUrl`, `igImportEnabled`, and `igImportMode`.

## Listings

- `POST /api/listings`
- `GET /api/listings`
- `GET /api/listings/:id`
- `PATCH /api/listings/:id/approve`
- `PATCH /api/listings/:id/reject`

Search filters include `q`, `categoryId`, `businessId`, `sellerUserId`, `minPrice`, `maxPrice`, `lat`, `lng`, `radiusKm`, `status`, `moderationStatus`, and `sort`.

## Orders And Bani

- `POST /api/orders/checkout`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders/:id/item-ok`
- `POST /api/orders/jobs/release-expired-escrows`
- `POST /api/orders/payments/bani/verify/:reference`
- `POST /api/orders/payments/bani/webhook`

`POST /api/orders/checkout` returns `checkout.checkoutParams` for the `bani-react`
widget. The backend includes the Declutter provider reference in
`metadata.custom_ref`/`metadata.providerReference`; Bani webhooks reconcile by
`pay_ref` or those metadata fields. `verify/:reference` is a manual fallback and
returns pending unless `BANI_VERIFY_PATH` is configured.

Payment modes:

- `escrow`: buyer pays item price plus fee through Bani.
- `fee_only_offline`: buyer pays only Declutter's fee through Bani; seller collects offline.

## Chat

- `GET /api/chat/orders/:orderId/threads`
- `GET /api/chat/threads/:threadId/messages`
- `POST /api/chat/threads/:threadId/messages`
- `PATCH /api/chat/threads/:threadId/read`

Socket.IO namespace: `/orders`.

## Instagram

- `POST /api/instagram/businesses/:businessId/sync`

Import dedupe is enforced by unique `(business_id, source_post_url)`.
