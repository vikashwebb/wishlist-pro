import {
  isProtectedCustomerDataError,
  json,
  readWishlist,
  resolveProduct,
  toCustomerGid,
  toProductGid,
  writeWishlist,
} from "../models/wishlist.server";
import { authenticate } from "../shopify.server";

function parseGuestState(rawValue) {
  if (!rawValue) {
    return { productIds: [], handles: [] };
  }

  try {
    const parsed = JSON.parse(rawValue);
    const productIds = Array.isArray(parsed.productIds)
      ? [
          ...new Set(
            parsed.productIds
              .map((item) => item?.toString().trim())
              .filter(Boolean),
          ),
        ]
      : [];
    const handles = Array.isArray(parsed.handles)
      ? [
          ...new Set(
            parsed.handles
              .map((item) => item?.toString().trim())
              .filter(Boolean),
          ),
        ]
      : [];

    return { productIds, handles };
  } catch {
    throw new Error("Invalid guest wishlist state");
  }
}

export const action = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);

  if (!context.session || !context.admin) {
    return json({ error: "App proxy session not found" }, { status: 401 });
  }

  const formData = await request.formData();
  const customerId = formData.get("customerId")?.toString().trim();
  const rawState = formData.get("state")?.toString();

  if (!toCustomerGid(customerId || "")) {
    return json({ error: "Customer must be logged in" }, { status: 401 });
  }

  try {
    const guestState = parseGuestState(rawState);
    const current = await readWishlist(context.admin, customerId);
    const nextItems = new Set(current.items);

    guestState.productIds.forEach((productId) => {
      const normalizedProductId = toProductGid(productId);
      if (normalizedProductId) {
        nextItems.add(normalizedProductId);
      }
    });

    const resolvedHandleProducts = await Promise.allSettled(
      guestState.handles.map((handle) =>
        resolveProduct(context.admin, { handle }).then((product) => ({
          handle,
          product,
        })),
      ),
    );

    resolvedHandleProducts.forEach((result, index) => {
      if (result.status === "fulfilled") {
        nextItems.add(result.value.product.id);
        return;
      }

      const handle = guestState.handles[index] || "unknown";
      console.error("wishlist.proxy.sync.resolveHandle.error", {
        handle,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    });

    const mergedItems = [...nextItems];
    if (mergedItems.length === current.items.length) {
      return json({
        ok: true,
        synced: false,
        customerId: toCustomerGid(customerId),
        items: current.items,
        metafield: current.metafield,
      });
    }

    const result = await writeWishlist(context.admin, customerId, mergedItems);

    return json({
      ok: true,
      synced: true,
      customerId: toCustomerGid(customerId),
      items: result.items,
      metafield: result.metafield,
    });
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      return json({
        ok: true,
        synced: false,
        customerId: toCustomerGid(customerId),
        items: [],
        metafield: null,
        localOnly: true,
      });
    }

    console.error("wishlist.proxy.sync.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
