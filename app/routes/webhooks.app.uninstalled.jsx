import { authenticate } from "../shopify.server";
import { deleteShopAppData } from "../models/shop-data-cleanup.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  await deleteShopAppData(shop);

  return new Response();
};
