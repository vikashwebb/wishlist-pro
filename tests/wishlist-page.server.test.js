import { describe, expect, it } from "vitest";
import {
  getWishlistPagePath,
  getWishlistProxyPath,
} from "../app/models/wishlist-page.server.js";

describe("wishlist page paths", () => {
  it("builds storefront page paths", () => {
    expect(getWishlistPagePath()).toBe("/pages/wishlist");
    expect(getWishlistPagePath("saved-items")).toBe("/pages/saved-items");
  });

  it("builds app proxy wishlist path", () => {
    expect(getWishlistProxyPath()).toBe("/apps/wishlist-proxy/wishlist");
  });
});
