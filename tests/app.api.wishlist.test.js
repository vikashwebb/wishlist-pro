import { beforeEach, describe, expect, it, vi } from "vitest";

const { readWishlist, writeWishlist, authenticate } = vi.hoisted(() => ({
  readWishlist: vi.fn(),
  writeWishlist: vi.fn(),
  authenticate: vi.fn(),
}));

vi.mock("../app/shopify.server.js", () => ({
  authenticate: {
    admin: authenticate,
  },
}));

vi.mock("../app/models/wishlist.server.js", async () => {
  const actual = await vi.importActual("../app/models/wishlist.server.js");
  return {
    ...actual,
    readWishlist,
    writeWishlist,
  };
});

import { action, loader } from "../app/routes/app.api.wishlist.jsx";

const PRODUCT_A = "gid://shopify/Product/111";
const PRODUCT_B = "gid://shopify/Product/222";
const CUSTOMER_GID = "gid://shopify/Customer/999";

describe("admin wishlist API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticate.mockResolvedValue({
      admin: { graphql: vi.fn() },
      session: { shop: "demo.myshopify.com" },
    });
  });

  it("requires customerId on GET", async () => {
    const response = await loader({
      request: new Request("https://example.com/app/api/wishlist"),
    });

    expect(response.status).toBe(400);
  });

  it("reads wishlist for a customer", async () => {
    readWishlist.mockResolvedValue({
      items: [PRODUCT_A],
      customer: { id: CUSTOMER_GID },
      metafield: { id: "meta-1" },
    });

    const response = await loader({
      request: new Request(
        `https://example.com/app/api/wishlist?customerId=${encodeURIComponent(CUSTOMER_GID)}`,
      ),
    });

    const payload = await response.json();
    expect(payload.items).toEqual([PRODUCT_A]);
  });

  it("adds a product to the wishlist", async () => {
    readWishlist.mockResolvedValue({ items: [] });
    writeWishlist.mockResolvedValue({
      items: [PRODUCT_A],
      metafield: { id: "meta-1" },
    });

    const formData = new FormData();
    formData.append("customerId", CUSTOMER_GID);
    formData.append("productId", PRODUCT_A);
    formData.append("intent", "add");

    const response = await action({
      request: new Request("https://example.com/app/api/wishlist", {
        method: "POST",
        body: formData,
      }),
    });

    const payload = await response.json();
    expect(payload.intent).toBe("add");
    expect(payload.items).toEqual([PRODUCT_A]);
  });

  it("removes a product using normalized GIDs", async () => {
    readWishlist.mockResolvedValue({ items: [PRODUCT_A, PRODUCT_B] });
    writeWishlist.mockResolvedValue({
      items: [PRODUCT_B],
      metafield: { id: "meta-1" },
    });

    const formData = new FormData();
    formData.append("customerId", CUSTOMER_GID);
    formData.append("productId", PRODUCT_A);
    formData.append("intent", "remove");

    const response = await action({
      request: new Request("https://example.com/app/api/wishlist", {
        method: "POST",
        body: formData,
      }),
    });

    const payload = await response.json();
    expect(payload.items).toEqual([PRODUCT_B]);
    expect(writeWishlist).toHaveBeenCalledWith(
      expect.anything(),
      CUSTOMER_GID,
      [PRODUCT_B],
    );
  });

  it("rejects invalid intents", async () => {
    const formData = new FormData();
    formData.append("customerId", CUSTOMER_GID);
    formData.append("productId", PRODUCT_A);
    formData.append("intent", "toggle");

    const response = await action({
      request: new Request("https://example.com/app/api/wishlist", {
        method: "POST",
        body: formData,
      }),
    });

    expect(response.status).toBe(400);
    expect(writeWishlist).not.toHaveBeenCalled();
  });
});
