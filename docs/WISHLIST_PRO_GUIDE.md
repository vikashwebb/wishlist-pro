# Wishlist Pro Guide

## Overview

Wishlist Pro is a Shopify embedded app plus theme extension that lets merchants
offer a wishlist experience on the storefront.

The project includes:

- An embedded Shopify admin app for setup, diagnostics, and testing
- Theme extension blocks and assets for product-page and product-card wishlist actions
- A wishlist page surface for shoppers to review saved products
- Customer metafield storage using `wishlist.items`

## What The App Does

Wishlist Pro helps merchants:

- Let shoppers save products for later
- Control whether guests can use wishlist or only logged-in customers
- Create a dedicated wishlist page
- Verify metafield and customer-data access
- Test add and remove actions from the admin app

Wishlist data is stored on the Shopify customer metafield:

- Namespace: `wishlist`
- Key: `items`
- Type: `json`

Older dev builds used `wishlist_pro.items`. The app still reads that legacy
namespace and migrates items to `wishlist.items` automatically.

## Main User Experience

### Public login page

The public app entry page is designed to feel more polished and product-led.

It includes:

- A short value proposition
- A merchant login panel
- A simple feature summary

Files:

- [`app/routes/_index/route.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/_index/route.jsx)
- [`app/routes/_index/styles.module.css`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/_index/styles.module.css)

### Embedded admin dashboard

The embedded dashboard is the main merchant workspace.

It includes:

- A setup summary hero
- Storefront preference controls
- Wishlist page creation
- Setup checklist
- Connection health checks
- Wishlist test actions
- Current wishlist snapshot

Files:

- [`app/routes/app._index.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app._index.jsx)
- [`app/styles/app-index.module.css`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/styles/app-index.module.css)

## Storefront Features

The theme extension includes storefront wishlist functionality for:

- Product detail pages
- Product cards
- Wishlist page rendering
- Guest wishlist caching and sync

Important files:

- [`extensions/wishlist-theme/assets/wishlist.css`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/assets/wishlist.css)
- [`extensions/wishlist-theme/assets/wishlist-pdp.js`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/assets/wishlist-pdp.js)
- [`extensions/wishlist-theme/assets/wishlist-product-cards.js`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/assets/wishlist-product-cards.js)
- [`extensions/wishlist-theme/assets/wishlist-page.js`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/assets/wishlist-page.js)

Theme blocks:

- [`extensions/wishlist-theme/blocks/pdp-wishlist-button.liquid`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/blocks/pdp-wishlist-button.liquid)
- [`extensions/wishlist-theme/blocks/wishlist-product-cards.liquid`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/blocks/wishlist-product-cards.liquid)
- [`extensions/wishlist-theme/blocks/wishlist-page.liquid`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/blocks/wishlist-page.liquid)

## Add The Wishlist Button On The Product Details Page

The product-page wishlist button is already available as a theme app block.

Block file:

- [`extensions/wishlist-theme/blocks/pdp-wishlist-button.liquid`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/extensions/wishlist-theme/blocks/pdp-wishlist-button.liquid)

What it does:

- Renders an `Add to Wishlist` button on product templates
- Connects the button to the wishlist proxy routes
- Supports guest mode or login-required mode
- Uses the product's Shopify admin GraphQL product ID and handle

How to add it in Shopify:

1. Open Shopify Admin.
2. Go to `Online Store` > `Themes`.
3. Click `Customize` on the active theme.
4. Open a product template.
5. In the product information section, click `Add block`.
6. Choose the app block named `Wishlist button`.
7. Place it where you want on the product details page.
8. Save the theme.

How to add it from the app for JSON themes:

1. Open the embedded Wishlist Pro dashboard.
2. Go to the `Product page button` section.
3. Click `Add app block for JSON themes`.
4. Shopify opens the product template in Theme Editor and pre-adds the app
   block in the Apps section.
5. Review the placement and save the theme.

If the theme uses a liquid product template:

1. Open the embedded Wishlist Pro dashboard.
2. Go to the `Product page button` section.
3. Click `Activate embed for liquid themes`.
4. Shopify opens `Theme settings` > `App embeds`.
5. Enable the `Product page button` embed and save the theme.

Available block settings:

