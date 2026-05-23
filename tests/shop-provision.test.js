import { describe, expect, it, vi } from "vitest";

vi.mock("../app/models/wishlist.server.js", () => ({
  ensureWishlistMetafieldDefinition: vi.fn().mockResolvedValue({ id: "def-1" }),
}));

vi.mock("../app/models/wishlist-page.server.js", () => ({
  getWishlistPageByHandle: vi.fn(),
  upsertWishlistPage: vi.fn(),
  ensureWishlistPageBodyCurrent: vi.fn(),
}));

import { provisionWishlistInfrastructure } from "../app/models/shop-provision.server";
import { ensureWishlistMetafieldDefinition } from "../app/models/wishlist.server";
import {
  ensureWishlistPageBodyCurrent,
  getWishlistPageByHandle,
  upsertWishlistPage,
} from "../app/models/wishlist-page.server";

describe("provisionWishlistInfrastructure", () => {
  it("ensures metafield definition on every run", async () => {
    getWishlistPageByHandle.mockResolvedValue(null);
    upsertWishlistPage.mockResolvedValue({
      page: { id: "page-1", handle: "wishlist" },
      mode: "created",
    });

    const admin = {};
    const result = await provisionWishlistInfrastructure(admin, {
      settings: { wishlistPageTitle: "Wishlist", wishlistPageHandle: "wishlist" },
      accessScopes: ["write_online_store_pages"],
    });

    expect(ensureWishlistMetafieldDefinition).toHaveBeenCalledWith(admin);
    expect(upsertWishlistPage).toHaveBeenCalled();
    expect(result.metafieldDefinitionEnsured).toBe(true);
    expect(result.wishlistPageCreated).toBe(true);
  });

  it("repairs an existing page without recreating it", async () => {
    getWishlistPageByHandle.mockResolvedValue({
      id: "page-1",
      handle: "wishlist",
      body: "<div></div>",
    });
    ensureWishlistPageBodyCurrent.mockResolvedValue({
      repaired: true,
      page: { id: "page-1", handle: "wishlist" },
    });

    const admin = {};
    const result = await provisionWishlistInfrastructure(admin, {
      settings: { wishlistPageTitle: "Wishlist", wishlistPageHandle: "wishlist" },
      accessScopes: ["write_content"],
    });

    expect(upsertWishlistPage).not.toHaveBeenCalled();
    expect(ensureWishlistPageBodyCurrent).toHaveBeenCalled();
    expect(result.wishlistPage?.handle).toBe("wishlist");
    expect(result.wishlistPageCreated).toBe(false);
  });

  it("skips page work when page scopes are missing", async () => {
    const admin = {};
    await provisionWishlistInfrastructure(admin, {
      settings: {},
      accessScopes: ["read_products"],
    });

    expect(getWishlistPageByHandle).not.toHaveBeenCalled();
  });
});
