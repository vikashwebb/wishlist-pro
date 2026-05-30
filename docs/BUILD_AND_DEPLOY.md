# Build & deploy

## Local production build

From the project root:

```bash
npm ci
npm run build:production
```

This runs:

1. `setup` — SQLite path + `prisma generate` + `prisma migrate deploy`
2. `test` — Vitest (76 tests)
3. `typecheck` — React Router typegen + TypeScript
4. `build:app` — React Router production bundle → `build/`

Start the built app locally:

```bash
npm run start
```

## Local dev (Shopify tunnel)

```bash
npm run setup    # first time or after pulling migrations
shopify app dev
```

`shopify.app.toml` has `automatically_update_urls_on_dev = true` so the admin iframe uses your tunnel URL.

## Deploy to Vercel (hosted app)

1. Connect the Git repo in Vercel.
2. **Build command:** `npm run build:vercel` (set in `vercel.json`).
3. **Install command:** `npm ci`.
4. **Environment variables** (Production):

   | Variable | Example |
   |----------|---------|
   | `SHOPIFY_API_KEY` | Partner Dashboard client ID |
   | `SHOPIFY_API_SECRET` | Client secret |
   | `SCOPES` | `read_customers,write_customers,...` |
   | `SHOPIFY_APP_URL` | `https://wishlist-pro-new.vercel.app` |
   | `DATABASE_URL` | **Required.** `file:/tmp/wishlist-pro.sqlite` (SQLite on Vercel is ephemeral — reinstall app after cold deploys) or a hosted DB URL |
   | `NODE_ENV` | `production` |

5. Redeploy after env changes.

**Privacy policy URL (`/privacy`):** Built as **pre-rendered static HTML** (`build/client/privacy/index.html`) at deploy time. The `/privacy` route skips Shopify/DB in `entry.server.jsx` so prerender succeeds. Set `SUPPORT_EMAIL` on Vercel before deploying. `/privacy.html` is served by the `privacy[.]html.jsx` route at runtime (not pre-rendered, to avoid clashing with static assets).

Partner Dashboard **App URL** and **redirect URL** must match `SHOPIFY_APP_URL` (we use `include_config_on_deploy = false`, so CLI deploy does not overwrite them).

### "Handling response" / app stuck loading

That text is React Router’s **streaming SSR shell** — not a Shopify error. The UI stays there when:

1. **Server loaders fail** — check Vercel **Runtime logs** for `wishlist.db.migrate.error`, Prisma, or missing env vars. `/auth/login` returning **500** usually means `DATABASE_URL` or Shopify env vars are wrong on Vercel.
2. **Sessions lost** — SQLite under `/tmp` on Vercel is wiped on cold starts. Set `DATABASE_URL` and **re-open the app from Shopify Admin** (or reinstall) after each deploy until you use a persistent database.
3. **URL mismatch** — `SHOPIFY_APP_URL`, Partner Dashboard App URL, and redirect URL must all be the same host (e.g. `https://wishlist-pro-new.vercel.app`).
4. **Stale deploy** — redeploy after pulling so `react-router.config.ts` (`routeDiscovery: initial` + `@vercel/react-router` preset) is in the built bundle. New public routes like `/privacy` require a fresh Vercel deploy after merging.
5. **Pro trial** — use **Start Pro trial** → `/app/billing` (full page load), not a form POST inside the iframe.

## Deploy Shopify app + theme extension

Full clean deploy (local):

```bash
npm run deploy:production
```

This deletes `node_modules` and `build`, reinstalls, runs `build:production`, then `shopify app deploy`.

Theme-only or app-only:

```bash
shopify app deploy
```

## Theme extension note

`shopify app dev` may report **AssetSizeAppBlockJavaScript** if `wishlist-pdp.js` or `wishlist-product-cards.js` exceed 10 KB. That affects theme extension validation, not the React Router `npm run build`.
