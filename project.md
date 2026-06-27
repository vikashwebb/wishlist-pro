# WishMe — Project & App Store Kit

Use this document for **marketing copy**, **App Store listing**, **promo graphics**, **screenshot planning**, and **pitch decks**. Update placeholders marked `[YOUR_…]` before publishing.

---

## 1. Product snapshot

| Field | Value |
|--------|--------|
| **App name** | WishMe |
| **Subtitle (listing)** | AI-powered wishlist with smart recovery, price drop & restock alerts |
| **Category** | Store design · Customer engagement · Conversion |
| **Platform** | Shopify (Online Store 2.0 + theme extension) |
| **Merchant promise** | Turn saved products into sales—guest wishlists, Smart Alerts, and Shopify Email recovery. |
| **Shopper promise** | Tap to save on product pages, collections, and a dedicated wishlist page; get alerts when prices drop or items restock. |
| **Data model** | Customer metafield `wishlist.items` (JSON product list with save-time price)—not a heavy external wishlist database. |
| **Architecture** | Lightweight theme extension + small app backend (OAuth, app proxy sync, Smart Alerts webhooks). |

---

## 2. Brand & positioning

### One-line pitch

**WishMe** helps Shopify merchants add a fast, theme-native wishlist with **Smart Alerts**—guest saves, login sync, and Shopify Email recovery when shoppers do not buy.

### Short taglines (pick one for hero / banner)

1. Save now. Buy later. Sync when they sign in.
2. The lightweight wishlist built for modern Shopify themes.
3. Guest wishlists that become real customer lists—automatically.
4. Wishlist power for your storefront, without the bloat.
5. Help shoppers remember what they love.

### Long tagline (subtitle under logo)

Turn browsing into intent: let guests save favorites instantly, then merge their wishlist into their customer profile the moment they log in.

### Positioning vs alternatives

| Theme | WishMe |
|--------|----------------|
| **Speed** | Most logic runs in the theme extension; sync is a single lightweight API call after login. |
| **Simplicity** | No complex merchant catalog to learn—setup checklist + theme blocks. |
| **Trust** | Wishlist data lives in **Shopify customer metafields** (merchant-owned, exportable via Shopify). |
| **Flexibility** | Guest mode or login-only; block or embed for any theme. |

### Target merchants

- Fashion, home, gifts, beauty, hobby stores
- Merchants on **Online Store 2.0** themes (Dawn, Refresh, custom JSON templates)
- Stores that want **save-for-later** without building custom wishlist code
- Brands focused on **return visits** and **logged-in customers**

### Target shoppers

- Browsers who aren’t ready to buy yet
- Registered customers building a personal save list
- Mobile shoppers comparing products across sessions

---

## 3. Core features (merchant-facing)

Use these as App Store bullets, website features, and screenshot captions.

### Storefront

- **Product page wishlist button** — App block (or auto-insert embed for legacy liquid themes).
- **Collection / product card hearts** — “Wishlist product cards” block for grids and carousels.
- **Dedicated wishlist page** — `/pages/wishlist` (handle configurable) with product grid, empty states, remove actions.
- **Guest wishlist** — Saves in browser storage for speed; no account required (optional).
- **Login sync** — After sign-in, guest items merge into the customer metafield via app proxy.
- **Login-only mode** — Merchant can require accounts before saving (merchant setting).
- **Theme customization** — Labels, colors, button style (outline / solid / icon-only) in theme editor.

### Admin app

- **Home** — Wishlist command center with launch progress and health overview.
- **Smart Setup** — Storefront rules, theme embed/block placement, Health & QA (Pro).
- **Smart Alerts** — Smart Recovery, Smart Price Alerts, Smart Restock Alerts (Growth tier; Shopify Email tags/segments).
- **Insights** — Adoption donut, 14-day activity trend, wishlist size distribution, top products & customers.
- **Plan** — Starter (free), Pro (Insights + Health & QA), Growth (all Smart Alerts).
- **Help** — FAQ, contact, developer API docs.

### Technical trust (for FAQ / footer — keep simple)

- Data stored on **Shopify customers** (`wishlist.items` metafield).
- Works with **app proxy** for secure storefront API calls.
- **Theme extension** ships with the app (`shopify app deploy`).

