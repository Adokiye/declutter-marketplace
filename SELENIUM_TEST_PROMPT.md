# Declutter — End-to-End Browser Test Brief

You are an autonomous QA engineer. Build and run a comprehensive Selenium WebDriver suite against the Declutter marketplace (Lagos peer-to-peer used-goods marketplace, MVP).

The application is already running locally with seed data on this machine. Do **not** redeploy. Drive a real Chrome browser, observe behaviour, and report concrete pass/fail findings with screenshots for failures.

## 0. Environment

| Service | URL | Notes |
| --- | --- | --- |
| Web (Next.js) | `http://localhost:3000` | The app under test |
| API (NestJS)  | `http://localhost:4000/api` | Backed by Postgres `declutter`, Redis on `:6379` |
| Mock checkout | `http://localhost:3000/checkout/mock-bani?reference=…` | Auto-redirected to from real checkout |

If the API or Web service is down, abort and report it — **do not** restart them or modify application code. Re-seed with `psql -d declutter -f /Users/conte/declutter/declutter-api/seed.sql` only if you need to reset state between scenarios.

### Test stack expectations

- Python 3.9+ (3.9.6 is fine), `selenium >= 4.20`, `pytest`, `webdriver-manager`.
- Installing the test toolchain into a venv is expected and not "modifying the app":

  ```bash
  python3 -m venv /tmp/declutter-qa && source /tmp/declutter-qa/bin/activate
  pip install --upgrade pip
  pip install "selenium>=4.20" pytest webdriver-manager
  ```

- Chrome is at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. `webdriver-manager` will fetch a matching ChromeDriver. Run Chrome **headed first** so you can screenshot; switch to headless only after the suite is stable.
- Use explicit waits (`WebDriverWait` + `expected_conditions`) — never `time.sleep` for UI synchronization. Use one short `sleep(1.5)` only between OTP request and verify if you hit a race (not strictly needed).
- All money is in Nigerian Naira (₦). The locale string Next renders is `"NGN <amount>"` or the `₦` symbol depending on the page.
- Visit `view-source:` on a flaky page to confirm whether content is server-rendered or hydrated, before adjusting waits.

### Service preflight

Before opening Chrome, sanity-check both services. If either fails, abort and report:

```bash
curl -fsS http://localhost:4000/api/admin/metrics >/dev/null
curl -fsSI http://localhost:3000/marketplace >/dev/null
```

### Seed accounts (already in DB)

Authenticate any of these by entering their phone and the static OTP `000000`.

| Role   | Phone            | Email                  | UUID                                   |
| ------ | ---------------- | ---------------------- | -------------------------------------- |
| admin  | `+2348010000001` | `admin@declutter.test` | `a0000000-0000-4000-8000-000000000001` |
| seller | `+2348010000002` | `sade@declutter.test`  | `b0000000-0000-4000-8000-000000000001` |
| seller | `+2348010000003` | `tunde@declutter.test` | `b0000000-0000-4000-8000-000000000002` |
| buyer  | `+2348010000004` | `bisi@declutter.test`  | `c0000000-0000-4000-8000-000000000001` |
| buyer  | `+2348010000005` | `femi@declutter.test`  | `c0000000-0000-4000-8000-000000000002` |

### Seed listings worth knowing

| Title | UUID | Price | Business · payment mode |
| --- | --- | --- | --- |
| Mid-century Oak Dining Table | `f0000000-0000-4000-8000-000000000001` | ₦980,000 | Sade Studio · **escrow** |
| Wood + Metal Sofa | `f0000000-0000-4000-8000-000000000002` | ₦1,200,000 | Sade Studio · escrow |
| iPhone 16 Pro Max 256GB | `f0000000-0000-4000-8000-000000000003` | ₦5,076,900 | Tunde Goods · **fee_only_offline** |
| Open Story Weekender Bag | `f0000000-0000-4000-8000-000000000004` | ₦219,900 | Tunde Goods · fee_only_offline |
| Elite Pilates Reformer | `f0000000-0000-4000-8000-000000000005` | ₦2,450,000 | Sade Studio · escrow |
| Sony WH-1000XM5 Headphones | `f0000000-0000-4000-8000-000000000006` | ₦380,000 | Tunde Goods · fee_only_offline |
| Vintage Brass Wall Mirror **(pending moderation)** | `f0000000-0000-4000-8000-000000000007` | ₦145,000 | Sade Studio · draft/pending |

