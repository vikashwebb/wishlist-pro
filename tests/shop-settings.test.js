import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/db.server.js", () => ({
  default: {
    shopSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import prisma from "../app/db.server.js";
import {
  getShopSettings,
  normalizeWishlistPageHandle,
  normalizeWishlistPageTitle,
  updateShopSettings,
} from "../app/models/shop-settings.server.js";

describe("shop settings normalization", () => {
  it("uses default title when blank", () => {
    expect(normalizeWishlistPageTitle("   ")).toBe("Wishlist");
    expect(normalizeWishlistPageTitle(" Saved Items ")).toBe("Saved Items");
  });

  it("normalizes page handles", () => {
    expect(normalizeWishlistPageHandle(" My Wishlist!! ")).toBe("my-wishlist");
    expect(normalizeWishlistPageHandle("---")).toBe("wishlist");
  });
});

describe("shop settings persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns defaults when shop is missing", async () => {
    await expect(getShopSettings("")).resolves.toEqual({
      wishlistRequiresLogin: false,
      wishlistPageTitle: "Wishlist",
      wishlistPageHandle: "wishlist",
    });
  });

  it("reads stored settings", async () => {
    prisma.shopSettings.findUnique.mockResolvedValue({
      wishlistRequiresLogin: true,
      wishlistPageTitle: "Favorites",
      wishlistPageHandle: "favorites",
    });

    await expect(getShopSettings("demo.myshopify.com")).resolves.toEqual({
      wishlistRequiresLogin: true,
      wishlistPageTitle: "Favorites",
      wishlistPageHandle: "favorites",
    });
  });

  it("upserts login rule and page settings", async () => {
    prisma.shopSettings.findUnique.mockResolvedValue(null);
    prisma.shopSettings.upsert.mockResolvedValue({
      wishlistRequiresLogin: true,
      wishlistPageTitle: "Saved",
      wishlistPageHandle: "saved",
    });

    const result = await updateShopSettings("demo.myshopify.com", {
      wishlistRequiresLogin: true,
      wishlistPageTitle: " Saved ",
      wishlistPageHandle: " Saved ",
    });

    expect(result).toEqual({
      wishlistRequiresLogin: true,
      wishlistPageTitle: "Saved",
      wishlistPageHandle: "saved",
    });
    expect(prisma.shopSettings.upsert).toHaveBeenCalled();
  });
});
