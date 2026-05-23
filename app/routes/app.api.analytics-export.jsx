import {
  loadWishlistExportCsv,
  parseWishlistExportFilters,
} from "../models/wishlist-export.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const { assertProAnalyticsAccess } = await import("../billing.server");
  const access = await assertProAnalyticsAccess(billing, session.shop);

  if (!access.allowed) {
    return new Response(access.message, {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

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
