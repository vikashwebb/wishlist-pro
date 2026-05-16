import {
  formatWishlistStorefrontProduct,
  isProtectedCustomerDataError,
  json,
  readWishlist,
  resolveProducts,
  toCustomerGid,
} from "../models/wishlist.server";
import { getShopSettings } from "../models/shop-settings.server";
import { authenticateAppProxy } from "../utils/app-proxy.server";

function splitList(value) {
  return [
    ...new Set(
      (value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export const loader = async ({ request }) => {
  const context = await authenticateAppProxy(request);

  if (!context.session || !context.admin) {
    return json(
      { error: "App proxy session not found. Re-open the app in Admin to reconnect." },
      { status: 401 },
    );
  }

  const settings = await getShopSettings(context.session.shop);
  const { searchParams } = new URL(request.url);
  const customerId =
    searchParams.get("customerId") ||
    searchParams.get("logged_in_customer_id");
  const productIds = splitList(searchParams.get("productIds"));
  const handles = splitList(searchParams.get("handles"));

  if (toCustomerGid(customerId || "")) {
    try {
      const wishlist = await readWishlist(context.admin, customerId);
      const resolved = await resolveProducts(context.admin, {
        productIds: wishlist.items,
      });

      return json({
        ok: true,
        loggedIn: true,
        requireLogin: settings.wishlistRequiresLogin,
        products: resolved
          .map(formatWishlistStorefrontProduct)
          .filter(Boolean),
      });
    } catch (error) {
      if (isProtectedCustomerDataError(error)) {
        return json({
          ok: true,
          loggedIn: true,
          requireLogin: settings.wishlistRequiresLogin,
          localOnly: true,
          products: [],
        });
      }

      console.error("wishlist.proxy.items.customer.error", error);
      return json({ error: error.message }, { status: 422 });
    }
  }

  if (settings.wishlistRequiresLogin) {
    return json({
      ok: true,
      loggedIn: false,
      requireLogin: true,
      products: [],
    });
  }

  try {
    const resolved = await resolveProducts(context.admin, {
      productIds,
      handles,
    });

    return json({
      ok: true,
      loggedIn: false,
      requireLogin: false,
      products: resolved.map(formatWishlistStorefrontProduct).filter(Boolean),
    });
  } catch (error) {
    console.error("wishlist.proxy.items.guest.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
