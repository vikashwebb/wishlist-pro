# Wishlist Pro — Pricing & billing

## Plans (Option A)

| Plan | Price | Includes |
|------|--------|----------|
| **Free** | $0 | Product/collection wishlist buttons, guest wishlist, wishlist page, theme styling |
| **Pro** | **$5.99 USD / month** (7-day trial) | Analytics, **CSV export**, login-only storefront mode |

Billing uses Shopify’s [Billing API](https://shopify.dev/docs/apps/launch/billing). Charges appear on the merchant’s Shopify invoice.

---

## Where pricing is configured

### 1. In this codebase

| File | Purpose |
|------|---------|
| [`app/billing.constants.js`](../app/billing.constants.js) | Plan name (`PRO`), price ($5.99), trial (7 days) |
| [`app/billing.server.js`](../app/billing.server.js) | Pro subscription checks and upgrade URLs |
| [`app/shopify.server.js`](../app/shopify.server.js) | `billing` block passed to `shopifyApp()` |
| [`app/routes/app.billing.jsx`](../app/routes/app.billing.jsx) | “Start Pro trial” → Shopify approval URL (GET loader) |
| [`app/routes/app.api.analytics-export.jsx`](../app/routes/app.api.analytics-export.jsx) | Pro-only CSV download |
| [`app/routes/app.analytics.jsx`](../app/routes/app.analytics.jsx) | Analytics gated to Pro; upgrade UI |

To change price or trial, edit `PRO_PLAN_PRICE` in `app/billing.constants.js` and redeploy the app.

### 2. Shopify Partner Dashboard (App Store listing)

For a **public App Store** listing, pricing must also match in Partner Dashboard:

1. [partners.shopify.com](https://partners.shopify.com) → **Apps** → **Wishlist Pro**
2. **Distribution** → **Shopify App Store** (or your distribution channel)
3. **Pricing** (or **Listing** → **Pricing details**)

Set plans that align with Free + Pro $5.99/mo so the store listing matches what the Billing API charges.

### 3. What merchants see

- **Free:** Full app except Analytics (upgrade screen) and login-only toggle (blocked with message).
- **Pro:** Analytics page + **Export CSV** button + login-only mode in Storefront workspace.
- Upgrade: **Analytics** → **Start Pro trial** → Shopify-hosted approval page.

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

4. **Open the app from Shopify Admin** — Apps → Wishlist Pro (not only the tunnel URL in a new tab).

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

## Testing billing locally

1. Use a **development store**.
2. Install the app and open **Analytics** → **Start Pro trial**.
3. Approve the test subscription in Shopify admin.
4. Confirm Analytics loads and **Export CSV** downloads.

No real charge on dev stores when test mode is active.
