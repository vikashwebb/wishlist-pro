import { json } from "../models/wishlist.server";
import { updateSmartAlertSettings } from "../models/smart-alerts.server";
import { authenticate } from "../shopify.server";

function toBoolean(value) {
  return value === "true" || value === "on" || value === "1";
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const settings = await updateSmartAlertSettings(session.shop, {
      smartRecoveryEnabled: toBoolean(formData.get("smartRecoveryEnabled")),
      smartRecoveryDelayDays: Number(formData.get("smartRecoveryDelayDays") ?? 7),
      smartPriceAlertsEnabled: toBoolean(formData.get("smartPriceAlertsEnabled")),
      smartPriceDropMinPercent: Number(formData.get("smartPriceDropMinPercent") ?? 5),
      smartRestockAlertsEnabled: toBoolean(formData.get("smartRestockAlertsEnabled")),
    });

    return json({ ok: true, settings });
  } catch (error) {
    console.error("automations.settings.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
