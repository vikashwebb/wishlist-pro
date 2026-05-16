# Local Shopify Wishlist Setup

## 1. Prerequisites

- Install Node.js 20 or 22.
- Install Shopify CLI: `npm install -g @shopify/cli @shopify/app`.
- Log in to Shopify CLI: `shopify auth login`.
- Create or pick a Shopify development store with at least one customer and one product.

## 2. Install and configure the app

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

Create `.env` values through the CLI when prompted by:

```bash
npm run dev
```

This project already uses:

- Embedded app mode
- Shopify CLI Cloudflare tunnel
- Prisma session storage for OAuth sessions
- Admin API auth through `authenticate.admin`

## 3. `shopify.app.toml`

The app now uses the scopes required for a customer-metafield wishlist:

```toml
client_id = "YOUR_CLIENT_ID"
name = "wishlist-pro"
application_url = "https://example.com"
embedded = true

[build]
automatically_update_urls_on_dev = true
include_config_on_deploy = true

[access_scopes]
scopes = "read_customers,write_customers,read_products,write_app_proxy,write_online_store_pages,read_themes"

[auth]
redirect_urls = ["https://example.com/auth/callback"]
```

Notes:

- During `shopify app dev`, Shopify CLI replaces `application_url` and redirect URLs with the live tunnel URL.
- Because `embedded = true`, the app opens inside the Shopify admin iframe.
- If scopes change, uninstall and reinstall the app on the development store.

## 4. Run locally

Use either command:

```bash
shopify app dev
```

or:

```bash
npm run dev
```

Expected local flow:

1. Shopify CLI creates a Cloudflare tunnel.
2. Shopify CLI syncs the tunnel URL into your partner app config.
3. The CLI shows an install preview URL.
4. Open the app from the connected development store admin.

## 5. OAuth and session storage

This app already uses Shopify's default React Router flow:

- [`app/shopify.server.js`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/shopify.server.js)
- [`app/routes/auth.$.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/auth.$.jsx)
- [`prisma/schema.prisma`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/prisma/schema.prisma)

What matters:

- `authenticate.admin(request)` handles install/auth/session validation.
- Prisma stores offline and online sessions in SQLite.
- The OAuth callback path is `/auth/callback`.

## 6. Wishlist API route

The new route is:

- [`app/routes/app.api.wishlist.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app.api.wishlist.jsx)

Behavior:

- `GET /app/api/wishlist?customerId=gid://shopify/Customer/...`
  - Reads `wishlist.items`
  - Returns `[]` if the metafield is missing or empty
- `POST /app/api/wishlist`
  - Accepts `customerId`, `productId`, `intent`
  - Deduplicates product GIDs
  - Saves JSON with `metafieldsSet`
  - Logs GraphQL responses to the server console

## 7. GraphQL examples

Read the customer metafield:

```graphql
query WishlistMetafield($customerId: ID!, $namespace: String!, $key: String!) {
  customer(id: $customerId) {
    id
    metafield(namespace: $namespace, key: $key) {
      id
      type
      value
      jsonValue
      updatedAt
    }
  }
}
```

Write the wishlist:

```graphql
mutation WishlistMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      type
      value
      jsonValue
      updatedAt
    }
    userErrors {
      field
      message
      code
    }
  }
}
```

Mutation variables:

```json
{
  "metafields": [
    {
      "ownerId": "gid://shopify/Customer/1234567890",
      "namespace": "wishlist",
      "key": "items",
      "type": "json",
      "value": "[\"gid://shopify/Product/111\",\"gid://shopify/Product/222\"]"
    }
  ]
}
```

## 8. Frontend test UI

The embedded test page is:

- [`app/routes/app._index.jsx`](/Users/dinesh/Documents/shopfiy-apps/wishlist-pro/app/routes/app._index.jsx)

It includes:

- Customer selector
- Product selector
- `Add to Wishlist` / `Remove from Wishlist` toggle
- `Reload from Shopify` button
- `fetcher.load()` for reads
- `fetcher.submit()` for writes
- direct customer-metafield reads and writes
- 300ms debounce before saving

The embedded app also includes a saved storefront setting for whether wishlist
actions require a logged-in customer first.

The theme extension storefront buttons also use the app proxy routes as the
primary path now. When a shopper is logged out, wishlist selections are stored
in browser local storage. The next time that shopper loads the storefront while
logged in, the guest wishlist is synced into the customer metafield and the
guest cache is cleared. The old customer-specific local cache is still kept as a
fallback when protected customer data access is unavailable.

The theme extension also includes a `Wishlist page` block that can be added to a
page template to render the current shopper's saved wishlist products.

## 9. Local testing flow

1. Run `npm run dev`.
2. Install the app on the dev store if prompted.
3. Open the embedded app in Shopify admin.
4. Select a customer.
5. Select a product.
6. Click `Add to Wishlist`.
7. Confirm the saved product GID appears in the JSON state panel.
8. Reload from Shopify or refresh the page.
9. Confirm the product still exists in `wishlist.items`.
10. Click `Remove from Wishlist` and verify it is removed after refresh.

## 10. Common errors and fixes

- `Customer not found for ownerId ...`
  - The `customerId` is wrong or the app lacks `read_customers`.
- `Access denied`
  - Update scopes in `shopify.app.toml`, then reinstall the app.
- `metafieldsSet userErrors`
  - Check `ownerId`, `type = "json"`, namespace/key spelling, and product/customer GIDs.
- Install redirects loop back to login
  - Confirm the callback is `/auth/callback` and rerun `shopify app dev` so CLI resyncs URLs.
- `main.Session does not exist`
  - Run `npx prisma migrate deploy`.
- No customers or products in the UI
  - Create test data in the development store first.

## 11. Important limitation

This is an embedded admin app. The wishlist is stored on a Shopify customer, but this UI tests the metafield from the admin side. A storefront or customer-account surface still needs a way to identify the active customer before calling a wishlist endpoint for that shopper.
