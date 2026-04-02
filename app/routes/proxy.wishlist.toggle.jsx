import {
  isProtectedCustomerDataError,
  json,
  readWishlist,
  resolveProduct,
  toCustomerGid,
  writeWishlist,
} from "../models/wishlist.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);

  if (!context.session || !context.admin) {
    return json({ error: "App proxy session not found" }, { status: 401 });
  }

  const formData = await request.formData();
  const customerId = formData.get("customerId")?.toString().trim();
  const productId = formData.get("productId")?.toString().trim();
  const handle = formData.get("handle")?.toString().trim();
  const intent = formData.get("intent")?.toString().trim() || "toggle";

  if (!toCustomerGid(customerId || "")) {
    return json({ error: "Customer must be logged in" }, { status: 401 });
  }

  try {
    const product = await resolveProduct(context.admin, { productId, handle });
    const wishlist = await readWishlist(context.admin, customerId);
    const isSaved = wishlist.items.includes(product.id);
    const shouldAdd =
      intent === "add" ? true : intent === "remove" ? false : !isSaved;
    const nextItems = shouldAdd
      ? [...new Set([...wishlist.items, product.id])]
      : wishlist.items.filter((item) => item !== product.id);
    const result = await writeWishlist(context.admin, customerId, nextItems);

    return json({
      ok: true,
      active: shouldAdd,
      intent: shouldAdd ? "add" : "remove",
      product,
      customerId: toCustomerGid(customerId),
      items: result.items,
      metafield: result.metafield,
    });
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      const product = await resolveProduct(context.admin, { productId, handle });
      const active = intent === "remove" ? false : true;

      return json({
        ok: true,
        active,
        intent: active ? "add" : "remove",
        product,
        customerId: toCustomerGid(customerId),
        items: [],
        metafield: null,
        localOnly: true,
      });
    }

    console.error("wishlist.proxy.toggle.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
