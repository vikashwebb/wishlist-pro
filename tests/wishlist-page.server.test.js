import { describe, expect, it } from "vitest";
import {
  buildWishlistPageBody,
  getWishlistPagePath,
  getWishlistProxyPath,
  isLegacyWishlistPageBody,
  isWishlistPageBodyCurrent,
  needsWishlistPageBodyRepair,
} from "../app/models/wishlist-page.server.js";

describe("wishlist page paths", () => {
  it("builds storefront page paths", () => {
    expect(getWishlistPagePath()).toBe("/pages/wishlist");
    expect(getWishlistPagePath("saved-items")).toBe("/pages/saved-items");
  });

  it("builds app proxy wishlist path", () => {
    expect(getWishlistProxyPath()).toBe("/apps/wishlist-proxy/wishlist");
  });

  it("detects legacy redirect page bodies", () => {
    expect(
      isLegacyWishlistPageBody(
        '<meta http-equiv="refresh" content="0;url=/apps/wishlist-proxy/wishlist">',
      ),
    ).toBe(true);
    expect(
      isLegacyWishlistPageBody(
        "<script>location.replace('/apps/wishlist-proxy/wishlist')</script>",
      ),
    ).toBe(true);
    expect(needsWishlistPageBodyRepair(buildWishlistPageBody())).toBe(false);
  });

  it("embeds wishlist UI on the storefront page without redirecting to the proxy", () => {
    const body = buildWishlistPageBody({ title: "Wishlist" });
    const proxyPath = getWishlistProxyPath();

    expect(body).toContain("data-wishlist-page");
    expect(body).not.toContain("wishlist-pro-page__eyebrow");
    expect(body).not.toContain("wishlist-pro-page__header");
    expect(body).toContain(`${proxyPath}/theme.js`);
    expect(body).not.toContain("http-equiv=\"refresh\"");
    expect(body).not.toContain("location.replace");
    expect(isWishlistPageBodyCurrent(body, { title: "Wishlist" })).toBe(true);
  });

  it("flags duplicate wishlist widgets for repair", () => {
    const body = `${buildWishlistPageBody()}${buildWishlistPageBody()}`;
    expect(needsWishlistPageBodyRepair(body)).toBe(true);
  });
});
