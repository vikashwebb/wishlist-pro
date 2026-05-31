import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticateWebhook = vi.fn();

vi.mock("../app/shopify.server", () => ({
  authenticate: {
    webhook: (...args) => authenticateWebhook(...args),
  },
}));

vi.mock("../app/models/compliance-webhooks.server", () => ({
  handleComplianceWebhook: vi.fn(),
}));

import { handleComplianceWebhook } from "../app/models/compliance-webhooks.server";
import { complianceWebhookAction } from "../app/models/compliance-webhook-action.server";

describe("complianceWebhookAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies HMAC via authenticate.webhook and returns 200", async () => {
    authenticateWebhook.mockResolvedValue({
      topic: "customers/data_request",
      shop: "demo.myshopify.com",
      payload: { customer: { id: 1 } },
    });

    const response = await complianceWebhookAction({
      request: new Request("https://example.com/webhooks/customers/data_request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Hmac-Sha256": "test",
        },
        body: JSON.stringify({ shop_id: 1 }),
      }),
    });

    expect(authenticateWebhook).toHaveBeenCalledTimes(1);
    expect(handleComplianceWebhook).toHaveBeenCalledWith("customers/data_request", {
      shop: "demo.myshopify.com",
      payload: { customer: { id: 1 } },
    });
    expect(response.status).toBe(200);
  });

  it("propagates 401 when HMAC verification fails", async () => {
    authenticateWebhook.mockRejectedValue(
      new Response("Unauthorized", { status: 401 }),
    );

    await expect(
      complianceWebhookAction({
        request: new Request("https://example.com/webhooks/customers/redact", {
          method: "POST",
          body: "{}",
        }),
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
