import { describe, expect, it } from "vitest";
import {
  embeddedAdminAppUrl,
  hasDemoProAccess,
  proUpgradeReturnUrl,
  shopHandleFromDomain,
} from "../app/billing.server.js";

describe("billing.server", () => {
  it("extracts store handle from shop domain", () => {
    expect(shopHandleFromDomain("cool-shop.myshopify.com")).toBe("cool-shop");
  });

  it("builds embedded admin return url", () => {
    expect(embeddedAdminAppUrl("cool-shop.myshopify.com", "/app/analytics")).toBe(
      "https://admin.shopify.com/store/cool-shop/apps/wishlist-pro/app/analytics",
    );
  });

  it("prefers embedded admin url when shop is known", () => {
    expect(proUpgradeReturnUrl("cool-shop.myshopify.com", "/app/analytics")).toBe(
      "https://admin.shopify.com/store/cool-shop/apps/wishlist-pro/app/analytics",
    );
  });

  it("grants demo pro for listed shops", () => {
    process.env.DEMO_PRO_SHOPS = "demo.myshopify.com, other.myshopify.com ";
    delete process.env.DEMO_PRO_ACCESS;
    expect(hasDemoProAccess("demo.myshopify.com")).toBe(true);
    expect(hasDemoProAccess("other.myshopify.com")).toBe(true);
    expect(hasDemoProAccess("real-store.myshopify.com")).toBe(false);
    delete process.env.DEMO_PRO_SHOPS;
  });

  it("grants demo pro for all shops when DEMO_PRO_ACCESS is true", () => {
    process.env.DEMO_PRO_ACCESS = "true";
    delete process.env.DEMO_PRO_SHOPS;
    expect(hasDemoProAccess("any-store.myshopify.com")).toBe(true);
    delete process.env.DEMO_PRO_ACCESS;
  });
});
