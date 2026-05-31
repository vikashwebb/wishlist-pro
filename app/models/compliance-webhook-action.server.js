import { authenticate } from "../shopify.server";
import { handleComplianceWebhook } from "./compliance-webhooks.server";

/** Shared POST handler for mandatory GDPR compliance webhooks (HMAC verified). */
export async function complianceWebhookAction({ request }) {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} compliance webhook for ${shop}`);

  await handleComplianceWebhook(topic, { shop, payload });

  return new Response(null, { status: 200 });
}
