import { describe, expect, it } from "vitest";
import { buildWishlistAnalytics } from "../app/models/wishlist-analytics.server.js";

const PRODUCT_A = "gid://shopify/Product/111";
const PRODUCT_B = "gid://shopify/Product/222";
const PRODUCT_C = "gid://shopify/Product/333";

function customer(id, items, options = {}) {
  return {
    id,
    displayName: options.displayName ?? `Customer ${id}`,
    email: options.email ?? `${id}@example.com`,
    metafield: items.length
      ? {
          jsonValue: items,
          updatedAt: options.updatedAt ?? "2026-05-10T12:00:00Z",
        }
      : null,
    legacyMetafield: null,
  };
}

describe("buildWishlistAnalytics", () => {
  it("returns zeroed summary when no customers have wishlists", () => {
    const report = buildWishlistAnalytics([
      customer("gid://shopify/Customer/1", []),
      customer("gid://shopify/Customer/2", []),
    ]);

    expect(report.summary).toEqual({
      customersScanned: 2,
      customersWithWishlist: 0,
      totalWishlistItems: 0,
      uniqueProductsWishlisted: 0,
      averageItemsPerCustomer: 0,
      adoptionRate: 0,
      truncated: false,
    });
    expect(report.topProducts).toEqual([]);
    expect(report.topCustomers).toEqual([]);
    expect(report.recentActivity).toEqual([]);
  });

  it("aggregates products, customers, and adoption metrics", () => {
    const report = buildWishlistAnalytics([
      customer("gid://shopify/Customer/1", [PRODUCT_A, PRODUCT_B], {
        updatedAt: "2026-05-12T10:00:00Z",
      }),
      customer("gid://shopify/Customer/2", [PRODUCT_A], {
        updatedAt: "2026-05-14T08:00:00Z",
      }),
      customer("gid://shopify/Customer/3", []),
    ]);

    expect(report.summary.customersScanned).toBe(3);
    expect(report.summary.customersWithWishlist).toBe(2);
    expect(report.summary.totalWishlistItems).toBe(3);
    expect(report.summary.uniqueProductsWishlisted).toBe(2);
    expect(report.summary.averageItemsPerCustomer).toBe(1.5);
    expect(report.summary.adoptionRate).toBe(67);

    expect(report.topProducts[0]).toMatchObject({
      productId: PRODUCT_A,
      saveCount: 2,
      customerCount: 2,
    });
    expect(report.topCustomers[0].itemCount).toBe(2);
    expect(report.recentActivity[0].id).toBe("gid://shopify/Customer/2");
  });

  it("reads legacy metafields when primary metafield is empty", () => {
    const report = buildWishlistAnalytics([
      {
        id: "gid://shopify/Customer/9",
        displayName: "Legacy shopper",
        email: "legacy@example.com",
        metafield: null,
        legacyMetafield: {
          jsonValue: [PRODUCT_C],
          updatedAt: "2026-05-01T09:00:00Z",
        },
      },
    ]);

    expect(report.summary.customersWithWishlist).toBe(1);
    expect(report.topProducts[0].productId).toBe(PRODUCT_C);
  });

  it("marks summary as truncated when option is set", () => {
    const report = buildWishlistAnalytics([customer("gid://shopify/Customer/1", [PRODUCT_A])], {
      truncated: true,
    });

    expect(report.summary.truncated).toBe(true);
  });
});
