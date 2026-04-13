import { json } from "../models/wishlist.server";

export const action = async ({ request }) => {
  const [
    { authenticate },
    { upsertWishlistPage },
    { getShopSettings, updateShopSettings },
  ] = await Promise.all([
    import("../shopify.server"),
    import("../models/wishlist-page.server"),
    import("../models/shop-settings.server"),
  ]);
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const nextTitle = formData.get("wishlistPageTitle")?.toString().trim();
  const nextHandle = formData.get("wishlistPageHandle")?.toString().trim();

  try {
    const currentSettings = await getShopSettings(session.shop);
    const settings = await updateShopSettings(session.shop, {
      wishlistPageTitle: nextTitle,
      wishlistPageHandle: nextHandle,
    });
    const result = await upsertWishlistPage(admin, {
      title: settings.wishlistPageTitle,
      handle: settings.wishlistPageHandle,
      previousHandle: currentSettings.wishlistPageHandle,
    });
    return json({
      ok: true,
      mode: result.mode,
      page: result.page,
      path: result.path,
      settings,
    });
  } catch (error) {
    console.error("wishlist.page.action.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
