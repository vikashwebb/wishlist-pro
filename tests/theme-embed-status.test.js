import { describe, expect, it } from "vitest";
import {
  getWishlistEmbedStatusFromSettingsData,
  isAppEmbedEnabledInSettingsData,
  stripSettingsDataComments,
} from "../app/models/theme-embed-status.server.js";

const SAMPLE_SETTINGS = `/*
 * --- DO NOT EDIT ---
 */
{
  "current": {
    "blocks": {
      "17878678986028907411": {
        "type": "shopify://apps/wishlist-pro/blocks/wishlist-product-cards/abc-123",
        "disabled": false,
        "settings": {}
      },
      "17878678986028907412": {
        "type": "shopify://apps/wishlist-pro/blocks/wishlist-product-embed/def-456",
        "disabled": true,
        "settings": {}
      }
    }
  }
}`;

describe("theme-embed-status.server", () => {
  it("strips leading block comments before parsing JSON", () => {
    const json = stripSettingsDataComments(SAMPLE_SETTINGS);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("detects enabled product cards embed", () => {
    expect(
      isAppEmbedEnabledInSettingsData(SAMPLE_SETTINGS, "wishlist-product-cards"),
    ).toBe(true);
    expect(
      isAppEmbedEnabledInSettingsData(SAMPLE_SETTINGS, "wishlist-product-embed"),
    ).toBe(false);
  });

  it("returns combined embed status", () => {
    expect(getWishlistEmbedStatusFromSettingsData(SAMPLE_SETTINGS)).toEqual({
      productCardsEnabled: true,
      productEmbedEnabled: false,
    });
  });

  it("returns false when embed was never enabled", () => {
    expect(
      isAppEmbedEnabledInSettingsData('{"current":{"blocks":{}}}', "wishlist-product-cards"),
    ).toBe(false);
  });
});
