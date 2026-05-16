import { describe, expect, it, vi } from "vitest";
import {
  isProtectedCustomerDataError,
  mergeWishlistMetafields,
  normalizeWishlistIntent,
  normalizeWishlistItems,
  readWishlist,
  toCustomerGid,
  toProductGid,
  writeWishlist,
} from "../app/models/wishlist.server.js";

const PRODUCT_A = "gid://shopify/Product/111";
const PRODUCT_B = "gid://shopify/Product/222";
const CUSTOMER_GID = "gid://shopify/Customer/999";

describe("normalizeWishlistItems", () => {
  it("returns empty array for nullish values", () => {
    expect(normalizeWishlistItems(null)).toEqual([]);
    expect(normalizeWishlistItems(undefined)).toEqual([]);
  });

  it("deduplicates array values", () => {
    expect(normalizeWishlistItems([PRODUCT_A, PRODUCT_A, PRODUCT_B])).toEqual([
      PRODUCT_A,
      PRODUCT_B,
    ]);
  });

  it("parses JSON string arrays", () => {
    expect(normalizeWishlistItems(JSON.stringify([PRODUCT_A, PRODUCT_B]))).toEqual(
      [PRODUCT_A, PRODUCT_B],
    );
  });

  it("returns empty array for invalid JSON strings", () => {
    expect(normalizeWishlistItems("not-json")).toEqual([]);
  });
});

describe("normalizeWishlistIntent", () => {
  it("accepts add and remove", () => {
    expect(normalizeWishlistIntent("add")).toBe("add");
    expect(normalizeWishlistIntent(" REMOVE ")).toBe("remove");
  });

  it("rejects invalid intents", () => {
    expect(() => normalizeWishlistIntent("toggle")).toThrow(
      'intent must be "add" or "remove"',
    );
  });
});

describe("GID helpers", () => {
  it("normalizes customer IDs", () => {
    expect(toCustomerGid("12345")).toBe("gid://shopify/Customer/12345");
    expect(toCustomerGid(CUSTOMER_GID)).toBe(CUSTOMER_GID);
    expect(toCustomerGid("")).toBeNull();
    expect(toCustomerGid("bad-id")).toBeNull();
  });

  it("normalizes product IDs", () => {
    expect(toProductGid("42")).toBe("gid://shopify/Product/42");
    expect(toProductGid(PRODUCT_A)).toBe(PRODUCT_A);
    expect(toProductGid("")).toBeNull();
  });
});

describe("isProtectedCustomerDataError", () => {
  it("detects Shopify protected customer data errors", () => {
    const error = new Error(
      "This app is not approved to access the Customer object.",
    );
    expect(isProtectedCustomerDataError(error)).toBe(true);
    expect(isProtectedCustomerDataError(new Error("other"))).toBe(false);
  });
});

describe("mergeWishlistMetafields", () => {
  it("prefers canonical namespace items", () => {
    const result = mergeWishlistMetafields(
      { namespace: "wishlist", value: JSON.stringify([PRODUCT_A]) },
      { namespace: "wishlist_pro", value: JSON.stringify([PRODUCT_B]) },
    );

    expect(result.items).toEqual([PRODUCT_A]);
    expect(result.usedLegacyNamespace).toBe(false);
  });

  it("falls back to legacy namespace when canonical is empty", () => {
    const result = mergeWishlistMetafields(
      null,
      { namespace: "wishlist_pro", value: JSON.stringify([PRODUCT_B]) },
    );

    expect(result.items).toEqual([PRODUCT_B]);
    expect(result.usedLegacyNamespace).toBe(true);
  });

  it("returns empty list when both are missing", () => {
    const result = mergeWishlistMetafields(null, null);
    expect(result.items).toEqual([]);
    expect(result.metafield).toBeNull();
  });
});

describe("readWishlist", () => {
  it("throws for invalid customer IDs", async () => {
    await expect(readWishlist({ graphql: vi.fn() }, "invalid")).rejects.toThrow(
      "Invalid customerId",
    );
  });

  it("reads canonical metafield data", async () => {
    const admin = {
      graphql: vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            customer: {
              id: CUSTOMER_GID,
              displayName: "Test Customer",
              metafield: {
                namespace: "wishlist",
                key: "items",
                value: JSON.stringify([PRODUCT_A]),
              },
              legacyMetafield: null,
            },
          },
        }),
      }),
    };

    const result = await readWishlist(admin, "999");
    expect(result.items).toEqual([PRODUCT_A]);
    expect(admin.graphql).toHaveBeenCalledTimes(1);
  });

  it("migrates legacy metafield data to canonical namespace", async () => {
    const admin = {
      graphql: vi
        .fn()
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              customer: {
                id: CUSTOMER_GID,
                metafield: null,
                legacyMetafield: {
                  namespace: "wishlist_pro",
                  value: JSON.stringify([PRODUCT_B]),
                },
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            data: {
              metafieldsSet: {
                metafields: [
                  {
                    namespace: "wishlist",
                    key: "items",
                    value: JSON.stringify([PRODUCT_B]),
                  },
                ],
                userErrors: [],
              },
            },
          }),
        }),
    };

    const result = await readWishlist(admin, CUSTOMER_GID);
    expect(result.items).toEqual([PRODUCT_B]);
    expect(admin.graphql).toHaveBeenCalledTimes(2);
  });
});

describe("writeWishlist", () => {
  it("writes deduplicated product GIDs", async () => {
    const admin = {
      graphql: vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            metafieldsSet: {
              metafields: [
                {
                  namespace: "wishlist",
                  key: "items",
                  value: JSON.stringify([PRODUCT_A, PRODUCT_B]),
                },
              ],
              userErrors: [],
            },
          },
        }),
      }),
    };

    const result = await writeWishlist(
      admin,
      CUSTOMER_GID,
      [PRODUCT_A, PRODUCT_A, PRODUCT_B],
    );

    expect(result.items).toEqual([PRODUCT_A, PRODUCT_B]);
    const [, options] = admin.graphql.mock.calls[0];
    expect(options.variables.metafields[0].namespace).toBe("wishlist");
    expect(options.variables.metafields[0].key).toBe("items");
  });

  it("surfaces GraphQL user errors", async () => {
    const admin = {
      graphql: vi.fn().mockResolvedValue({
        json: async () => ({
          data: {
            metafieldsSet: {
              metafields: [],
              userErrors: [{ message: "Definition missing" }],
            },
          },
        }),
      }),
    };

    await expect(writeWishlist(admin, CUSTOMER_GID, [PRODUCT_A])).rejects.toThrow(
      "Definition missing",
    );
  });
});