### Pre-existing escrow order

`10000000-0000-4000-8000-000000000001` — Bisi (buyer) ↔ Tunde (seller), `Sony WH-1000XM5`, status `escrow_paid`, ~23 hours left on inspection countdown. Use this to exercise the timer and "Item OK" release without going through a checkout.

### Auth side-channels

- The login form prints the dev OTP (`000000`) below the verification input. Verify it shows.
- `localStorage["declutter.session"]` holds the JSON session: `{ user, tokens }`. Reading it is the cleanest way to assert sign-in succeeded.
- Sign-in is preserved across pages because the session is in localStorage; sign out via the header avatar menu (forces a navigation to `/login`) or by deleting that key.

### Stable `data-testid` hooks

Prefer these selectors over text matching where possible — they're stable through copy edits:

| Hook | Where | Notes |
| --- | --- | --- |
| `[data-testid="login-phone"]` / `[data-testid="login-phone-submit"]` | `/login` step 1 | phone input + submit |
| `[data-testid="login-otp"]` / `[data-testid="login-otp-submit"]` | `/login` step 2 | OTP input + submit |
| `[data-testid="login-profile-submit"]` | `/login` step 3 | profile completion submit |
| `[data-testid="header-user-menu"]` | global header | avatar bubble (toggles dropdown) |
| `[data-testid="header-menu-signout"]` / `header-menu-orders` / `header-menu-seller` | header dropdown | actions inside the avatar menu |
| `[data-testid="header-sign-in"]` | global header | signed-out "Sign in" CTA |
| `[data-testid="dashboard-log-out"]` | seller / admin sidebars | renamed from "Sign out" to avoid clashing with the agent's `submit()` helper which clicks `sign*` |
| `[data-testid="listing-buy-now"]` | `/listings/[id]` | Buy now CTA |
| `[data-testid="checkout-pay"]` | `/checkout/[listingId]` | Pay button (sticky-positioned to stay in viewport) |
| `[data-testid="checkout-email"]` / `checkout-email-echo` | checkout | email input + visible echo line |
| `[data-testid="mock-bani-approve"]` / `mock-bani-cancel` | `/checkout/mock-bani` | sandbox approve/cancel |
| `[data-testid="order-item-ok"]` | `/orders/[id]` | "Item OK · release funds" button (buyer only) |
| `[data-testid="new-listing-submit"]` | `/seller/new-listing` | submit for moderation |
| `[data-testid="payout-request"]` | `/seller/payouts` | request payout |
| `[data-testid="approve-<listing-uuid>"]` / `reject-<listing-uuid>` | `/dashboard/listings` | per-row moderation buttons |
| `[data-testid="toggle-ban-<phone-digits>"]` | `/dashboard/users` | per-row ban/unban |
| `[data-testid="marketplace-search"]` / `marketplace-search-submit` / `marketplace-min-price` / `marketplace-max-price` / `marketplace-sort` | `/marketplace` | browse controls (uncontrolled inputs — `.clear()` works) |
| `[data-testid="listing-card-<uuid>"]` | listing grids | clickable card link |

### Route renames since the previous run

- `/seller/listings/new` → `/seller/new-listing` (the substring `/listings/` was matching the form route, causing tests waiting on `/listings/<id>` after submit to short-circuit).
- The dashboard sidebar "Sign out" was renamed to "Log out" to disambiguate from the avatar dropdown's "Sign out". Both still call `signOut()`.
- The "Book a viewing" CTA on `/themes/lefore` is now "Start your setup" (matches the test expectation; both point to `/marketplace`).

## 1. UI invariants to check on every page

These are **regression-grade** assertions — sample them on at least one page per flow.

