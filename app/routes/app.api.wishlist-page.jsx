import { json } from "../models/wishlist.server";

export const action = async ({ request }) => {
  const [{ authenticate }, { upsertWishlistPage }] = await Promise.all([
    import("../shopify.server"),
    import("../models/wishlist-page.server"),
  ]);
  const { admin } = await authenticate.admin(request);

  try {
    const result = await upsertWishlistPage(admin);
    return json({
      ok: true,
      mode: result.mode,
      page: result.page,
      path: result.path,
    });
  } catch (error) {
    console.error("wishlist.page.action.error", error);
    return json({ error: error.message }, { status: 422 });
  }
};
