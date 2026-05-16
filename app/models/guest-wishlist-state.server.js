export function parseGuestWishlistState(rawValue) {
  if (!rawValue) {
    return { productIds: [], handles: [] };
  }

  try {
    const parsed = JSON.parse(rawValue);
    const productIds = Array.isArray(parsed.productIds)
      ? [
          ...new Set(
            parsed.productIds
              .map((item) => item?.toString().trim())
              .filter(Boolean),
          ),
        ]
      : [];
    const handles = Array.isArray(parsed.handles)
      ? [
          ...new Set(
            parsed.handles
              .map((item) => item?.toString().trim())
              .filter(Boolean),
          ),
        ]
      : [];

    return { productIds, handles };
  } catch {
    throw new Error("Invalid guest wishlist state");
  }
}
