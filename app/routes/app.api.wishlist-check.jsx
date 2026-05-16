import {
  ensureWishlistMetafieldDefinition,
  getWishlistDiagnostics,
  json,
} from "../models/wishlist.server";
import { authenticate } from "../shopify.server";
import { logWishlist, logWishlistError } from "../utils/logger.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  try {
    logWishlist("wishlist.check.request", {
      customerId,
    });

    try {
      await ensureWishlistMetafieldDefinition(admin);
    } catch (error) {
      logWishlistError("wishlist.definition.ensure.error", error);
    }

    const diagnostics = await getWishlistDiagnostics(admin, customerId);
    logWishlist(
      "wishlist.check.diagnostics.json",
      JSON.stringify(diagnostics, null, 2),
    );
    logWishlist("wishlist.check.result", {
      customerId,
      definitionName: diagnostics.definitionName,
      namespace: diagnostics.namespace,
      key: diagnostics.key,
      definitionExists: diagnostics.checks?.definitionExists,
      protectedCustomerAccessApproved:
        diagnostics.checks?.protectedCustomerAccessApproved,
      customerMetafieldExists: diagnostics.checks?.customerMetafieldExists,
      errors: diagnostics.errors,
    });
    if (diagnostics.definition) {
      logWishlist(
        "wishlist.check.definition.json",
        JSON.stringify(diagnostics.definition, null, 2),
      );
    }
    if (diagnostics.metafield) {
      logWishlist(
        "wishlist.check.metafield.json",
        JSON.stringify(diagnostics.metafield, null, 2),
      );
    }
    return json(diagnostics);
  } catch (error) {
    logWishlistError("wishlist.check.loader.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