- `Add label`
- `Added label`
- `Logged out helper text`
- `Button style`
- `Accent color`
- `Text color`
- `Icon color`
- `Optional custom target selector`

Notes:

- The block is enabled only for product templates.
- It loads `wishlist.css` and `wishlist-pdp.js` automatically.
- If the store requires login for wishlist, the button will guide logged-out
  shoppers to sign in.
- Shopify doesn't silently publish app blocks after install. The app can start
  the Theme Editor flow, but the merchant still needs to save the theme.
- App blocks need JSON templates and sections that support `@app`.
- The product-page app embed is the fallback for liquid themes that don't
  support app blocks on the product template.

## Data Model

### Customer wishlist data

Wishlist items are stored as product GIDs in a customer metafield JSON array.

Example:

```json
["gid://shopify/Product/1111111111111", "gid://shopify/Product/2222222222222"]
```

### Shop settings

The app also stores merchant preferences in the local database.

Current setting:

- `wishlistRequiresLogin`

Button appearance is configured in theme app block settings. The app database
only stores storefront rules and wishlist page settings.

Related file:

- [`app/models/shop-settings.server.js`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/models/shop-settings.server.js)

## API Routes

### Wishlist API

Route:

- [`app/routes/app.api.wishlist.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app.api.wishlist.jsx)

Behavior:

- `GET /app/api/wishlist?customerId=...` reads the selected customer's wishlist
- `POST /app/api/wishlist` adds or removes a product from the wishlist

### Diagnostics API

Route:

- [`app/routes/app.api.wishlist-check.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app.api.wishlist-check.jsx)

Behavior:

- Checks whether the metafield definition exists
- Confirms customer access status
- Checks whether the selected customer already has wishlist data

### Settings API

Route:

- [`app/routes/app.api.settings.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app.api.settings.jsx)

Behavior:

- Saves storefront login requirement preferences only

### Wishlist page API

Route:

- [`app/routes/app.api.wishlist-page.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app.api.wishlist-page.jsx)

Behavior:

- Creates or updates the Shopify page at `/pages/wishlist`

## Setup Flow

### Prerequisites

- Node.js 20 or 22
- Shopify CLI installed
- A Shopify development store
- At least one test customer
- At least one test product

### Local install

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

### Merchant setup steps

1. Install the app on the development store.
2. Create the customer metafield definition `wishlist.items` with type `json`.
3. Open the embedded app dashboard.
4. Save storefront preference for guest access or login-only access.
5. Run the setup check.
6. Create the wishlist page.
7. Test add and remove behavior.

## Dashboard Sections

### 1. Storefront preferences

Lets the merchant choose whether wishlist actions require login.

### 2. Wishlist page

Lets the merchant create and open the storefront wishlist page.

Note:

- The storefront page button should open the real store URL, not an embedded
  app route.

### 3. Setup checklist

Shows the core preparation steps for merchants before testing.

### 4. Connection health

Helps the merchant understand:

- Whether the metafield definition exists
- Whether customer access is approved
- Whether wishlist data exists for the selected customer

### 5. Wishlist test

Lets the merchant simulate add and remove actions for a selected product.

### 6. Current snapshot

Shows:

- Selected customer
- Selected product
- Saved item count
- Saved wishlist product list

## Design Notes

The recent design update focused on making the app feel:

- More elegant
- More merchant-friendly
- Less technical
- Easier to scan

Main design decisions:

- Replace placeholder marketing copy with real product messaging
- Use stronger visual hierarchy in the dashboard
- Group related actions into clear surfaces
- Reduce noisy warnings and present status more calmly
- Keep the existing functionality while improving clarity

## Known Requirements

- The app must have the correct Shopify scopes for customer and page access
- If scopes change, the app should be reinstalled on the store
- Protected customer data approval may be required before customer metafield
  reads and writes work fully

## Verification

Automated tests run before every production build via `prebuild`.

Useful commands:

```bash
npm run test
npm run test:watch
npm run typecheck
npm run lint
npm run build
```

Test files live in `tests/` and cover metafield helpers, guest sync parsing, shop
settings, admin wishlist API behavior, and proxy guest-to-customer sync flows.
Storefront browser flows still need manual QA on a development store.

## Related Docs

- [`README.md`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/README.md)
- [`WISHLIST_SETUP.md`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/WISHLIST_SETUP.md)