- **Strict grayscale palette**: no swatch outside `#000`–`#fff` and the `zinc-*` ramp. After loading a page, sample the computed `background-color` of the `<body>`, the primary CTA button, and any prominent card. Assert all three resolve to RGB triplets where the three channel values are mutually within ±8 of each other (i.e., neutral). Fail loudly on a saturated colour.
- **Modern sans-serif font**: `getComputedStyle(body).fontFamily` includes one of `"Satoshi"`, `"Inter"`, or `"Roboto"` (the active local font is Satoshi, exposed via the `--font-satoshi` CSS variable on `body`).
- **Primary buttons are solid black with white text**: `Button` default variant must render `rgb(0, 0, 0)` background and `rgb(255, 255, 255)` text.
- **No emoji-style icons**: only Lucide stroke icons in headers, navs, and CTAs.

## 2. Flows to cover

For each scenario: launch a fresh browser session, drive it through the steps, assert each "Expect" bullet, and capture a screenshot on failure.

### 2.1 Authentication (`/login`)

1. Visit `http://localhost:3000/login`.
   - Expect: three-step indicator with "Phone", "Verify", "Profile" labels.
   - Expect: heading text "Sign in to Declutter".
2. **Existing user (Bisi the buyer)** — enter `+2348010000004`, submit.
   - Expect: step advances to "Verify".
   - Expect: dev-mode banner shows the literal OTP `000000`.
3. Enter `000000` (paste as one block; the input strips non-digits).
   - Expect: redirected to `/marketplace` because `needsProfile` is false.
   - Expect: header shows the avatar bubble with first initial `B` and the name "Bisi".
   - Expect: `localStorage["declutter.session"]` parses to JSON containing `user.role === "buyer"`.
4. Sign out via the avatar menu ("Sign out" link).
   - Expect: avatar gone, "Sign in" button visible again.
   - Expect: localStorage session key removed.
5. **Brand-new user (registration path)** — enter `+2348019999999` (random unseeded number), submit.
   - Expect: OTP step.
6. Enter `000000`.
   - Expect: step "Profile" appears with first name / last name / email inputs and a Buyer/Seller toggle.
7. Fill `First name = Test`, `Last name = Buyer`, `Email = test+sel@declutter.test`, leave role = Buyer, submit.
   - Expect: redirected to `/marketplace`.
   - Expect: `localStorage` session shows `email === "test+sel@declutter.test"`.
8. Sign out, sign in again with the same phone.
   - Expect: skips the Profile step (now it has a completed profile).
9. **Negative**: in step 1 enter `12345` (not a phone) → expect inline error from the API ("must be a valid phone number" or similar). Frontend should display the error message, not crash.
10. **Negative**: in step 2 enter `111111` (wrong OTP) → expect "Invalid OTP" error.

### 2.2 Marketplace browsing (`/marketplace`)

Sign in as Bisi first so the header has a session.

1. Visit `/marketplace`.
   - Expect: at least 6 listings rendered as cards.
   - Expect: each card shows: image, title, location row, condition pill ("good", "like_new", "new" — `_` replaced), and a price (₦).
   - Expect: page shows total count text ("6 listings" or similar) and a category sidebar.
