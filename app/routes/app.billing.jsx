import { boundary } from "@shopify/shopify-app-react-router/server";
import { PRO_PLAN } from "../billing.constants";

/**
 * Starts the Pro subscription approval flow.
 * Must be a loader (GET), not a client form POST, so embedded admin can
 * exit the iframe to Shopify's charge confirmation page.
 */
export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { isBillingTestMode, proUpgradeReturnUrl } = await import(
    "../billing.server"
  );
  const { billing, session } = await authenticate.admin(request);

  return billing.request({
    plan: PRO_PLAN,
    isTest: isBillingTestMode(),
    returnUrl: proUpgradeReturnUrl(session.shop, "/app/analytics"),
  });
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
