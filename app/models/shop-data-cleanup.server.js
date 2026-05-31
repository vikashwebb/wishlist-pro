import db from "../db.server";

/** Remove app-held data for a shop (sessions, settings). */
export async function deleteShopAppData(shop) {
  if (!shop) return;

  await db.session.deleteMany({ where: { shop } });

  if (typeof db.shopSettings?.delete === "function") {
    try {
      await db.shopSettings.delete({ where: { shop } });
    } catch {
      // Row may already be gone after uninstall or a prior redact webhook.
    }
  }
}
