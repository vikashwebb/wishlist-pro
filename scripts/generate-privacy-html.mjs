import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contactEmail = process.env.SUPPORT_EMAIL?.trim() || "";
const lastUpdated = "May 30, 2026";

const contactBlock = contactEmail
  ? `<p class="contact">Questions about this policy: <a href="mailto:${contactEmail}">${contactEmail}</a></p>`
  : `<p class="contact">Questions about this policy: contact us through the support channel listed on the Wishlist Pro Shopify App Store listing.</p>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Privacy Policy — Wishlist Pro</title>
  <meta name="description" content="Privacy policy for Wishlist Pro, a Shopify app that provides storefront wishlist functionality." />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      color: #1f2937;
      background:
        radial-gradient(circle at top left, rgb(217 243 231 / 0.9), transparent 32%),
        radial-gradient(circle at bottom right, rgb(255 232 214 / 0.92), transparent 36%),
        linear-gradient(180deg, #f8f5ef 0%, #fcfbf8 48%, #f4efe7 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .shell { max-width: 760px; margin: 0 auto; }
    .top-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .eyebrow {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #7c5c38;
    }
    .home-link {
      color: #1f6f5d;
      font-size: 0.95rem;
      font-weight: 600;
      text-decoration: none;
    }
    .home-link:hover { text-decoration: underline; }
    .card {
      padding: 2rem;
      border: 1px solid rgb(24 33 47 / 0.08);
      border-radius: 1.8rem;
      background: rgb(255 255 255 / 0.92);
      box-shadow: 0 28px 80px rgb(24 33 47 / 0.1);
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: clamp(2rem, 4vw, 2.8rem);
      line-height: 1.05;
      letter-spacing: -0.04em;
      color: #18212f;
    }
    .updated {
      margin: 0 0 1.75rem;
      font-size: 0.92rem;
      color: rgb(31 41 55 / 0.62);
    }
    .content { display: grid; gap: 1.35rem; }
    .content h2 {
      margin: 0.5rem 0 0;
      font-size: 1.15rem;
      color: #18212f;
    }
    .content p, .content li {
      margin: 0;
      font-size: 1rem;
      line-height: 1.7;
      color: rgb(31 41 55 / 0.82);
    }
    .content ul {
      margin: 0;
      padding-left: 1.25rem;
      display: grid;
      gap: 0.45rem;
    }
    .contact {
      margin: 0;
      padding: 1rem 1.1rem;
      border-radius: 1rem;
      background: rgb(236 253 245 / 0.75);
      border: 1px solid rgb(31 111 93 / 0.14);
    }
    .contact a { color: #1f6f5d; font-weight: 600; }
    @media (max-width: 50rem) {
      body { padding: 1rem; }
      .card { padding: 1.35rem; }
      .top-bar { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="top-bar">
      <p class="eyebrow">Wishlist Pro</p>
      <a class="home-link" href="/">Back to home</a>
    </div>
    <article class="card">
      <h1>Privacy Policy</h1>
      <p class="updated">Last updated: ${lastUpdated}</p>
      <div class="content">
        <p>Wishlist Pro ("we", "our", or "the app") is a Shopify application that helps merchants offer wishlist functionality on their storefront. This policy explains what information the app processes and how that information is used.</p>

        <h2>Information we process</h2>
        <p>When you install Wishlist Pro, we process information needed to operate the app, including:</p>
        <ul>
          <li>Your shop domain and staff session data required to authenticate with Shopify</li>
          <li>App configuration you set in the admin, such as guest or login-only wishlist mode and wishlist page settings</li>
          <li>Subscription and billing status through Shopify's billing system when you choose a paid plan</li>
        </ul>

        <h2>Shopper and customer data</h2>
        <p>When shoppers use the wishlist on your storefront:</p>
        <ul>
          <li>Saved products for logged-in customers are stored on Shopify customer records using the customer metafield <code>wishlist.items</code></li>
          <li>Guest wishlist items may be stored in the shopper's browser until they log in and items are synced to their customer account</li>
          <li>Product identifiers needed to add or remove wishlist items are processed when shoppers interact with wishlist buttons or the wishlist page</li>
        </ul>

        <h2>How we use information</h2>
        <p>We use this information only to:</p>
        <ul>
          <li>Provide wishlist functionality on your storefront</li>
          <li>Run app setup, diagnostics, and merchant testing tools</li>
          <li>Show wishlist analytics and exports you access in the admin app</li>
          <li>Maintain app security, reliability, and billing where applicable</li>
        </ul>

        <h2>Where data is stored</h2>
        <p>Wishlist product data for logged-in customers is stored on Shopify. App session data and shop settings are stored in our application infrastructure. We do not sell merchant or customer data.</p>

        <h2>Sharing with service providers</h2>
        <p>We use service providers needed to host and operate the app, such as cloud hosting and database services. These providers process data on our behalf to deliver the app. We may also share information when required by law.</p>

        <h2>Data retention</h2>
        <p>We retain app data while Wishlist Pro is installed on your store. When you uninstall the app, we delete app-specific data in line with our retention practices and Shopify's requirements. Customer wishlist metafields on Shopify remain under your control as the merchant.</p>

        <h2>Your choices</h2>
        <p>Merchants may uninstall the app at any time from Shopify admin. You may contact us with privacy questions or requests related to data we control.</p>

        <h2>Changes to this policy</h2>
        <p>We may update this policy from time to time. The "Last updated" date at the top of this page will reflect changes. Continued use of the app after an update means you accept the revised policy.</p>

        <h2>Contact</h2>
        ${contactBlock}
      </div>
    </article>
  </div>
</body>
</html>
`;

const outPath = join(root, "public", "privacy.html");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log(`Generated ${outPath}${contactEmail ? ` (contact: ${contactEmail})` : ""}`);
