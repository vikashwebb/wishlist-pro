import { deleteShopAppData } from "./shop-data-cleanup.server";

export async function handleComplianceWebhook(topic, { shop, payload } = {}) {
  switch (topic) {
    case "customers/data_request":
      // Wishlist items live on Shopify customer metafields; no customer PII in app DB.
      console.log("customers/data_request", {
        shop,
        customerId: payload?.customer?.id ?? payload?.customer?.email,
      });
      return;

    case "customers/redact":
      // No per-customer records stored outside Shopify customer metafields.
      console.log("customers/redact", {
        shop,
        customerId: payload?.customer?.id ?? payload?.customer?.email,
      });
      return;

    case "shop/redact":
      await deleteShopAppData(shop);
      return;

    default:
      console.warn("Unhandled compliance webhook topic", topic);
  }
}
