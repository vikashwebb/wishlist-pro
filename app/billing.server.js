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

export const PRO_QA_HEALTH_MESSAGE =
  "Merchant QA lab and health checks require Wishlist Pro. Upgrade on the Pricing page.";

export async function assertProQaHealthAccess(billing, shop) {
  const isPro = await hasProSubscription(billing, shop);
  if (!isPro) {
    return { allowed: false, message: PRO_QA_HEALTH_MESSAGE };
  }
  return { allowed: true };
}

const BILLING_EXEMPT_PATHS = ["/app/pricing", "/app/billing"];

function isBillingExemptPath(pathname) {
  return BILLING_EXEMPT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Runs billing.check on every embedded app load. Optionally redirects merchants
 * without Pro to /app/pricing (set BILLING_REDIRECT_ON_LOAD=true).
 */
export function isRedirectResponse(error) {
  return (
    error instanceof Response &&
    error.status >= 300 &&
    error.status < 400
  );
}

export async function enforceAppBillingOnLoad(request, { billing, session }) {
  if (!session?.shop) {
    return;
  }

  const url = new URL(request.url);

  if (isBillingExemptPath(url.pathname)) {
    return;
  }

  if (billing?.check) {
    try {
      await billing.check({
        plans: [PRO_PLAN],
        isTest: isBillingTestMode(),
      });
    } catch {
      // Non-fatal: feature gates still use hasProSubscription.
    }
  }

  if (process.env.BILLING_REDIRECT_ON_LOAD !== "true") {
    return;
  }

  const isPro = await hasProSubscription(billing, session.shop);
  if (isPro) {
    return;
  }

  const { redirect } = await import("react-router");
  const search = url.searchParams.toString();
  throw redirect(search ? `/app/pricing?${search}` : "/app/pricing");
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
