import { describe, expect, it } from "vitest";
import { buildWishlistExportCsv } from "../app/models/wishlist-export.server.js";

describe("buildWishlistExportCsv", () => {
  it("includes summary, customers, and products", () => {
    const csv = buildWishlistExportCsv({
      shopDomain: "demo.myshopify.com",
      summary: {
        customersScanned: 10,
        customersWithWishlist: 2,
        totalWishlistItems: 5,
        uniqueProductsWishlisted: 3,
        adoptionRate: 20,
        averageItemsPerCustomer: 2.5,
        truncated: false,
      },
      customers: [
        {
          id: "gid://shopify/Customer/1",
          displayName: "Jane",
          email: "jane@example.com",
          itemCount: 2,
          productIds: ["gid://shopify/Product/1"],
          updatedAt: "2026-05-01T12:00:00Z",
        },
      ],
      products: [
        {
          productId: "gid://shopify/Product/1",
          title: "Blue Tee",
          handle: "blue-tee",
          saveCount: 2,
          customerCount: 1,
          storefrontUrl: "/products/blue-tee",
        },
      ],
    });

    expect(csv).toContain("demo.myshopify.com");
    expect(csv).toContain("customers_with_wishlist,2");
    expect(csv).toContain("jane@example.com");
    expect(csv).toContain("Blue Tee");
    expect(csv).toContain("gid://shopify/Product/1");
  });

  it("escapes commas in csv cells", () => {
    const csv = buildWishlistExportCsv({
      shopDomain: "demo.myshopify.com",
      summary: {
        customersScanned: 1,
        customersWithWishlist: 1,
        totalWishlistItems: 1,
        uniqueProductsWishlisted: 1,
        adoptionRate: 100,
        averageItemsPerCustomer: 1,
        truncated: false,
      },
      customers: [
        {
          id: "gid://shopify/Customer/1",
          displayName: "Jane, Jr.",
          email: "jane@example.com",
          itemCount: 1,
          productIds: [],
          updatedAt: null,
        },
      ],
      products: [],
    });

    expect(csv).toContain('"Jane, Jr."');
  });
});
