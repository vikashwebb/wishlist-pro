import { toProductGid } from "./wishlist.server.js";

export function normalizeWishlistItemRecords(value) {
  if (!value) return [];

  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (typeof entry === "string") {
        const productId = toProductGid(entry) || entry;
        return productId ? { productId } : null;
      }

      if (entry && typeof entry === "object") {
        const productId = toProductGid(entry.id || entry.productId) || entry.id || entry.productId;
        if (!productId) return null;
        return {
          productId,
          savedAt: entry.savedAt ?? null,
          priceAtSave:
            entry.priceAtSave != null ? Number(entry.priceAtSave) : null,
          handle: entry.handle ?? null,
        };
      }

      return null;
    })
    .filter(Boolean);
}

export function serializeWishlistItem(record) {
  if (!record?.productId) return null;

  if (record.savedAt || record.priceAtSave != null || record.handle) {
    return {
      id: record.productId,
      ...(record.savedAt ? { savedAt: record.savedAt } : {}),
      ...(record.priceAtSave != null ? { priceAtSave: record.priceAtSave } : {}),
      ...(record.handle ? { handle: record.handle } : {}),
    };
  }

  return record.productId;
}

export function wishlistRecordsToStorage(records = []) {
  return records.map(serializeWishlistItem).filter(Boolean);
}

export function extractProductIdsFromRecords(records = []) {
  return [...new Set(records.map((record) => record.productId).filter(Boolean))];
}

export function buildWishlistItemEntry(productId, { priceAtSave, handle } = {}) {
  const id = toProductGid(productId);
  if (!id) return null;

  return serializeWishlistItem({
    productId: id,
    savedAt: new Date().toISOString(),
    priceAtSave: priceAtSave != null ? Number(priceAtSave) : null,
    handle: handle || null,
  });
}

export function mergeWishlistItemsOnToggle(items, productId, shouldAdd, enrich = {}) {
  const records = normalizeWishlistItemRecords(items);
  const gid = toProductGid(productId);
  if (!gid) return wishlistRecordsToStorage(records);

  const remaining = records.filter((record) => record.productId !== gid);
  if (!shouldAdd) {
    return wishlistRecordsToStorage(remaining);
  }

  const nextRecord = {
    productId: gid,
    savedAt: enrich.savedAt || new Date().toISOString(),
    priceAtSave: enrich.priceAtSave != null ? Number(enrich.priceAtSave) : null,
    handle: enrich.handle || null,
  };

  return wishlistRecordsToStorage([...remaining, nextRecord]);
}

export function wishlistItemsIncludeProduct(items, productId) {
  const gid = toProductGid(productId);
  if (!gid) return false;
  return extractProductIdsFromRecords(normalizeWishlistItemRecords(items)).includes(gid);
}
