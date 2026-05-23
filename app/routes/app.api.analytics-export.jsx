import {
  loadWishlistExportCsv,
  parseWishlistExportFilters,
} from "../models/wishlist-export.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { searchParams } = new URL(request.url);

  try {
    const filters = parseWishlistExportFilters(searchParams);
    const { csv, filename } = await loadWishlistExportCsv(
      admin,
      session.shop,
      filters,
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not export wishlist data.";

    return new Response(message, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
};
