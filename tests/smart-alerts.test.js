import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/db.server.js", () => ({
  default: {
    shopSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    alertEvent: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import prisma from "../app/db.server.js";
import {
  SMART_ALERT_TAGS,
  getSmartAlertSettings,
  handleInventoryUpdateForSmartAlerts,
  handleProductUpdateForSmartAlerts,
  normalizeSmartAlertSettings,
  queueSmartRecoveryAlerts,
  tagCustomerForAlert,
  updateSmartAlertSettings,
} from "../app/models/smart-alerts.server.js";

describe("smart-alerts.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.shopSettings.findUnique.mockResolvedValue(null);
    prisma.shopSettings.upsert.mockResolvedValue({});
    prisma.alertEvent.create.mockResolvedValue({ id: 1 });
    prisma.alertEvent.count.mockResolvedValue(0);
  });

  it("normalizes alert settings defaults", () => {
    expect(normalizeSmartAlertSettings({})).toEqual({
      smartRecoveryEnabled: false,
      smartRecoveryDelayDays: 7,
      smartPriceAlertsEnabled: false,
      smartPriceDropMinPercent: 5,
      smartRestockAlertsEnabled: false,
    });
  });

  it("coerces alert delay and threshold values", () => {
    expect(
      normalizeSmartAlertSettings({
        smartRecoveryEnabled: true,
        smartRecoveryDelayDays: 99,
        smartPriceDropMinPercent: 150,
      }),
    ).toMatchObject({
      smartRecoveryEnabled: true,
      smartRecoveryDelayDays: 7,
      smartPriceDropMinPercent: 100,
    });
  });

  it("uses Shopify Email recovery tag constant", () => {
    expect(SMART_ALERT_TAGS.recovery).toBe("wishme-smart-recovery");
    expect(SMART_ALERT_TAGS.priceDrop).toBe("wishme-smart-price-drop");
    expect(SMART_ALERT_TAGS.restock).toBe("wishme-smart-restock");
  });

  it("persists Smart Recovery toggle and delay", async () => {
    prisma.shopSettings.findUnique.mockResolvedValue({
      smartRecoveryEnabled: false,
      smartRecoveryDelayDays: 7,
    });
    prisma.shopSettings.upsert.mockResolvedValue({
      smartRecoveryEnabled: true,
      smartRecoveryDelayDays: 14,
      smartPriceAlertsEnabled: false,
      smartPriceDropMinPercent: 5,
      smartRestockAlertsEnabled: false,
    });

    const result = await updateSmartAlertSettings("demo.myshopify.com", {
      smartRecoveryEnabled: true,
      smartRecoveryDelayDays: 14,
    });

    expect(result.smartRecoveryEnabled).toBe(true);
    expect(result.smartRecoveryDelayDays).toBe(14);
    expect(prisma.shopSettings.upsert).toHaveBeenCalled();
  });

  it("tags customers through Shopify Admin API", async () => {
    const graphql = vi.fn().mockResolvedValue({
      json: async () => ({
        data: {
          tagsAdd: {
            node: { id: "gid://shopify/Customer/1" },
            userErrors: [],
          },
        },
      }),
    });

    await tagCustomerForAlert({ graphql }, "gid://shopify/Customer/1", SMART_ALERT_TAGS.recovery);

    expect(graphql).toHaveBeenCalledWith(
      expect.stringContaining("tagsAdd"),
      expect.objectContaining({
        variables: {
          id: "gid://shopify/Customer/1",
          tags: [SMART_ALERT_TAGS.recovery],
        },
      }),
    );
  });

  it("returns zero when Smart Recovery is disabled", async () => {
    const result = await queueSmartRecoveryAlerts(
      { graphql: vi.fn() },
      "demo.myshopify.com",
      normalizeSmartAlertSettings({ smartRecoveryEnabled: false }),
    );

    expect(result).toEqual({ queued: 0 });
  });

  it("queues recovery tags for stale wishlist customers", async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const graphql = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            customers: {
              nodes: [
                {
                  id: "gid://shopify/Customer/1",
                  updatedAt: oldDate,
                  metafield: {
                    jsonValue: [{ handle: "tee", savedAt: oldDate }],
                  },
                },
                {
                  id: "gid://shopify/Customer/2",
                  updatedAt: new Date().toISOString(),
                  metafield: {
                    jsonValue: [{ handle: "hat" }],
                  },
                },
              ],
            },
          },
        }),
      })
      .mockResolvedValue({
        json: async () => ({
          data: {
            tagsAdd: { node: { id: "gid://shopify/Customer/1" }, userErrors: [] },
          },
        }),
      });

    const result = await queueSmartRecoveryAlerts(
      { graphql },
      "demo.myshopify.com",
      normalizeSmartAlertSettings({
        smartRecoveryEnabled: true,
        smartRecoveryDelayDays: 7,
      }),
    );

    expect(result.queued).toBe(1);
    expect(prisma.alertEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertType: "recovery",
          customerId: "gid://shopify/Customer/1",
        }),
      }),
    );
  });

  it("records price-drop alert events when enabled", async () => {
    prisma.shopSettings.findUnique.mockResolvedValue({
      smartPriceAlertsEnabled: true,
      smartPriceDropMinPercent: 5,
    });

    const result = await handleProductUpdateForSmartAlerts(
      { graphql: vi.fn() },
      "demo.myshopify.com",
      {
        admin_graphql_api_id: "gid://shopify/Product/1",
        handle: "tee",
        variants: [{ price: "19.99" }],
      },
    );

    expect(result.matched).toBe(1);
    expect(prisma.alertEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertType: "price_drop",
          handle: "tee",
        }),
      }),
    );
  });

  it("skips price-drop alerts when disabled", async () => {
    prisma.shopSettings.findUnique.mockResolvedValue({
      smartPriceAlertsEnabled: false,
    });

    const result = await handleProductUpdateForSmartAlerts(
      { graphql: vi.fn() },
      "demo.myshopify.com",
      {
        admin_graphql_api_id: "gid://shopify/Product/1",
        handle: "tee",
        variants: [{ price: "19.99" }],
      },
    );

    expect(result.matched).toBe(0);
    expect(prisma.alertEvent.create).not.toHaveBeenCalled();
  });

  it("records restock alert events when inventory is available", async () => {
    prisma.shopSettings.findUnique.mockResolvedValue({
      smartRestockAlertsEnabled: true,
    });

    const result = await handleInventoryUpdateForSmartAlerts(
      { graphql: vi.fn() },
      "demo.myshopify.com",
      { available: 3, inventory_item_id: 999 },
    );

    expect(result.matched).toBe(1);
    expect(prisma.alertEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          alertType: "restock",
          status: "pending",
        }),
      }),
    );
  });

  it("reads alert settings from shop settings row", async () => {
    prisma.shopSettings.findUnique.mockResolvedValue({
      smartRecoveryEnabled: true,
      smartRecoveryDelayDays: 3,
      smartPriceAlertsEnabled: true,
      smartPriceDropMinPercent: 10,
      smartRestockAlertsEnabled: false,
    });

    await expect(getSmartAlertSettings("demo.myshopify.com")).resolves.toEqual({
      smartRecoveryEnabled: true,
      smartRecoveryDelayDays: 3,
      smartPriceAlertsEnabled: true,
      smartPriceDropMinPercent: 10,
      smartRestockAlertsEnabled: false,
    });
  });
});

describe("theme-embed-status integration", () => {
  it("re-exports embed status helper for alerts docs", async () => {
    const { isAppEmbedEnabledInSettingsData } = await import(
      "../app/models/theme-embed-status.server.js"
    );
    expect(
      isAppEmbedEnabledInSettingsData(
        '{"current":{"blocks":{"1":{"type":"shopify://apps/wishlist/blocks/wishlist-product-cards/x","disabled":false}}}}',
        "wishlist-product-cards",
      ),
    ).toBe(true);
  });
});