2. **Search**: type `iphone` in the search input and submit.
   - Expect: results narrow to the iPhone listing.
   - Expect: URL stays on `/marketplace` (search is client-side, not in URL — that's fine).
3. **Search clear**: clear the input and submit empty string.
   - Expect: list returns to all 6.
4. **Price filter**: enter Min `1000000`.
   - Expect: only listings ≥ ₦1,000,000 (Sofa, iPhone, Pilates Reformer).
5. **Sort**: switch sort to "Price: low to high".
   - Expect: first card is the cheapest (Bag at ₦219,900) when filter cleared, or the lowest of the filtered set.
6. **Pagination smoke**: set sort back to "Newest" and verify Prev is disabled, Next is disabled (because total < limit). Then in DevTools or via the URL bar manually request `/api/listings?limit=2&page=2` — it should return 2 results and pagination metadata. (UI pagination requires > 12 listings; with only 6, both buttons are disabled — that is correct behavior, do not flag.)
7. **Card click**: click the first card.
   - Expect: navigates to `/listings/<uuid>`.

### 2.3 Product detail (`/listings/[id]`)

1. From the marketplace, click the Oak Dining Table card (`f0000000-0000-4000-8000-000000000001`).
   - Expect: hero image, condition pill, locationLabel, price (`₦980,000`), CTA "Buy now".
   - Expect: gallery shows ≥ 2 thumbnails (this listing has two images); clicking a thumb swaps the hero image.
   - Expect: "About this item" panel with the seeded description.
   - Expect: "Seller" panel reads "Verified seller" or seller's first name, NOT a phone number (phones are gated until after payment).
2. Click "Buy now" while signed out.
   - Procedure: sign out first, return to product detail, then click Buy now.
   - Expect: redirected to `/login?next=/checkout/<listing-uuid>`.
3. Click "Buy now" while signed in (as Bisi).
   - Expect: navigates to `/checkout/<listing-uuid>`.

### 2.4 Checkout — escrow mode (`/checkout/[listingId]`)

Using `Mid-century Oak Dining Table` (Sade Studio is in **escrow** mode):

1. Visit `/checkout/f0000000-0000-4000-8000-000000000001` as Bisi.
   - Expect: "Confirm your order" heading.
   - Expect: thumbnail + title + condition row.
   - Expect: email input prefilled with `bisi@declutter.test`.
   - Expect: "Payment mode" panel reads `Escrow (recommended)`.
   - Expect: order summary panel with `Item price = ₦980,000`, `Platform fee (5%) = ₦49,000`, `Total due now = ₦1,029,000`. **Numbers must match arithmetic — failure here is a correctness bug.**
   - Expect: button label is `Pay ₦1,029,000`.
2. Click Pay.
   - Expect: full-page redirect to `/checkout/mock-bani?reference=bani_…`.
3. On the mock checkout page, click **Approve payment**.
   - Expect: spinner "Confirming with Declutter…" briefly.
   - Expect: confirmation banner "Payment confirmed. Redirecting…".
   - Expect: page redirects to `/orders/<order-uuid>` within ~1s.
4. On the order detail page that loads:
   - Expect: status pill text is `In escrow`.
   - Expect: a dark "Inspection window" block with a live `HH:MM:SS` countdown ≤ 24h.
   - Expect: seller phone is **revealed** under the Seller panel (`+234801…`).
   - Expect: "Item OK · release funds" button visible (since signed-in user is the buyer).

### 2.5 Checkout — fee-only mode (`/checkout/[listingId]`)

Using `iPhone 16 Pro Max` (Tunde Goods is in **fee_only_offline** mode):

1. Visit `/checkout/f0000000-0000-4000-8000-000000000003` as Bisi.
   - Expect: "Payment mode" reads `Offline pickup · pay 5% platform fee`.
   - Expect: order summary shows `Item price = ₦5,076,900`, `Platform fee (5%) = ₦253,845`, a strike-through line `Pay seller offline ₦5,076,900`, and `Total due now = ₦253,845`.
   - Expect: Pay button reads `Pay ₦253,845` — the buyer is **only** charged the fee in this mode.
2. Cancel the mock checkout (click "Cancel" on the mock-bani page).
   - Expect: error banner "Payment cancelled by buyer." with a "Back to marketplace" button.
3. Restart the checkout, approve.
   - Expect: redirected to `/orders/<id>`.
   - Expect: status pill `Fee paid` (NOT `In escrow`).
   - Expect: there is **no** "Inspection window" block (no escrow timer in fee-only mode).
   - Expect: seller phone still revealed.

### 2.6 Order detail (`/orders/[id]`) — Item OK release

Use the pre-seeded escrow order `10000000-0000-4000-8000-000000000001`.

1. Sign in as Bisi, visit `/orders/10000000-0000-4000-8000-000000000001`.
   - Expect: countdown ticks down each second.
   - Expect: deadline text equals seeded `release_after_at` (~23h ahead, formatted).
2. Click "Item OK · release funds".
   - Expect: button shows spinner, then disappears.
   - Expect: status pill flips to `Completed`.
   - Expect: green-ish (still grayscale!) confirmation block appears: "Order completed on …".
3. After release, **re-seed the database** before running the timer test below: `psql -d declutter -f /Users/conte/declutter/declutter-api/seed.sql`.
4. Visit the same order URL signed in as the **seller** (Tunde, `+2348010000003`).
   - Expect: NO "Item OK" button (it only renders for the buyer).
   - Expect: "Seller view" sidebar card with "Manage payouts" link.

### 2.7 Order history (`/orders`)

1. Sign in as Bisi, visit `/orders`.
   - Expect: a list with at least one row — the seeded `Sony WH-1000XM5` order (or another, depending on prior test order).
   - Expect: row shows thumbnail, listing title, date, status, amount, order id short prefix.
   - Expect: clicking a row navigates to `/orders/<id>`.
2. Sign out and visit `/orders` directly.
   - Expect: redirected to `/login?next=/orders`.

### 2.8 Seller dashboard (`/seller/*`)

Sign in as Sade (`+2348010000002`).

1. Visit `/seller`.
   - Expect: layout has a left sidebar with nav items Overview / Listings / New listing / Payouts.
   - Expect: metric cards show Active listings ≥ 3, Sold this month, Available balance (₦0 unless escrows released), Locked in escrow.
   - Expect: "Recent orders" table renders (may be empty).
   - Expect: "Payouts at a glance" panel with a black available-balance card.
2. Click "Listings".
   - Expect: tabs `Active`, `Draft`, `Sold`.
   - Expect: Active tab shows Sade's approved listings (Oak Table, Sofa, Pilates Reformer).
   - Expect: Draft tab shows the pending `Vintage Brass Wall Mirror`.
3. Click "New listing".
   - Expect: form with Title, Description, Price (₦), Condition select, Location label, City, image URL list.
4. Submit a new listing: Title `Selenium Test Lamp`, Description `Test fixture`, Price `25000`, Condition `good`, Location `Yaba`, City `Lagos`, single image `https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=85`.
   - Expect: redirected to `/listings/<new-uuid>` of the freshly created listing.
   - Expect: page renders the new title and price.
   - Note: it lands in draft/pending state. It will appear under Draft tab and under Admin moderation.
5. Click Payouts.
   - Expect: black available-balance card (`₦0` for Sade with no released escrow yet).
   - Expect: bank account form fields (Bank name, Account number, Account holder name).
6. Submit the bank form with `Bank name = GTBank`, `Account number = 0123456789`, `Account holder name = Sade Seller`.
   - Expect: success toast / pill "Bank account saved.".
7. Try requesting a payout with amount `1000000` (you have ₦0 available).
   - Expect: server-side validation error displayed inline: "Insufficient released escrow balance".
8. **Role lockdown**: while signed in as Bisi (buyer), visit `/seller`.
   - Expect: "Access denied" screen with `Back to marketplace` CTA.

### 2.9 Admin dashboard (`/dashboard/*`)

Sign in as Ada Admin (`+2348010000001`).

1. Visit `/dashboard`.
   - Expect: metric cards (`Total users`, `Active sellers`, `Active listings`, `Orders placed`) display non-zero integers.
   - Expect: GMV card shows `₦380,000` (from the seeded escrow order) or higher if you ran checkout tests.
   - Expect: Escrows table renders ≥ 1 row.
2. Filter the Escrows table by `Released` then `Disputed` then back to `All`.
   - Expect: row count changes appropriately; `All` shows all, `Disputed` shows 0 unless you created one.
3. Click "Moderate listings" quick action → `/dashboard/listings`.
   - Expect: tabs `Pending`, `Approved`, `Rejected`.
   - Expect: Pending tab contains the `Vintage Brass Wall Mirror` (and the listing you created in 2.8).
4. Approve the new Selenium Test Lamp.
   - Expect: row vanishes from Pending.
   - Expect: switching to Approved tab shows it.
   - Expect: in the marketplace (open in a new tab) the Lamp now appears.
5. Reject the Brass Mirror.
   - Expect: row vanishes from Pending; appears under Rejected.
6. Click "Manage users" or visit `/dashboard/users`.
   - Expect: table with 6 rows (5 seeded + the test buyer from 2.1.7).
   - Expect: status column shows `Verified` or `Banned`.
7. Ban `Femi` (the second seeded buyer): click the `Ban` button on Femi's row.
   - Expect: row's status pill flips to `Banned`; the button becomes `Unban`.
8. Try to sign in as Femi (open a private/incognito window, hit `/login`, phone `+2348010000005`).
   - Expect: OTP request succeeds, OTP verify fails with "Account is banned".
9. Unban Femi in the admin window.
   - Expect: status reverts to `Verified`; sign-in works again.
10. **Role lockdown**: as Bisi (buyer) visit `/dashboard`. Expect: "Access denied".

### 2.10 Themed storefronts (`/`, `/themes/belo-fur`, `/themes/lefore`, `/themes/emox`)

These pages exist purely to showcase three layout themes per the design references. Verify:

1. `/themes/belo-fur` renders the editorial furniture layout — Belo.Fur wordmark, "Exclusive Collections" headline, "Curated By Belo.Fur" block.
2. `/themes/lefore` renders the dark hero "Designed for Intentional Movement." with a Pilates image (must look grayscale, not warm).
3. `/themes/emox` renders the "e.mox" wordmark, an "Explore Popular Categories" grid, a "Today's Best Deals For You" carousel.
4. **Grayscale enforcement**: on each theme page, sample the computed `background-color` of `.relative.min-h-\[330px\]` panels and any hero image overlay. None may resolve to a saturated RGB. The Pilates and other photo images must have `filter: grayscale(1)` applied — assert via `getComputedStyle(img).filter` containing `grayscale`.
5. The Lefore and Belo.Fur "Shop Now" / "Start your setup" CTAs route to `/marketplace`.

### 2.11 Header & responsive nav

1. On `/marketplace` while signed out → header shows brand + (Browse, Belo.Fur, Lefore, Emox links) + "Sign in" button.
2. Signed in as Ada (admin) → header shows an extra `Admin` link.
3. Click avatar bubble → dropdown shows `Seller dashboard`, `My orders`, `Sign out`.
4. Resize the window to mobile width.
   - Note: macOS Chrome enforces a ~500px minimum outer window width. `set_window_size(375, …)` will be clamped — asserting `window.innerWidth == 375` will never hold on this machine. Instead, drive `set_window_size(500, 900)` and assert the nav links collapsed via `getComputedStyle(linkEl).display === 'none'` (Tailwind's `md:` breakpoint kicks in below 768px).
   - Expect: avatar bubble still visible, dropdown still works.

### 2.12 Negative & robustness

- `/listings/00000000-0000-0000-0000-000000000000` → "Listing not available" empty state with back link.
- `/orders/00000000-0000-0000-0000-000000000000` → "Order not found" empty state.
- `/checkout/<unknown-uuid>` while signed in → "Checkout unavailable" empty state with back link.
- Hit the API directly: `curl -s http://localhost:4000/api/admin/metrics` returns JSON with at least `totalUsers, activeListings, gmvNgn, feesCollectedNgn`. (Used as a backend sanity ping.)

## 3. Reporting

For each scenario produce a row in a summary table:

```
| Scenario | Pass/Fail | Evidence (path to screenshot or DOM snippet) | Notes |
```

Prepend a top-level summary:

```
TOTAL: <pass>/<total> scenarios passing
BLOCKING BUGS: <list one-liner each>
NOTABLE SLOWNESS: <list pages that took > 3s to first paint>
```

Treat any of these as **blocking**:

- A payment amount doesn't match `item_price + 5%`.
- A buyer can release funds before paying.
- A seller's phone is exposed before payment.
- A banned user can sign in.
- A non-admin can reach `/dashboard/*` or moderate listings.
- A non-seller can reach `/seller/*`.
- A non-grayscale colour appears (saturation > 8/255 on any sampled pixel).

Everything else is **observational** — list it but don't fail the suite.

## 4. Operational notes

- Tests modify DB state. **Re-seed with `psql -d declutter -f /Users/conte/declutter/declutter-api/seed.sql` between full runs** to get a deterministic starting point.
- The Next.js dev server hot-reloads. If you see a `Hot Reload` overlay, dismiss it and refresh.
- If you encounter an `ApiError` toast, capture the response status from DevTools network tab and include it in the failure note.
- Do not modify application code. If a feature gap blocks a test, mark the scenario `Fail (gap)` with a one-line description of what's missing.
- The Bani payment provider is in **mock** mode (no real money). The Instagram auto-importer requires `OPENAI_API_KEY` and a live IG URL — **out of scope** for this run unless the env var is set.

Good luck. Be thorough, be observant, and don't let a flake hide a real bug.
