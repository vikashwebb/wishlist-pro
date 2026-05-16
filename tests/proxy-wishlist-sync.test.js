import { beforeEach, describe, expect, it, vi } from "vitest";

const { readWishlist, writeWishlist, resolveProducts, authenticate } = vi.hoisted(
  () => ({
    readWishlist: vi.fn(),
    writeWishlist: vi.fn(),
    resolveProducts: vi.fn(),
    authenticate: vi.fn(),
  }),
);

vi.mock("../app/shopify.server.js", () => ({
  authenticate: {
    public: {
      appProxy: authenticate,
    },
  },
  unauthenticated: {
    admin: vi.fn(),
  },
}));

vi.mock("../app/utils/app-proxy.server.js", () => ({
  authenticateAppProxy: authenticate,
}));

vi.mock("../app/models/wishlist.server.js", async () => {
  const actual = await vi.importActual("../app/models/wishlist.server.js");
  return {
    ...actual,
    readWishlist,
    writeWishlist,
    resolveProducts,
    isProtectedCustomerDataError: actual.isProtectedCustomerDataError,
    json: actual.json,
    toCustomerGid: actual.toCustomerGid,
    toProductGid: actual.toProductGid,
  };
});

import { action } from "../app/routes/proxy.wishlist.sync.jsx";

const PRODUCT_A = "gid://shopify/Product/111";
const PRODUCT_B = "gid://shopify/Product/222";
const CUSTOMER_GID = "gid://shopify/Customer/999";

function buildRequest(fields) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return new Request("https://example.com/proxy/wishlist/sync", {
    method: "POST",
    body: formData,
  });
}

describe("proxy wishlist sync action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticate.mockResolvedValue({
      session: { shop: "demo.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
  });

  it("requires a logged-in customer", async () => {
    const response = await action({
      request: buildRequest({
        customerId: "",
        state: JSON.stringify({ productIds: [], handles: [] }),
      }),
    });

    expect(response.status).toBe(401);
  });

  it("merges guest product IDs into the customer metafield", async () => {
    readWishlist.mockResolvedValue({
      items: [PRODUCT_A],
      metafield: { id: "meta-1" },
    });
    writeWishlist.mockResolvedValue({
      items: [PRODUCT_A, PRODUCT_B],
      metafield: { id: "meta-1" },
    });

    const response = await action({
      request: buildRequest({
        customerId: "999",
        state: JSON.stringify({
          productIds: [PRODUCT_B],
          handles: [],
        }),
      }),
    });

    const payload = await response.json();
    expect(payload.synced).toBe(true);
    expect(writeWishlist).toHaveBeenCalledWith(
      expect.anything(),
      "999",
      [PRODUCT_A, PRODUCT_B],
    );
  });

  it("skips write when guest state adds nothing new", async () => {
    readWishlist.mockResolvedValue({
      items: [PRODUCT_A],
      metafield: { id: "meta-1" },
    });

    const response = await action({
      request: buildRequest({
        customerId: CUSTOMER_GID,
        state: JSON.stringify({
          productIds: [PRODUCT_A],
          handles: [],
        }),
      }),
    });

    const payload = await response.json();
    expect(payload.synced).toBe(false);
    expect(writeWishlist).not.toHaveBeenCalled();
  });

  it("resolves guest handles into product IDs before merge", async () => {
    readWishlist.mockResolvedValue({ items: [], metafield: null });
    resolveProducts.mockResolvedValue([
      {
        id: PRODUCT_B,
        handle: "shirt",
      },
    ]);
    writeWishlist.mockResolvedValue({
      items: [PRODUCT_B],
      metafield: { id: "meta-2" },
    });

    const response = await action({
      request: buildRequest({
        customerId: "999",
        state: JSON.stringify({
          productIds: [],
          handles: ["shirt"],
        }),
      }),
    });

    const payload = await response.json();
    expect(payload.synced).toBe(true);
    expect(resolveProducts).toHaveBeenCalledWith(expect.anything(), {
      handles: ["shirt"],
    });
    expect(writeWishlist).toHaveBeenCalledWith(
      expect.anything(),
      "999",
      [PRODUCT_B],
    );
  });

  it("returns localOnly when protected customer data is blocked", async () => {
    readWishlist.mockRejectedValue(
      new Error("This app is not approved to access the Customer object."),
    );

    const response = await action({
      request: buildRequest({
        customerId: "999",
        state: JSON.stringify({
          productIds: [PRODUCT_B],
          handles: [],
        }),
      }),
    });

    const payload = await response.json();
    expect(payload.localOnly).toBe(true);
    expect(payload.synced).toBe(false);
  });
});
