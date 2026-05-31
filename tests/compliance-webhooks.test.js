import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/db.server", () => ({
  default: {
    session: { deleteMany: vi.fn() },
    shopSettings: { delete: vi.fn() },
  },
}));

import db from "../app/db.server";
import { handleComplianceWebhook } from "../app/models/compliance-webhooks.server";

describe("compliance webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles customers/data_request without throwing", async () => {
    await expect(
      handleComplianceWebhook("customers/data_request", {
        shop: "demo.myshopify.com",
        payload: { customer: { id: 1, email: "a@b.com" } },
      }),
    ).resolves.toBeUndefined();
  });

  it("handles customers/redact without throwing", async () => {
    await expect(
      handleComplianceWebhook("customers/redact", {
        shop: "demo.myshopify.com",
        payload: { customer: { id: 1 } },
      }),
    ).resolves.toBeUndefined();
  });

  it("deletes shop data on shop/redact", async () => {
    await handleComplianceWebhook("shop/redact", {
      shop: "demo.myshopify.com",
      payload: {},
    });

    expect(db.session.deleteMany).toHaveBeenCalledWith({
      where: { shop: "demo.myshopify.com" },
    });
    expect(db.shopSettings.delete).toHaveBeenCalledWith({
      where: { shop: "demo.myshopify.com" },
    });
  });
});
