import { json } from "../models/wishlist.server";
import { updateShopSettings } from "../models/shop-settings.server";
import { authenticate } from "../shopify.server";

function toBoolean(value) {
  return value === "true" || value === "on" || value === "1";
}

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    const settings = await updateShopSettings(session.shop, {
      wishlistRequiresLogin: toBoolean(
        formData.get("wishlistRequiresLogin")?.toString().trim(),
      ),
    });

    return json({ ok: true, settings });
  } catch (error) {
    console.error("settings.action.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};

