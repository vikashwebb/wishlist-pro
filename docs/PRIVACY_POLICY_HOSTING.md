# Privacy policy hosting (outside the app)

Shopify’s Partner Dashboard requires a **public privacy policy URL** for your app listing. The Vercel React Router deployment does not reliably serve a standalone `/privacy` page, so host the policy elsewhere and paste that URL into the listing.

## Recommended options (fastest first)

| Option | Effort | URL example | Notes |
|--------|--------|-------------|--------|
| **GitHub Pages** | ~10 min | `https://vikashwebb.github.io/wishlist-pro-privacy/` | Free, stable, good for review. Create a tiny repo with `index.html` or use the template below. |
| **Google Sites** | ~15 min | `https://sites.google.com/view/wishlist-pro-privacy` | No code; paste sections from the template below. |
| **Notion** | ~5 min | Share page → “Publish to web” | Quick draft; use “Public” link in listing. |
| **Your own domain** | Varies | `https://yourdomain.com/wishlist-pro-privacy` | Best long-term if you already have a site. |
| **Termly / iubenda / etc.** | Low | Generated URL | Paid generators; fine if you want legal templates. |

**Do not use:** `https://wishlist-pro-new.vercel.app/privacy` — that path is not supported on this stack.

## What to put in Partner Dashboard

1. **Apps** → your app → **Distribution** / **Listing** → **Privacy policy URL**
2. Use the hosted URL from one of the options above
3. **Support email:** `iamvkumarwork@gmail.com` (or your business email)

## Policy text template

Copy into Notion, Google Docs, or an `index.html` page. Set **Last updated** when you change it.

---

**Privacy Policy — Wishlist Pro**  
*Last updated: May 30, 2026*

Wishlist Pro (“we”, “our”, or “the app”) is a Shopify application that helps merchants offer wishlist functionality on their storefront. This policy explains what information the app processes and how that information is used.

### Information we process

When you install Wishlist Pro, we process information needed to operate the app, including:

- Your shop domain and staff session data required to authenticate with Shopify
- App configuration you set in the admin, such as guest or login-only wishlist mode and wishlist page settings
- Subscription and billing status through Shopify’s billing system when you choose a paid plan

### Shopper and customer data

When shoppers use the wishlist on your storefront:

- Saved products for logged-in customers are stored on Shopify customer records using the customer metafield `wishlist.items`
- Guest wishlist items may be stored in the shopper’s browser until they log in and items are synced to their customer account
- Product identifiers needed to add or remove wishlist items are processed when shoppers interact with wishlist buttons or the wishlist page

### How we use information

We use this information only to:

- Provide wishlist functionality on your storefront
- Run app setup, diagnostics, and merchant testing tools
- Show wishlist analytics and exports you access in the admin app
- Maintain app security, reliability, and billing where applicable

### Where data is stored

Wishlist product data for logged-in customers is stored on Shopify. App session data and shop settings are stored in our application infrastructure. We do not sell merchant or customer data.

### Sharing with service providers

We use service providers needed to host and operate the app, such as cloud hosting and database services. These providers process data on our behalf to deliver the app. We may also share information when required by law.

### Data retention

We retain app data while Wishlist Pro is installed on your store. When you uninstall the app, we delete app-specific data in line with our retention practices and Shopify’s requirements. Customer wishlist metafields on Shopify remain under your control as the merchant.

### Your choices

Merchants may uninstall the app at any time from Shopify admin. You may contact us with privacy questions or requests related to data we control.

### Changes to this policy

We may update this policy from time to time. The “Last updated” date at the top of this page will reflect changes. Continued use of the app after an update means you accept the revised policy.

### Contact

Questions about this policy: **iamvkumarwork@gmail.com**

---

## Minimal GitHub Pages setup

1. Create repo `wishlist-pro-privacy` (public).
2. Add `index.html` with the sections above (basic HTML is enough).
3. **Settings** → **Pages** → Source: `main` branch → `/ (root)`.
4. Use `https://<username>.github.io/wishlist-pro-privacy/` in the Partner Dashboard.
