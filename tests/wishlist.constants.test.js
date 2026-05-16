import { describe, expect, it } from "vitest";
import {
  DEFINITION_NAME,
  KEY,
  LEGACY_NAMESPACE,
  NAMESPACE,
} from "../app/models/wishlist.js";

describe("wishlist metafield constants", () => {
  it("uses canonical namespace wishlist.items", () => {
    expect(NAMESPACE).toBe("wishlist");
    expect(KEY).toBe("items");
    expect(DEFINITION_NAME).toBeTruthy();
  });

  it("keeps legacy namespace for migration reads", () => {
    expect(LEGACY_NAMESPACE).toBe("wishlist_pro");
    expect(LEGACY_NAMESPACE).not.toBe(NAMESPACE);
  });
});
