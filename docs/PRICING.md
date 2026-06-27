# WishMe — Pricing & billing

## Current mode: all features free

**`ALL_FEATURES_FREE = true`** in [`app/billing.constants.js`](../app/billing.constants.js).

While this flag is on:

- Every merchant gets **full Pro access** (analytics, QA lab, health checks, login-only mode, CSV export).
- The **Pricing** page shows one active free plan and a **Pro · coming soon** preview (billing buttons are disabled).
- **`/app/billing`** redirects to Pricing — no Shopify charge is created.
- Pro plan code (`PRO`, $5.99/mo, 7-day trial) stays in place for a future launch.

---

## Plans (when paid billing launches)

| Plan | Price | Includes |
|------|--------|----------|
| **Free / Starter** | $0 | Product/collection wishlist, Smart Setup, theme styling |
| **Pro** | **$5.99 USD / month** | Insights, Health & QA, login-only mode |
| **Growth** | **~$9.99 USD / month** | Pro + Smart Alerts (all 3 types) |

Billing uses Shopify’s [Billing API](https://shopify.dev/docs/apps/launch/billing). Charges appear on the merchant’s Shopify invoice.

**Partner Dashboard plan handle (Pro):** `PRO` — must match `PRO_PLAN` in code.

---

## App Store listing (free launch)

While everything is free:

1. Set listing **Pricing** to **Free** (or free plan only).
2. Do **not** require merchants to approve a paid subscription.
3. You can skip creating a paid plan in Partner Dashboard until launch day.

When you enable paid Pro, update the listing to **Free + Pro ($5.99/mo)** so it matches the Billing API.

---

## Enable paid Pro later (checklist)

1. In Partner Dashboard → **Pricing**, add Pro plan with internal handle **`PRO`**, $5.99 USD/month, 7-day trial.
2. In code, set `ALL_FEATURES_FREE = false` in [`app/billing.constants.js`](../app/billing.constants.js).
3. Update [`app/routes/app.pricing.jsx`](../app/routes/app.pricing.jsx) `COMPARE_ROWS` so Pro-only features show `free: false` (QA lab, login-only, analytics, CSV).
4. Redeploy production.
5. Test on a **development store**: Pricing → **Start Pro trial** → approve test charge → confirm analytics/QA gates unlock only after payment.
6. Update App Store listing pricing to match.

Optional: set `BILLING_REDIRECT_ON_LOAD=true` to send non-Pro merchants to Pricing on every app load (default: off).

---

## Where pricing is configured

### 1. In this codebase

| File | Purpose |
|------|---------|
| [`app/billing.constants.js`](../app/billing.constants.js) | `ALL_FEATURES_FREE`, plan name (`PRO`), price ($5.99), trial (7 days) |
| [`app/billing.server.js`](../app/billing.server.js) | Pro subscription checks and upgrade URLs |
| [`app/shopify.server.js`](../app/shopify.server.js) | `billing` block passed to `shopifyApp()` |
| [`app/routes/app.billing.jsx`](../app/routes/app.billing.jsx) | “Start Pro trial” → Shopify approval URL (blocked while `ALL_FEATURES_FREE`) |
| [`app/routes/app.pricing.jsx`](../app/routes/app.pricing.jsx) | Merchant-facing plans UI |
| [`app/routes/app.api.analytics-export.jsx`](../app/routes/app.api.analytics-export.jsx) | CSV download (Pro-gated when `ALL_FEATURES_FREE` is false) |
| [`app/routes/app.analytics.jsx`](../app/routes/app.analytics.jsx) | Analytics dashboard (Pro-gated when `ALL_FEATURES_FREE` is false) |

To change price or trial, edit `PRO_PLAN_PRICE` in `app/billing.constants.js` and redeploy.

### 2. Shopify Partner Dashboard (App Store listing)

For a **public App Store** listing after paid launch:

1. [partners.shopify.com](https://partners.shopify.com) → **Apps** → **WishMe**
2. **Distribution** → **Shopify App Store**
3. **Pricing** — align Free + Pro $5.99/mo with the Billing API

### 3. What merchants see today (`ALL_FEATURES_FREE = true`)

- **Pricing:** “All features included — free for every store”; Pro card shows **Coming soon**.
- **App:** Full access to analytics, QA lab, health checks, login-only mode, and exports.
- **Billing:** No charge; `/app/billing` does not start checkout.

### 4. What merchants will see after paid launch (`ALL_FEATURES_FREE = false`)

- **Free:** Storefront wishlist, theme blocks, launch checklist.
- **Pro:** QA lab, health checks, analytics, CSV export, login-only mode.
- **Upgrade:** Pricing → **Start Pro trial** → Shopify-hosted approval page (returns to `/app/pricing`).

Development stores use **test charges** (`isTest: true` when `NODE_ENV !== production`).

---

## Export data (Pro)

Merchants with Pro open **Analytics** and click **Export CSV**.

The file includes:

- Summary metrics (adoption, totals)
- Customers with wishlists (email, item count, product IDs, last update)
- Products (title, handle, save counts)

Route: `GET /app/api/analytics-export` (session required, Pro subscription checked).

---

## Troubleshooting: `accounts.shopify.com refused to connect`

This usually means Shopify’s **login page was loaded inside the app iframe** (not allowed).

**Fixes:**

1. **Billing return URL** — After approving Pro, you must return via  
   `https://admin.shopify.com/store/YOUR_STORE/apps/wishlist-pro/app/analytics`  
   (handled in code via `embeddedAdminAppUrl`). Do not use a bare tunnel URL as `returnUrl` unless you know it loads inside admin correctly.

2. **`SHOPIFY_APP_URL`** — Must match your live app URL (Partner Dashboard **App URL** and Vercel env). Use `https://`, no trailing slash.

3. **`SHOPIFY_APP_HANDLE`** — If your app slug in the admin URL is not `wishlist-pro`, set this in `.env` to match Partner Dashboard → App setup → Handle.

4. **Open the app from Shopify Admin** — Apps → WishMe (not only the tunnel URL in a new tab).

5. **Restart dev** after changing env: `shopify app dev`.

---

## Demo Pro access (no charge)

For demos and QA, grant Pro without Shopify billing:

**Recommended (specific store only):**

```env
DEMO_PRO_SHOPS=your-demo-store.myshopify.com
```

**All shops on that deployment (good for Vercel demo):**

```env
DEMO_PRO_ACCESS=true
```

Set on **Vercel → Environment Variables → Production**, then **Redeploy** (required).  
Pro unlocks: Analytics, CSV export, login-only mode.

Remove these before App Store launch unless you intend free Pro for listed shops.

---

## CSV export in embedded admin

Use **Export report** on the Analytics page:

- **Date range** — filters by customer wishlist `updatedAt` (max **62 days**, no future dates).
- **Customer-based** — one row per customer with product names, handles, and summary metrics.
- **Product-based** — one row per product with customer names/emails who saved it.
- **Full** — both sections in one file.

The app downloads via authenticated `fetch` (session token + embedded `host`/`shop` params). Do not open `/app/api/analytics-export` in a new tab — that drops embedded context and can show `accounts.shopify.com refused to connect`.

---

## Testing billing locally

1. Use a **development store**.
2. Install the app and open **Analytics** → **Start Pro trial**.
3. Approve the test subscription in Shopify admin.
4. Confirm Analytics loads and **Export CSV** downloads.

No real charge on dev stores when test mode is active.
