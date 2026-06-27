import { authenticate, unauthenticated } from "../shopify.server";
import {
  getSmartAlertSettings,
  handleInventoryUpdateForSmartAlerts,
  handleProductUpdateForSmartAlerts,
  queueSmartRecoveryAlerts,
} from "../models/smart-alerts.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const { admin } = await unauthenticated.admin(shop);
  const settings = await getSmartAlertSettings(shop);

  if (topic === "PRODUCTS_UPDATE") {
    await handleProductUpdateForSmartAlerts(admin, shop, payload);
  }

  if (topic === "INVENTORY_LEVELS_UPDATE") {
    await handleInventoryUpdateForSmartAlerts(admin, shop, payload);
  }

  if (topic === "CUSTOMERS_UPDATE" && settings.smartRecoveryEnabled) {
    await queueSmartRecoveryAlerts(admin, shop, settings);
  }

  return new Response();
};
