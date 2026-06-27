import { boundary } from "@shopify/shopify-app-react-router/server";
import { ALL_FEATURES_FREE, PRO_PLAN } from "../billing.constants";

/**
 * Starts the Pro subscription approval flow.
 * Must be a loader (GET), not a client form POST, so embedded admin can
 * exit the iframe to Shopify's charge confirmation page.
 */
export const loader = async ({ request }) => {
  if (ALL_FEATURES_FREE) {
    const { redirect } = await import("react-router");
    const url = new URL(request.url);
    const search = url.searchParams.toString();
    throw redirect(search ? `/app/plan?${search}` : "/app/plan");
  }

  const { authenticate } = await import("../shopify.server");
  const { isBillingTestMode, proUpgradeReturnUrl } = await import(
    "../billing.server"
  );
  const { billing, session } = await authenticate.admin(request);

  return billing.request({
    plan: PRO_PLAN,
    isTest: isBillingTestMode(),
    returnUrl: proUpgradeReturnUrl(session.shop, "/app/plan"),
  });
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
