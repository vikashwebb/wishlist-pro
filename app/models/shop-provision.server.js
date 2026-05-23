import {
  ensureWishlistPageBodyCurrent,
  getWishlistPageByHandle,
  upsertWishlistPage,
} from "./wishlist-page.server";
import { ensureWishlistMetafieldDefinition } from "./wishlist.server";

export function hasOnlineStorePagesScope(accessScopes = []) {
  return (
    accessScopes.includes("write_online_store_pages") ||
    accessScopes.includes("write_content")
  );
}

/**
 * Creates wishlist infrastructure without merchant clicks:
 * - Customer metafield definition (Shopify Admin API)
 * - Online store page at /pages/{handle} when page scopes are granted
 */
export async function provisionWishlistInfrastructure(
  admin,
  { settings, accessScopes = [] } = {},
) {
  const outcome = {
    metafieldDefinitionEnsured: false,
    wishlistPage: null,
    wishlistPageCreated: false,
    errors: [],
  };

  try {
    await ensureWishlistMetafieldDefinition(admin);
    outcome.metafieldDefinitionEnsured = true;
  } catch (error) {
    outcome.errors.push(
      error instanceof Error ? error.message : String(error),
    );
  }

  if (!hasOnlineStorePagesScope(accessScopes)) {
    return outcome;
  }

  const title = settings?.wishlistPageTitle ?? "Wishlist";
  const handle = settings?.wishlistPageHandle ?? "wishlist";

  try {
    const existing = await getWishlistPageByHandle(admin, handle);

    if (!existing) {
      const result = await upsertWishlistPage(admin, { title, handle });
      outcome.wishlistPage = result.page;
      outcome.wishlistPageCreated = result.mode === "created";
      return outcome;
    }

    const repair = await ensureWishlistPageBodyCurrent(admin, { title, handle });
    outcome.wishlistPage = repair.page ?? existing;
  } catch (error) {
    outcome.errors.push(
      error instanceof Error ? error.message : String(error),
    );
  }

  return outcome;
}
