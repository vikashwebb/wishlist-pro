import { PRO_PLAN } from "./billing.constants";

export { PRO_PLAN, PRO_PLAN_PRICE } from "./billing.constants";

export function isBillingTestMode() {
  return process.env.NODE_ENV !== "production";
}

function normalizeShopDomain(shop) {
  return shop?.trim().toLowerCase() ?? "";
}

/**
 * Demo / staging Pro access without Shopify billing approval.
 *
 * DEMO_PRO_SHOPS=your-store.myshopify.com   (recommended on Vercel)
 * DEMO_PRO_ACCESS=true                      (all shops — use for demo deploys)
 */
export function hasDemoProAccess(shop) {
  if (process.env.DEMO_PRO_ACCESS === "true") {
    return true;
  }

  const domain = normalizeShopDomain(shop);
  const listedShops = (process.env.DEMO_PRO_SHOPS || "")
    .split(",")
    .map((entry) => normalizeShopDomain(entry))
    .filter(Boolean);

  return Boolean(domain && listedShops.includes(domain));
}

export async function hasProSubscription(billing, shop) {
  if (hasDemoProAccess(shop)) {
    return true;
  }

  if (!billing?.check) {
    return false;
  }

  try {
    const { hasActivePayment } = await billing.check({
      plans: [PRO_PLAN],
      isTest: isBillingTestMode(),
    });

    return hasActivePayment;
  } catch {
    return false;
  }
}

export function shopHandleFromDomain(shop) {
  return shop?.replace(/\.myshopify\.com$/i, "") ?? "";
}

/**
 * Return URL after the merchant approves billing.
 * Must use admin.shopify.com for embedded apps — a bare app URL can reload
 * OAuth (accounts.shopify.com) inside the iframe and show "refused to connect".
 */
export function embeddedAdminAppUrl(shop, appPath = "app/analytics") {
  const storeHandle = shopHandleFromDomain(shop);
  const appHandle =
    process.env.SHOPIFY_APP_HANDLE ||
    process.env.SHOPIFY_APP_SLUG ||
    "wishlist-pro";
  const path = appPath.replace(/^\//, "");

  return `https://admin.shopify.com/store/${storeHandle}/apps/${appHandle}/${path}`;
}

export function proUpgradeReturnUrl(shop, fallbackPath = "/app/analytics") {
  if (shop) {
    return embeddedAdminAppUrl(shop, fallbackPath);
  }

  const appUrl = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "");
  if (appUrl) {
    const path = fallbackPath.startsWith("/") ? fallbackPath : `/${fallbackPath}`;
    return `${appUrl}${path}`;
  }

  return fallbackPath;
}