---

## 4. How it works (for diagrams & explainer graphics)

### Guest → login flow (best visual for promo)

```text
1. Guest taps "Add to Wishlist" on PDP
      → saved in browser (localStorage)

2. Guest browses more products, saves more items
      → still local, instant UI feedback

3. Guest logs in or creates account
      → extension calls /apps/wishlist-proxy/wishlist/sync
      → items written to customer metafield

4. Guest opens /pages/wishlist (or returns later)
      → wishlist loads from metafield
      → same list on any device when logged in
```

### Architecture one-liner (for technical merchants)

**Extension-first UX, Shopify-native storage, minimal server for OAuth and sync.**

---

## 5. App Store listing copy

### App name

`WishMe`

### Subtitle (≤ 62 characters — adjust to fit)

`AI wishlist with smart recovery, price & restock alerts`

### Short description (promo card / search snippet)

Let customers save products from product pages and collections. Smart Alerts watch wishlists, prices, and inventory—then trigger Shopify Email at the right time. Guests save instantly; logged-in shoppers keep their list in Shopify.

### Long description (listing body — edit tone as needed)

**Help shoppers save what they love—and come back to buy.**

WishMe adds a modern wishlist to your Shopify storefront without custom theme development. Shoppers can save products from the product page, product cards, and a dedicated wishlist page you control.

**Smart Alerts turn saves into sales**
- **Smart Recovery** — Remind shoppers who saved but did not buy (Shopify Email tags).
- **Smart Price Alerts** — Notify wishlisters when a saved product price drops.
- **Smart Restock Alerts** — Alert shoppers when out-of-stock favorites are back.

**Built for speed**
Most interactions happen in your theme extension for instant feedback. When a guest creates an account or signs in, their saved items sync to their customer profile automatically.

**Flexible for your brand**
- Enable **guest wishlists** for maximum adoption, or require **login** for a members-only experience.
- Customize button labels, colors, and styles in the theme editor.
- Use the **app block** on Online Store 2.0 themes, or the **app embed** fallback for older product templates.

**Merchant-friendly setup**
- Guided **Smart Setup**: Storefront, Theme, Health & QA.
- One-click wishlist page publishing.
- Health checks for metafields and customer data access.
- Built-in QA lab to test add/remove before go-live.

**Your data stays in Shopify**
Wishlist items are stored as customer metafields (`wishlist.items`), so your customer data remains in your Shopify admin.

**Perfect for**
Fashion, lifestyle, gifts, beauty, and any store where customers browse before they buy.

Install WishMe, add the theme blocks, enable Smart Alerts, and start turning browsers into return visitors.

### Keywords / search terms (ASO)

`wishlist`, `save for later`, `AI wishlist`, `smart recovery`, `price drop alerts`, `back in stock`, `wishlist automation`, `customer intent`, `guest wishlist`, `shopify wishlist`, `retention`

### Support & legal placeholders

| Item | Placeholder |
|------|-------------|
| **Support email** | `[YOUR_SUPPORT_EMAIL]` |
| **Support URL** | `[YOUR_SUPPORT_URL]` |
| **Privacy policy URL** | `[YOUR_PRIVACY_POLICY_URL]` (required for App Store) |
| **Pricing** | `[FREE / FREE TRIAL / $X/mo]` |

---

## 6. Visual brand guide (for designers)

### Color palette (from app UI)

| Role | Hex | Usage |
|------|-----|--------|
| **Primary green** | `#1d6b59` | Buttons, chart fills, accents |
| **Primary green light** | `#2fa87e` | Gradients, hover |
| **Ink / text** | `#0f172a` | Headlines, body |
| **Warm eyebrow** | `#7c5a31` | Labels, section tags |
| **Background cream** | `#fcfcf8` / `#f7fafc` | Hero panels |
| **Muted text** | `rgb(15 23 42 / 72%)` | Descriptions |
| **Success surface** | `#ecfdf5` | Status pills |
| **Warning surface** | `#fef9c3` | Alerts |

### Typography feel

- Clean, modern sans (Inter on admin; match storefront theme on screenshots).
- Large confident headlines; short supporting lines.
- Avoid dense technical jargon on customer-facing graphics.

