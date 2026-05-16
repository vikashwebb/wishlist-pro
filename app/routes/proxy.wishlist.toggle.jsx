import {
  isProtectedCustomerDataError,
  json,
  readWishlist,
  resolveProduct,
  toCustomerGid,
  toProductGid,
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
  const productId = formData.get("productId")?.toString().trim();
  const handle = formData.get("handle")?.toString().trim();
  const intent = formData.get("intent")?.toString().trim() || "toggle";
  const normalizedCustomerId = toCustomerGid(customerId || "");
  const normalizedProductId = toProductGid(productId || "");

  if (!normalizedCustomerId) {
    return json({ error: "Customer must be logged in" }, { status: 401 });
  }

  try {
    let resolvedProductId = normalizedProductId;
    let resolvedHandle = handle || "";

    if (!resolvedProductId) {
      const product = await resolveProduct(context.admin, {
        productId,
        handle,
      });
      resolvedProductId = product.id;
      resolvedHandle = product.handle || resolvedHandle;
    }

    const wishlist = await readWishlist(context.admin, customerId);
    const isSaved = wishlist.items.includes(resolvedProductId);
    const shouldAdd =
      intent === "add" ? true : intent === "remove" ? false : !isSaved;
    const nextItems = shouldAdd
      ? [...new Set([...wishlist.items, resolvedProductId])]
      : wishlist.items.filter((item) => item !== resolvedProductId);
    const result = await writeWishlist(context.admin, customerId, nextItems);

    return json({
      ok: true,
      active: shouldAdd,
      intent: shouldAdd ? "add" : "remove",
      product: {
        id: resolvedProductId,
        handle: resolvedHandle || null,
      },
      customerId: normalizedCustomerId,
      items: result.items,
      metafield: result.metafield,
      statusByHandle: resolvedHandle ? { [resolvedHandle]: shouldAdd } : {},
    });
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      let resolvedProductId = normalizedProductId;
      let resolvedHandle = handle || "";

      if (!resolvedProductId) {
        const product = await resolveProduct(context.admin, {
          productId,
          handle,
        });
        resolvedProductId = product.id;
        resolvedHandle = product.handle || resolvedHandle;
      }

      const active = intent === "remove" ? false : true;

      return json({
        ok: true,
        active,
        intent: active ? "add" : "remove",
        product: {
          id: resolvedProductId,
          handle: resolvedHandle || null,
        },
        customerId: normalizedCustomerId,
        items: [],
        metafield: null,
        localOnly: true,
        statusByHandle: resolvedHandle ? { [resolvedHandle]: active } : {},
      });
    }

    console.error("wishlist.proxy.toggle.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
