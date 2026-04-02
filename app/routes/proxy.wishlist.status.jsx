import {
  isProtectedCustomerDataError,
  json,
  readWishlist,
  resolveProduct,
  toCustomerGid,
} from "../models/wishlist.server";
import { authenticate } from "../shopify.server";

function splitList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const loader = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);

  if (!context.session || !context.admin) {
    return json({ error: "App proxy session not found" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const productId = searchParams.get("productId");
  const handle = searchParams.get("handle");
  const handles = splitList(searchParams.get("handles"));

  if (!toCustomerGid(customerId || "")) {
    return json({ loggedIn: false, items: [], statusByHandle: {} });
  }

  try {
    const wishlist = await readWishlist(context.admin, customerId);
    const response = {
      loggedIn: true,
      customerId: toCustomerGid(customerId),
      items: wishlist.items,
      active: false,
      product: null,
      productsByHandle: {},
      statusByHandle: {},
    };

    if (productId || handle) {
      const product = await resolveProduct(context.admin, { productId, handle });
      response.product = product;
      response.active = wishlist.items.includes(product.id);
      response.productsByHandle[product.handle] = product;
      response.statusByHandle[product.handle] = wishlist.items.includes(product.id);
    }

    for (const itemHandle of handles) {
      const product = await resolveProduct(context.admin, { handle: itemHandle });
      response.productsByHandle[product.handle] = product;
      response.statusByHandle[product.handle] = wishlist.items.includes(product.id);
    }

    return json(response);
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      const response = {
        loggedIn: true,
        customerId: toCustomerGid(customerId),
        items: [],
        active: false,
        product: null,
        productsByHandle: {},
        statusByHandle: {},
        localOnly: true,
      };

      try {
        if (productId || handle) {
          const product = await resolveProduct(context.admin, { productId, handle });
          response.product = product;
          response.productsByHandle[product.handle] = product;
          response.statusByHandle[product.handle] = false;
        }

        for (const itemHandle of handles) {
          const product = await resolveProduct(context.admin, { handle: itemHandle });
          response.productsByHandle[product.handle] = product;
          response.statusByHandle[product.handle] = false;
        }
      } catch (productError) {
        console.error("wishlist.proxy.status.localOnly.error", productError);
      }

      return json(response);
    }

    console.error("wishlist.proxy.status.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