### Icon / logo direction

- Motif: **heart**, **bookmark**, or **minimal list + heart**.
- Style: rounded, friendly, works at 64px and 1200px.
- Background: primary green gradient or soft cream card.
- App icon must be **readable at small sizes** (no thin lines).

---

## 7. App Store & marketing image specs

### Required / common Shopify Partner assets

| Asset | Size | Notes |
|--------|------|--------|
| **App icon** | **1200 × 1200 px** | PNG/JPEG, no text smaller than legible at 32px |
| **Feature image / banner** | **1200 × 630 px** or **1600 × 900 px** | Check current Partner listing requirements |
| **Screenshots (desktop)** | **1600 × 900 px** recommended | 3–6 images, consistent browser chrome optional |
| **Screenshots (mobile)** | **1242 × 2688 px** or crop from theme | Optional but strong for fashion/lifestyle |
| **Promo video** | 30–90 sec | Optional; show tap → save → login → wishlist page |

### Safe zones

- Keep headlines and CTAs inside **90% center** (platforms may crop edges).
- Use **high contrast** text on photos; add subtle dark scrim if needed.

---

## 8. Screenshot & promo shot list

Capture on a **clean dev store** with 6–12 products, good photography, and at least one test customer with items in wishlist.

### Screenshot 1 — Hero / value prop

- **Scene:** Split layout — storefront PDP with “Add to Wishlist” + admin home “Your wishlist command center.”
- **Headline overlay:** `Save now. Sync when they sign in.`
- **Subcopy:** `Guest wishlists + Shopify customer storage`

### Screenshot 2 — Product page button

- **Scene:** Product template in Theme Editor or live PDP with wishlist button visible.
- **Headline:** `One-click save on every product page`
- **Callouts:** Custom labels · Outline/solid/icon styles · Color controls

### Screenshot 3 — Collection / product cards

- **Scene:** Collection page with heart/wishlist on multiple cards.
- **Headline:** `Wishlist on collections & grids`

### Screenshot 4 — Wishlist page (shopper)

- **Scene:** `/pages/wishlist` with 3–4 products in grid.
- **Headline:** `A dedicated wishlist page shoppers love`
- **Show:** Product image, title, remove control

### Screenshot 5 — Guest → login story (sequence or collage)

- **Panels:** (A) Guest saves 2 items (B) Login screen (C) Same items on wishlist page after login.
- **Headline:** `Guest saves sync to customer accounts`

### Screenshot 6 — Admin setup checklist

- **Scene:** Setup & QA — “Data health & QA lab” with green status pills.
- **Headline:** `Guided setup—not guesswork`

### Screenshot 7 — Analytics

- **Scene:** Analytics page with donut + activity chart + top products.
- **Headline:** `See what shoppers save most`

### Screenshot 8 — Theme placement

- **Scene:** Theme workspace + Theme Editor app embeds enabled.
- **Headline:** `Works with Online Store 2.0 themes`

### Optional lifestyle / brand image (no UI)

- Flat lay of products with subtle heart icon overlay.
- Use for social ads or feature banner background.

---

## 9. Promo copy per image (overlay text bank)

| # | Headline | Subtext |
|---|----------|---------|
| 1 | WishMe | Save what you love. Smart sync. |
| 2 | Add to Wishlist | On every product page |
| 3 | Save from collections | Hearts on product cards |
| 4 | Their wishlist page | All saved products in one place |
| 5 | Guests welcome | Lists follow them after login |
| 6 | Setup in minutes | Checklist + health checks |
| 7 | Know your top saves | Wishlist analytics built in |
| 8 | Theme-native | Blocks & embeds for any theme |

---

## 10. Feature comparison table (for landing page)

| Capability | WishMe |
|------------|:------------:|
| Product page button | ✅ |
| Collection/card saves | ✅ |
| Dedicated wishlist page | ✅ |
| Guest wishlist | ✅ (optional) |
| Sync after login | ✅ |
| Login-only mode | ✅ |
| Theme editor styling | ✅ |
| Customer metafield storage | ✅ |
| Admin setup checklist | ✅ |
| Wishlist analytics | ✅ |
| Built-in merchant QA | ✅ |

