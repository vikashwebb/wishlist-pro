import { json } from "../models/wishlist.server";
import { getShopSettings } from "../models/shop-settings.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);

  if (!context.session) {
    return json({ error: "App proxy session not found" }, { status: 401 });
  }

  try {
    const settings = await getShopSettings(context.session.shop);

    return json({
      ok: true,
      requireLogin: settings.wishlistRequiresLogin,
    });
  } catch (error) {
    console.error("wishlist.proxy.config.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
