# Wishlist Pro

Wishlist Pro is a Shopify embedded app and theme extension that gives merchants
an easy way to add wishlist functionality to their storefront.

It includes:

- An embedded admin dashboard for setup, diagnostics, and testing
- Theme extension blocks for product pages, product cards, and a wishlist page
- Customer metafield storage using `wishlist.items`
- Merchant controls for guest wishlist or login-only wishlist

## Documentation

- Product guide: [docs/WISHLIST_PRO_GUIDE.md](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/docs/WISHLIST_PRO_GUIDE.md)
- Local setup: [WISHLIST_SETUP.md](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/WISHLIST_SETUP.md)

## Quick Start

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Useful Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Main App Files

- Embedded dashboard: [app/routes/app._index.jsx](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app._index.jsx)
- Public login page: [app/routes/_index/route.jsx](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/_index/route.jsx)
- Dashboard styles: [app/styles/app-index.module.css](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/styles/app-index.module.css)
- Theme extension styles: [extensions/wishlist-theme/assets/wishlist.css](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/assets/wishlist.css)
