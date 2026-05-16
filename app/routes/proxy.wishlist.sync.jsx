import { parseGuestWishlistState } from "../models/guest-wishlist-state.server";
import {
  isProtectedCustomerDataError,
  json,
  readWishlist,
  resolveProducts,
  toCustomerGid,
  toProductGid,
  wishlistItemsEqual,
  writeWishlist,
} from "../models/wishlist.server";
import { authenticateAppProxy } from "../utils/app-proxy.server";

export const action = async ({ request }) => {
  const context = await authenticateAppProxy(request);

  if (!context.session || !context.admin) {
    return json(
      { error: "App proxy session not found. Re-open the app in Admin to reconnect." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const customerId = formData.get("customerId")?.toString().trim();
  const rawState = formData.get("state")?.toString();

  if (!toCustomerGid(customerId || "")) {
    return json({ error: "Customer must be logged in" }, { status: 401 });
  }

  try {
    const guestState = parseGuestWishlistState(rawState);
    const hasGuestItems =
      guestState.productIds.length > 0 || guestState.handles.length > 0;

    if (!hasGuestItems) {
      return json({
        ok: true,
        synced: false,
        customerId: toCustomerGid(customerId),
        items: [],
      });
    }

    const [current, resolvedFromHandles] = await Promise.all([
      readWishlist(context.admin, customerId),
      guestState.handles.length > 0
        ? resolveProducts(context.admin, { handles: guestState.handles })
        : Promise.resolve([]),
    ]);

    const nextItems = new Set(current.items);

    guestState.productIds.forEach((productId) => {
      const normalizedProductId = toProductGid(productId);
      if (normalizedProductId) {
        nextItems.add(normalizedProductId);
      }
    });

    resolvedFromHandles.forEach((product) => {
      if (product?.id) {
        nextItems.add(product.id);
      }
    });

    const mergedItems = [...nextItems];
    if (wishlistItemsEqual(mergedItems, current.items)) {
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
