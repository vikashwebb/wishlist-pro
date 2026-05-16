import { getWishlistPagePath } from "../models/wishlist-page.server";
import { getShopSettings } from "../models/shop-settings.server";
import { authenticate } from "../shopify.server";

/** App proxy root — send shoppers to the Online Store page, not a standalone proxy UI. */
export const loader = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);

  if (!context.session) {
    return new Response("Wishlist unavailable", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const settings = await getShopSettings(context.session.shop);
  const path = getWishlistPagePath(settings.wishlistPageHandle);

  return new Response(null, {
    status: 302,
    headers: {
      Location: path,
      "Cache-Control": "no-store",
    },
  });
};
