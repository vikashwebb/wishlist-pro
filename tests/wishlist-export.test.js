import { describe, expect, it } from "vitest";
import {
  buildExportFilename,
  buildProductExportRowsFromCustomers,
  buildWishlistExportCsv,
  filterCustomerRowsByDateRange,
  parseWishlistExportFilters,
} from "../app/models/wishlist-export.server.js";
import {
  addDaysToDateInput,
  getTodayDateInputValue,
} from "../app/utils/wishlist-export-dates.js";

const sampleCustomer = {
  id: "gid://shopify/Customer/1",
  displayName: "Jane",
  email: "jane@example.com",
  itemCount: 2,
  productIds: ["gid://shopify/Product/1", "gid://shopify/Product/2"],
  updatedAt: "2026-05-15T12:00:00Z",
  productTitles: ["Blue Tee", "Red Hat"],
  productHandles: ["blue-tee", "red-hat"],
};

const sampleProduct = {
  productId: "gid://shopify/Product/1",
  title: "Blue Tee",
  handle: "blue-tee",
  saveCount: 2,
  customerCount: 2,
  customerNames: ["Jane", "John"],
  customerEmails: ["jane@example.com", "john@example.com"],
  storefrontUrl: "/products/blue-tee",
};

describe("parseWishlistExportFilters", () => {
  it("parses date range and report type", () => {
    const filters = parseWishlistExportFilters(
      new URLSearchParams(
        "dateFrom=2026-05-01&dateTo=2026-05-20&reportType=product",
      ),
    );

    expect(filters.dateFrom).toBe("2026-05-01");
    expect(filters.dateTo).toBe("2026-05-20");
    expect(filters.reportType).toBe("product");
  });

  it("clamps ranges longer than two months on the server", () => {
    const today = getTodayDateInputValue();
    const to = addDaysToDateInput(today, -3);
    const from = addDaysToDateInput(today, -120);

    const filters = parseWishlistExportFilters(
      new URLSearchParams(`dateFrom=${from}&dateTo=${to}`),
    );

    const start = new Date(`${filters.dateFrom}T00:00:00.000Z`).getTime();
    const end = new Date(`${filters.dateTo}T00:00:00.000Z`).getTime();
    const days = Math.round((end - start) / (24 * 60 * 60 * 1000));

    expect(days).toBeLessThanOrEqual(62);
    expect(filters.dateTo).toBe(to);
  });

  it("falls back to full for unknown report types", () => {
    expect(
      parseWishlistExportFilters(new URLSearchParams("reportType=unknown")).reportType,
    ).toBe("full");
  });
});

describe("filterCustomerRowsByDateRange", () => {
  it("filters rows by updatedAt", () => {
    const rows = [
      sampleCustomer,
      {
        ...sampleCustomer,
        id: "gid://shopify/Customer/2",
        updatedAt: "2026-04-01T12:00:00Z",
      },
    ];

    const filtered = filterCustomerRowsByDateRange(rows, {
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31",
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("gid://shopify/Customer/1");
  });
});

describe("buildProductExportRowsFromCustomers", () => {
  it("aggregates customers per product", () => {
    const rows = buildProductExportRowsFromCustomers([
      sampleCustomer,
      {
        ...sampleCustomer,
        id: "gid://shopify/Customer/2",
        displayName: "John",
        email: "john@example.com",
        productIds: ["gid://shopify/Product/1"],
      },
    ]);

    const productOne = rows.find(
      (row) => row.productId === "gid://shopify/Product/1",
    );

    expect(productOne?.customerCount).toBe(2);
    expect(productOne?.customers.map((entry) => entry.displayName)).toEqual([
      "Jane",
      "John",
    ]);
  });
});

describe("buildWishlistExportCsv", () => {
  it("builds customer report with product titles", () => {
    const csv = buildWishlistExportCsv({
      shopDomain: "demo.myshopify.com",
      summary: {
        customersWithWishlist: 1,
        totalWishlistItems: 2,
        uniqueProductsWishlisted: 2,
        averageItemsPerCustomer: 2,
        truncated: false,
      },
      customers: [sampleCustomer],
      products: [],
      filters: {
        reportType: "customer",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-20",
      },
    });

    expect(csv).toContain("Report: customer");
    expect(csv).toContain("product_titles");
    expect(csv).toContain("Blue Tee; Red Hat");
    expect(csv).not.toContain("customer_names");
  });

  it("builds product report with customer names", () => {
    const csv = buildWishlistExportCsv({
      shopDomain: "demo.myshopify.com",
      summary: {
        customersWithWishlist: 2,
        totalWishlistItems: 2,
        uniqueProductsWishlisted: 1,
        averageItemsPerCustomer: 1,
        truncated: false,
      },
      customers: [],
      products: [sampleProduct],
      filters: { reportType: "product" },
    });

    expect(csv).toContain("customer_names");
    expect(csv).toContain("Jane; John");
    expect(csv).not.toContain("product_titles");
  });

  it("escapes commas in csv cells", () => {
    const csv = buildWishlistExportCsv({
      shopDomain: "demo.myshopify.com",
      summary: {
        customersWithWishlist: 1,
        totalWishlistItems: 1,
        uniqueProductsWishlisted: 1,
        averageItemsPerCustomer: 1,
        truncated: false,
      },
      customers: [
        {
          ...sampleCustomer,
          displayName: "Jane, Jr.",
          productTitles: ["Shirt, Slim"],
        },
      ],
      products: [],
      filters: { reportType: "customer" },
    });

    expect(csv).toContain('"Jane, Jr."');
    expect(csv).toContain('"Shirt, Slim"');
  });
});

describe("buildExportFilename", () => {
  it("includes report type and date range", () => {
    expect(
      buildExportFilename({
        reportType: "product",
        dateFrom: "2026-05-01",
        dateTo: "2026-05-20",
      }),
    ).toMatch(/^wishlist-pro-product-2026-05-01-to-2026-05-20-/);
  });
});
