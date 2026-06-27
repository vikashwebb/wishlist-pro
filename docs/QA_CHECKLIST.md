# WishMe — Full feature test checklist

Use this before shipping or after any big change.  
**Best order:** local dev store first → then Vercel (if you deploy there).

---

## 0. Automated checks (2 minutes)

From project root:

```bash
npm install
npm run setup
npm run test:predeploy
```

Or run steps separately:

```bash
npm run test
npm run typecheck
```

Expected: all tests pass, no TypeScript errors.

---

## 1. Prerequisites

- [ ] Shopify **development store** with at least **2 products** and **1 customer**
- [ ] App installed on that store
- [ ] **Protected customer data** approved in Partner Dashboard (for metafields / analytics)
- [ ] Local: `shopify app dev` running **or** Vercel deployed with env vars set

### Env vars (local `.env` or Vercel)

| Variable | Example |
|----------|---------|
| `SHOPIFY_APP_URL` | `https://wishlist-pro-new.vercel.app` (no trailing `/`) |
| `SHOPIFY_API_KEY` | Partner Dashboard client ID |
| `SHOPIFY_API_SECRET` | Partner Dashboard client secret |
| `SCOPES` | Same as `shopify.app.toml` |

Local only: run `npm run setup` so `.data/dev.sqlite` exists.

---

## 2. Install & open admin app

| # | Test | Pass? |
|---|------|-------|
| 2.1 | Open app from **Shopify Admin → Apps → WishMe** (not only the raw Vercel URL) | ☐ |
| 2.2 | Home dashboard loads (command center, progress %) | ☐ |
| 2.3 | Nav works: Home, Smart Setup, Smart Alerts, Insights, Plan, Help | ☐ |

---

## 3. Smart Setup (`/app/configure`)

| # | Test | Pass? |
|---|------|-------|
| 3.1 | **Storefront** tab — metafield check runs (Pro) | ☐ |
| 3.2 | **Storefront** tab — save rules, wishlist page status | ☐ |
| 3.3 | **Theme** tab — embed deep link + enabled detection | ☐ |
| 3.4 | **Health & QA** tab — QA lab add/remove (Pro) | ☐ |

---

## 4. Smart Alerts (`/app/automations`)

| # | Test | Pass? |
|---|------|-------|
| 4.1 | Toggle Smart Recovery / Price / Restock settings save | ☐ |
| 4.2 | Stats show pending/tagged counts (Pro) | ☐ |
| 4.3 | Open Shopify Email link works | ☐ |

---

## 5. Legacy redirects

| # | Test | Pass? |
|---|------|-------|
| 5.1 | `/app/storefront` → Smart Setup `#storefront` | ☐ |
| 5.2 | `/app/theme` → Smart Setup `#theme` | ☐ |
| 5.3 | `/app/setup` → Smart Setup `#health-qa` | ☐ |
| 5.4 | `/app/pricing` → `/app/plan` | ☐ |

---

## 6. Theme extension (storefront)

Deploy extension if needed: `npm run deploy` (or `shopify app deploy`).

### Theme editor

| # | Test | Pass? |
|---|------|-------|
| 6.1 | Enable **Wishlist product cards** embed (if using collection hearts) | ☐ |
| 6.2 | Add **Product wishlist button** block on product template | ☐ |
| 6.3 | Change **Icon** (heart / bookmark / star) — saves and shows on storefront | ☐ |
| 6.4 | Change colors / button style (outline, solid, icon-only) | ☐ |

### Product page (guest mode)

| # | Test | Pass? |
|---|------|-------|
| 6.5 | Logged **out** — click **Add to Wishlist** — button toggles / shows added | ☐ |
| 6.6 | Refresh page — item still “saved” (localStorage) | ☐ |
| 6.7 | Open **wishlist page** — saved product appears (or after login sync, see 6.9) | ☐ |

### Guest → login sync

| # | Test | Pass? |
|---|------|-------|
| 6.8 | As guest, save 1–2 products | ☐ |
| 6.9 | **Log in** or create account | ☐ |
| 6.10 | Wishlist syncs to customer metafield — items on wishlist page when logged in | ☐ |
| 6.11 | Same items visible if you log in on another browser (metafield, not only local) | ☐ |

### Collection / product cards

