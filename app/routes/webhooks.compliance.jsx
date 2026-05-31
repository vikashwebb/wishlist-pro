import { authenticate } from "../shopify.server";
import { handleComplianceWebhook } from "../models/compliance-webhooks.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} compliance webhook for ${shop}`);

  await handleComplianceWebhook(topic, { shop, payload });

  return new Response(null, { status: 200 });
};
