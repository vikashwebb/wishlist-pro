import { hasProSubscription } from "../billing.server";
import { json } from "../models/wishlist.server";
import { updateShopSettings } from "../models/shop-settings.server";
import { authenticate } from "../shopify.server";

function toBoolean(value) {
  return value === "true" || value === "on" || value === "1";
}

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const wishlistRequiresLogin = toBoolean(
    formData.get("wishlistRequiresLogin")?.toString().trim(),
  );

  try {
    if (wishlistRequiresLogin && !(await hasProSubscription(billing, session.shop))) {
      return json(
        {
          error:
            "Login-only wishlist is a Pro feature. Upgrade on the Analytics page to enable it.",
          code: "PRO_REQUIRED",
        },
        { status: 402 },
      );
    }

    const settings = await updateShopSettings(session.shop, {
      wishlistRequiresLogin,
    });

    return json({ ok: true, settings });
  } catch (error) {
    console.error("settings.action.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