| # | Test | Pass? |
|---|------|-------|
| 6.12 | Collection page — wishlist control on product cards | ☐ |
| 6.13 | Toggle save on card — state updates | ☐ |

### Login-only mode (Pro only)

| # | Test | Pass? |
|---|------|-------|
| 6.14 | Enable login-only in admin | ☐ |
| 6.15 | Logged out — wishlist button prompts login or does not save | ☐ |
| 6.16 | Logged in — save works normally | ☐ |

---

## 7. Analytics (Pro)

| # | Test | Pass? |
|---|------|-------|
| 7.1 | **Free plan** — Analytics shows upgrade screen (not full charts) | ☐ |
| 7.2 | **Start Pro trial** — opens Shopify charge approval (not stuck on “Handling response”) | ☐ |
| 7.3 | Approve test charge on dev store | ☐ |
| 7.4 | Return to admin — Analytics shows charts (adoption, activity, top products) | ☐ |
| 7.5 | **Export CSV** — downloads file with customers + products | ☐ |

---

## 8. Billing

| # | Test | Pass? |
|---|------|-------|
| 8.1 | `/app/billing` only used via “Start Pro trial” link (GET, not form POST) | ☐ |
| 8.2 | After approve, URL is `admin.shopify.com/store/.../apps/...` (not `accounts.shopify.com` in iframe error) | ☐ |
| 8.3 | `billing.check` — Pro features unlock (analytics + export + login-only) | ☐ |

---

## 9. App proxy (technical)

On storefront, network tab should show successful calls to:

| Route | Purpose |
|-------|---------|
| `/apps/wishlist-proxy/wishlist/config` | Store rules |
| `/apps/wishlist-proxy/wishlist/status` | Is product saved? |
| `/apps/wishlist-proxy/wishlist/toggle` | Add/remove |
| `/apps/wishlist-proxy/wishlist/sync` | Guest → customer merge |

| # | Test | Pass? |
|---|------|-------|
| 9.1 | Config returns `requireLogin` matching admin setting | ☐ |
| 9.2 | Toggle returns 200 (not 404/500) | ☐ |
| 9.3 | Sync runs once after login (no infinite loop) | ☐ |

---

## 10. Webhooks

| # | Test | Pass? |
|---|------|-------|
| 10.1 | Uninstall app on test store — no crash; session cleaned up | ☐ |
| 10.2 | Reinstall — OAuth and app load work again | ☐ |

---

## 11. Vercel-specific (`https://wishlist-pro-new.vercel.app`)

| # | Test | Pass? |
|---|------|-------|
| 11.1 | Partner **App URL** = `https://wishlist-pro-new.vercel.app` | ☐ |
| 11.2 | Redirect URL = `https://wishlist-pro-new.vercel.app/auth/callback` | ☐ |
| 11.3 | All Vercel env vars set (see section 1) | ☐ |
| 11.4 | App opens from **Admin → Apps** (embedded) | ☐ |
| 11.5 | **Note:** SQLite on Vercel is unreliable — OAuth/sessions may fail until you add **MySQL** | ☐ |

For serious production testing on Vercel, use **Railway MySQL** + `DATABASE_URL` on Vercel.

---

## 12. Quick smoke test (15 min)

Minimum path if you're short on time:

1. `npm run test` ✅  
2. Install app → open Home → Setup QA add/remove ✅  
3. Publish wishlist page ✅  
4. Theme: add product button ✅  
5. Storefront: guest save → login → wishlist page ✅  
6. Analytics: upgrade → approve → charts + CSV export ✅  

---

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| `accounts.shopify.com refused to connect` | Open app from Admin; fix billing return URL; don't OAuth inside iframe |
| `readonly database` | Run `npm run setup`; use `.data/dev.sqlite` |
| Analytics empty | Approve protected customer data; need customers with metafield saves |
| Proxy 404 | App not installed; wrong `application_url`; app proxy not deployed |
| Vercel auth breaks | No persistent DB — add MySQL |

---

## Sign-off

| Environment | Tester | Date | Result |
|-------------|--------|------|--------|
| Local dev store | | | ☐ Pass / ☐ Fail |
| Vercel production | | | ☐ Pass / ☐ Fail |

Notes:

_______________________________________________
