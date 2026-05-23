import { hasProSubscription } from "../billing.server";
import { loadWishlistExportCsv } from "../models/wishlist-export.server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session, billing } = await authenticate.admin(request);

  if (!(await hasProSubscription(billing, session.shop))) {
    return new Response("Wishlist Pro plan required to export data.", {
      status: 402,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const csv = await loadWishlistExportCsv(admin, session.shop);
  const dateStamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wishlist-pro-export-${dateStamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};
