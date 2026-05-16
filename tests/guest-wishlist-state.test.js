import { describe, expect, it } from "vitest";
import { parseGuestWishlistState } from "../app/models/guest-wishlist-state.server.js";

describe("parseGuestWishlistState", () => {
  it("returns empty lists for missing payload", () => {
    expect(parseGuestWishlistState()).toEqual({
      productIds: [],
      handles: [],
    });
  });

  it("parses product IDs and handles with deduplication", () => {
    expect(
      parseGuestWishlistState(
        JSON.stringify({
          productIds: [
            "gid://shopify/Product/1",
            "gid://shopify/Product/1",
            "  ",
          ],
          handles: ["shirt", "shirt", "pants"],
        }),
      ),
    ).toEqual({
      productIds: ["gid://shopify/Product/1"],
      handles: ["shirt", "pants"],
    });
  });

  it("throws for invalid JSON", () => {
    expect(() => parseGuestWishlistState("{bad json")).toThrow(
      "Invalid guest wishlist state",
    );
  });
});