---

## 11. Merchant setup (for “Install in 5 minutes” graphic)

```text
1. Install WishMe
2. Approve customer data access (Partner Dashboard)
3. Publish wishlist page (Storefront workspace)
4. Enable theme app embeds + add product block (Theme workspace)
5. Confirm placement → test with QA lab
```

---

## 12. Theme extension reference (accurate names for docs/screenshots)

| Merchant-facing name | Type | Where |
|----------------------|------|--------|
| **Product wishlist button** | App block | Product template |
| **Product wishlist (auto)** | App embed | Legacy liquid product templates |
| **Wishlist product cards** | App block | Collection / index templates |
| **Wishlist page** | App block | Page template (optional; app injects page body by default) |

**Default storefront URL:** `/pages/wishlist` (handle configurable in app).

---

## 13. FAQ (App Store & support)

**Where is wishlist data stored?**  
On the Shopify customer record (`wishlist.items` metafield). Guest items are temporarily in the browser until login sync.

**Do guests need an account?**  
Only if you enable “login required.” Otherwise guests can save locally and sync later.

**Does it work on mobile?**  
Yes—the theme extension is responsive; test on iOS Safari and Chrome Android.

**Which themes are supported?**  
Online Store 2.0 JSON templates (app blocks). Older liquid product templates can use the product page embed.

**Why do I need to approve customer data access?**  
Shopify requires approval for apps that read/write customer metafields.

**Will it slow my store?**  
Wishlist actions are optimized for the theme extension; sync runs once per login session when needed.

---

## 14. Social & ad snippets

### Tweet / X (280 chars)

WishMe for @Shopify: let guests save products instantly, sync when they log in, and trigger Smart Alerts when prices drop or items restock. Theme blocks + Insights. `[YOUR_URL]`

### LinkedIn (short)

We built WishMe to solve a simple problem: shoppers want to save products, but many aren’t ready to buy. Merchants get theme-native buttons, guest-to-login sync, Smart Alerts, and Shopify-native customer storage—without a heavy custom build.

### Instagram caption

Save it for later 💚 WishMe brings fast guest wishlists, login sync, and Smart Alerts to your Shopify store. Link in bio.

---

## 15. Video storyboard (30 seconds)

| Sec | Visual | VO / text |
|-----|--------|-----------|
| 0–5 | Shopper lands on PDP | “See something you love?” |
| 5–10 | Tap Add to Wishlist | “Save it in one tap.” |
| 10–15 | Browse collection, save another | “Keep browsing.” |
| 15–20 | Login modal | “Sign in when you’re ready.” |
| 20–25 | Wishlist page full of products | “Everything’s still here.” |
| 25–30 | Logo + App Store CTA | “WishMe for Shopify.” |

---

## 16. Pre-launch checklist (marketing)

- [ ] Fill `[YOUR_SUPPORT_EMAIL]`, privacy policy, pricing
- [ ] Capture 6–8 screenshots at **1600×900**
- [ ] Export app icon **1200×1200**
- [ ] Record 30s demo or animated GIF of guest → login → wishlist page
- [ ] Run live store with real product photos (not placeholders)
- [ ] Reinstall app on demo store after production URL is final
- [ ] Proofread listing for “guest”, “sync”, “metafield” (merchant-friendly wording)

---

## 17. Internal references

| Doc | Path |
|-----|------|
| Technical guide | `docs/WISHLIST_PRO_GUIDE.md` |
| Local setup | `WISHLIST_SETUP.md` |
| App config | `shopify.app.toml` |
| Theme extension | `extensions/wishlist-theme/` |

---

## 18. Placeholders to customize before App Store submit

```text
Production app URL:     [YOUR_VERCEL_OR_HOST_URL]
Support email:          [YOUR_SUPPORT_EMAIL]
Privacy policy:         [YOUR_PRIVACY_POLICY_URL]
Pricing plan:           [FREE / PAID]
Demo store URL:         [YOUR_DEMO_STORE].myshopify.com
Promo video URL:        [OPTIONAL]
```

---

*Last updated for WishMe: theme extension + admin workspaces (Home, Smart Setup, Smart Alerts, Insights, Plan, Help).*
