import {
  json,
  normalizeWishlistIntent,
  readWishlist,
  toProductGid,
  writeWishlist,
} from "../models/wishlist.server";
import { authenticate } from "../shopify.server";
import { logWishlistError } from "../utils/logger.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  if (!customerId) {
    return json({ error: "customerId is required" }, { status: 400 });
  }

  try {
    const result = await readWishlist(admin, customerId);
    return json(result);
  } catch (error) {
    logWishlistError("wishlist.loader.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const customerId = formData.get("customerId")?.toString().trim();
  const productId = formData.get("productId")?.toString().trim();
  const intentRaw = formData.get("intent")?.toString().trim() || "add";

  if (!customerId || !productId) {
    return json(
      { error: "customerId and productId are required" },
      { status: 400 },
    );
  }

  let intent;
  try {
    intent = normalizeWishlistIntent(intentRaw);
  } catch (error) {
    return json({ error: error.message }, { status: 400 });
  }

  const normalizedProductId = toProductGid(productId);
  if (!normalizedProductId) {
    return json({ error: "productId must be a Shopify product GID" }, { status: 400 });
  }

  try {
    const current = await readWishlist(admin, customerId);
    const nextItems =
      intent === "remove"
        ? current.items.filter((item) => item !== normalizedProductId)
        : [...new Set([...current.items, normalizedProductId])];
    const result = await writeWishlist(admin, customerId, nextItems);

    return json({
      customerId,
      productId: normalizedProductId,
      intent,
      items: result.items,
      metafield: result.metafield,
    });
  } catch (error) {
    logWishlistError("wishlist.action.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
