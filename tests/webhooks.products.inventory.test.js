import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  webhookAuthenticate,
  unauthenticatedAdmin,
  getSmartAlertSettings,
  handleProductUpdateForSmartAlerts,
  handleInventoryUpdateForSmartAlerts,
  queueSmartRecoveryAlerts,
} = vi.hoisted(() => ({
  webhookAuthenticate: vi.fn(),
  unauthenticatedAdmin: vi.fn(),
  getSmartAlertSettings: vi.fn(),
  handleProductUpdateForSmartAlerts: vi.fn(),
  handleInventoryUpdateForSmartAlerts: vi.fn(),
  queueSmartRecoveryAlerts: vi.fn(),
}));

vi.mock("../app/shopify.server.js", () => ({
  authenticate: {
    webhook: webhookAuthenticate,
  },
  unauthenticated: {
    admin: unauthenticatedAdmin,
  },
}));

vi.mock("../app/models/smart-alerts.server.js", () => ({
  getSmartAlertSettings,
  handleProductUpdateForSmartAlerts,
  handleInventoryUpdateForSmartAlerts,
  queueSmartRecoveryAlerts,
}));

import { action } from "../app/routes/webhooks.products.inventory.jsx";

describe("products/inventory webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unauthenticatedAdmin.mockResolvedValue({ admin: { graphql: vi.fn() } });
    getSmartAlertSettings.mockResolvedValue({
      smartRecoveryEnabled: true,
      smartRecoveryDelayDays: 7,
      smartPriceAlertsEnabled: true,
      smartRestockAlertsEnabled: true,
    });
    handleProductUpdateForSmartAlerts.mockResolvedValue({ matched: 1 });
    handleInventoryUpdateForSmartAlerts.mockResolvedValue({ matched: 1 });
    queueSmartRecoveryAlerts.mockResolvedValue({ queued: 2 });
  });

  it("handles products/update webhook", async () => {
    webhookAuthenticate.mockResolvedValue({
      topic: "PRODUCTS_UPDATE",
      shop: "demo.myshopify.com",
      payload: { admin_graphql_api_id: "gid://shopify/Product/1", handle: "tee" },
    });

    const response = await action({
      request: new Request("https://example.com/webhooks/products/inventory", {
        method: "POST",
      }),
    });

    expect(response.status).toBe(200);
    expect(handleProductUpdateForSmartAlerts).toHaveBeenCalled();
    expect(queueSmartRecoveryAlerts).not.toHaveBeenCalled();
  });

  it("handles inventory_levels/update webhook", async () => {
    webhookAuthenticate.mockResolvedValue({
      topic: "INVENTORY_LEVELS_UPDATE",
      shop: "demo.myshopify.com",
      payload: { available: 5, inventory_item_id: 123 },
    });

    await action({
      request: new Request("https://example.com/webhooks/products/inventory", {
        method: "POST",
      }),
    });

    expect(handleInventoryUpdateForSmartAlerts).toHaveBeenCalled();
  });

  it("queues Smart Recovery on customers/update when enabled", async () => {
    webhookAuthenticate.mockResolvedValue({
      topic: "CUSTOMERS_UPDATE",
      shop: "demo.myshopify.com",
      payload: { admin_graphql_api_id: "gid://shopify/Customer/1" },
    });

    await action({
      request: new Request("https://example.com/webhooks/products/inventory", {
        method: "POST",
      }),
    });

    expect(queueSmartRecoveryAlerts).toHaveBeenCalledWith(
      expect.anything(),
      "demo.myshopify.com",
      expect.objectContaining({ smartRecoveryEnabled: true }),
    );
  });

  it("skips Smart Recovery when disabled", async () => {
    getSmartAlertSettings.mockResolvedValue({
      smartRecoveryEnabled: false,
      smartRecoveryDelayDays: 7,
    });
    webhookAuthenticate.mockResolvedValue({
      topic: "CUSTOMERS_UPDATE",
      shop: "demo.myshopify.com",
      payload: {},
    });

    await action({
      request: new Request("https://example.com/webhooks/products/inventory", {
        method: "POST",
      }),
    });

    expect(queueSmartRecoveryAlerts).not.toHaveBeenCalled();
  });
});
