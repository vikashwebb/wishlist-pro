import {
  isProtectedCustomerDataError,
  json,
  readWishlist,
  resolveProduct,
  toCustomerGid,
} from "../models/wishlist.server";
import { getShopSettings } from "../models/shop-settings.server";
import { authenticate } from "../shopify.server";

function splitList(value) {
  return [...new Set(
    (value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

export const loader = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);

  if (!context.session || !context.admin) {
    return json({ error: "App proxy session not found" }, { status: 401 });
  }

  const settings = await getShopSettings(context.session.shop);
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const productIds = splitList(searchParams.get("productIds"));
  const handles = splitList(searchParams.get("handles"));
  const products = [];
  const seen = new Set();

  const pushProduct = (product) => {
    if (!product || seen.has(product.id)) return;
    seen.add(product.id);
    products.push({
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: product.featuredImage?.url ?? null,
      imageAlt: product.featuredImage?.altText ?? product.title,
      url: product.handle ? `/products/${product.handle}` : "#",
    });
  };

  if (toCustomerGid(customerId || "")) {
    try {
      const wishlist = await readWishlist(context.admin, customerId);

      for (const productId of wishlist.items) {
        try {
          const product = await resolveProduct(context.admin, { productId });
          pushProduct(product);
        } catch (error) {
          console.error("wishlist.proxy.items.resolveProductId.error", {
            productId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return json({
        ok: true,
        loggedIn: true,
        requireLogin: settings.wishlistRequiresLogin,
        products,
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

  for (const productId of productIds) {
    try {
      const product = await resolveProduct(context.admin, { productId });
      pushProduct(product);
    } catch (error) {
      console.error("wishlist.proxy.items.guestProductId.error", {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const handle of handles) {
    try {
      const product = await resolveProduct(context.admin, { handle });
      pushProduct(product);
    } catch (error) {
      console.error("wishlist.proxy.items.guestHandle.error", {
        handle,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return json({
    ok: true,
    loggedIn: false,
    requireLogin: false,
    products,
  });
};
