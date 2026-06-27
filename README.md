# WishMe

**WishMe** is the merchant-facing brand for this Shopify embedded app and theme extension (repo: `wishlist-pro`). It gives merchants an easy way to add wishlist functionality to their storefront.

It includes:

- An embedded admin dashboard for setup, diagnostics, and testing
- Theme extension blocks for product pages, product cards, and a wishlist page
- Customer metafield storage using `wishlist.items`
- Merchant controls for guest wishlist or login-only wishlist

## Documentation

- Product guide: [docs/WISHLIST_PRO_GUIDE.md](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/docs/WISHLIST_PRO_GUIDE.md)
- Local setup: [WISHLIST_SETUP.md](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/WISHLIST_SETUP.md)
- **Full QA checklist:** [docs/QA_CHECKLIST.md](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/docs/QA_CHECKLIST.md)

## Quick Start

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Sessions and shop settings are stored in `.data/dev.sqlite` (no external database required for local dev).

## Useful Commands

```bash
npm run dev
npm run test
npm run typecheck
npm run lint
npm run build
```

`npm run build` automatically runs tests and typecheck first.

## Main App Files

- Embedded dashboard: [app/routes/app._index.jsx](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app._index.jsx)
- Public login page: [app/routes/_index/route.jsx](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/_index/route.jsx)
- Dashboard styles: [app/styles/app-index.module.css](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/styles/app-index.module.css)
- Theme extension styles: [extensions/wishlist-theme/assets/wishlist.css](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/assets/wishlist.css)
