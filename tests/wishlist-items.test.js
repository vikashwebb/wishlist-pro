import { describe, expect, it } from "vitest";
import {
  buildWishlistItemEntry,
  mergeWishlistItemsOnToggle,
  normalizeWishlistItemRecords,
  wishlistItemsIncludeProduct,
} from "../app/models/wishlist-items.server.js";

describe("wishlist-items.server", () => {
  it("reads legacy string product ids", () => {
    expect(normalizeWishlistItemRecords(["gid://shopify/Product/1"])).toEqual([
      { productId: "gid://shopify/Product/1" },
    ]);
  });

  it("reads enriched wishlist entries", () => {
    expect(
      normalizeWishlistItemRecords([
        {
          id: "gid://shopify/Product/2",
          savedAt: "2026-01-01T00:00:00.000Z",
          priceAtSave: 19.99,
          handle: "sample",
        },
      ]),
    ).toEqual([
      {
        productId: "gid://shopify/Product/2",
        savedAt: "2026-01-01T00:00:00.000Z",
        priceAtSave: 19.99,
        handle: "sample",
      },
    ]);
  });

  it("merges add/remove while preserving metadata", () => {
    const next = mergeWishlistItemsOnToggle(
      ["gid://shopify/Product/1"],
      "gid://shopify/Product/2",
      true,
      { handle: "new-item", priceAtSave: 12.5 },
    );

    expect(next).toHaveLength(2);
    expect(next[0]).toBe("gid://shopify/Product/1");
    expect(next[1]).toMatchObject({
      id: "gid://shopify/Product/2",
      handle: "new-item",
      priceAtSave: 12.5,
    });
  });

  it("detects saved products across entry formats", () => {
    expect(
      wishlistItemsIncludeProduct(
        [{ id: "gid://shopify/Product/9", priceAtSave: 10 }],
        "gid://shopify/Product/9",
      ),
    ).toBe(true);
  });

  it("builds enriched entries on add", () => {
    const entry = buildWishlistItemEntry("123", {
      handle: "tee",
      priceAtSave: 25,
    });
    expect(entry).toMatchObject({
      id: "gid://shopify/Product/123",
      handle: "tee",
      priceAtSave: 25,
    });
    expect(entry.savedAt).toBeTruthy();
  });
});
