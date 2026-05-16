import {
  isProtectedCustomerDataError,
  json,
  readWishlist,
  resolveProducts,
  toCustomerGid,
  toProductGid,
} from "../models/wishlist.server";
import { authenticateAppProxy } from "../utils/app-proxy.server";

function splitList(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildStatusByHandle(wishlistItems, products) {
  const itemSet = new Set(wishlistItems);
  const statusByHandle = {};

  products.forEach((product) => {
    if (!product?.handle) return;
    statusByHandle[product.handle] = itemSet.has(product.id);
  });

  return statusByHandle;
}

export const loader = async ({ request }) => {
  const context = await authenticateAppProxy(request);

  if (!context.session || !context.admin) {
    return json(
      { error: "App proxy session not found. Re-open the app in Admin to reconnect." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const customerId =
    searchParams.get("customerId") ||
    searchParams.get("logged_in_customer_id");
  const productId = searchParams.get("productId");
  const handle = searchParams.get("handle");
  const handles = splitList(searchParams.get("handles"));

  if (!toCustomerGid(customerId || "")) {
    return json({ loggedIn: false, items: [], statusByHandle: {} });
  }

  try {
    const wishlist = await readWishlist(context.admin, customerId);
    const normalizedProductId = toProductGid(productId || "");
    const statusByHandle = {};
    let active = false;
    let product = null;

    if (normalizedProductId) {
      active = wishlist.items.includes(normalizedProductId);
    }

    if (handle) {
      statusByHandle[handle] = active;
    }

    const lookupHandles = [...new Set(handles.filter(Boolean))];

    if (lookupHandles.length === 0 && normalizedProductId) {
      return json({
        loggedIn: true,
        customerId: toCustomerGid(customerId),
        items: wishlist.items,
        active,
        product: null,
        productsByHandle: {},
        statusByHandle,
      });
    }

    if (lookupHandles.length > 0 || handle) {
      const handlesToResolve = [...new Set([handle, ...lookupHandles].filter(Boolean))];
      const resolved = await resolveProducts(context.admin, {
        handles: handlesToResolve,
      });
      Object.assign(statusByHandle, buildStatusByHandle(wishlist.items, resolved));

      if (normalizedProductId) {
        const matched = resolved.find((entry) => entry.id === normalizedProductId);
        if (matched) {
          product = matched;
          active = wishlist.items.includes(matched.id);
          statusByHandle[matched.handle] = active;
        }
      } else if (handle) {
        const matched = resolved.find((entry) => entry.handle === handle);
        if (matched) {
          product = matched;
          active = wishlist.items.includes(matched.id);
          statusByHandle[handle] = active;
        }
      }
    }

    return json({
      loggedIn: true,
      customerId: toCustomerGid(customerId),
      items: wishlist.items,
      active,
      product,
      productsByHandle: product ? { [product.handle]: product } : {},
      statusByHandle,
    });
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      return json({
        loggedIn: true,
        customerId: toCustomerGid(customerId),
        items: [],
        active: false,
        product: null,
        productsByHandle: {},
        statusByHandle: {},
        localOnly: true,
      });
    }

    console.error("wishlist.proxy.status.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
