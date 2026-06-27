import { describe, expect, it } from "vitest";
import { invalidateWishlistBootstrapCache } from "../app/models/app-bootstrap.server.js";

describe("wishlist bootstrap cache", () => {
  it("exposes invalidateWishlistBootstrapCache for mutation routes", () => {
    expect(() => invalidateWishlistBootstrapCache("demo.myshopify.com")).not.toThrow();
    expect(() => invalidateWishlistBootstrapCache()).not.toThrow();
  });
});
