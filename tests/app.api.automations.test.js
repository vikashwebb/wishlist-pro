import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticate, updateSmartAlertSettings } = vi.hoisted(() => ({
  authenticate: vi.fn(),
  updateSmartAlertSettings: vi.fn(),
}));

vi.mock("../app/shopify.server.js", () => ({
  authenticate: {
    admin: authenticate,
  },
}));

vi.mock("../app/models/smart-alerts.server.js", () => ({
  updateSmartAlertSettings,
}));

import { action } from "../app/routes/app.api.automations.jsx";

describe("POST /app/api/automations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticate.mockResolvedValue({
      session: { shop: "demo.myshopify.com" },
    });
    updateSmartAlertSettings.mockResolvedValue({
      smartRecoveryEnabled: true,
      smartRecoveryDelayDays: 14,
      smartPriceAlertsEnabled: false,
      smartPriceDropMinPercent: 5,
      smartRestockAlertsEnabled: false,
    });
  });

  it("saves Smart Recovery settings from form data", async () => {
    const formData = new FormData();
    formData.append("smartRecoveryEnabled", "true");
    formData.append("smartRecoveryDelayDays", "14");
    formData.append("smartPriceDropMinPercent", "10");

    const response = await action({
      request: new Request("https://example.com/app/api/automations", {
        method: "POST",
        body: formData,
      }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(updateSmartAlertSettings).toHaveBeenCalledWith("demo.myshopify.com", {
      smartRecoveryEnabled: true,
      smartRecoveryDelayDays: 14,
      smartPriceAlertsEnabled: false,
      smartPriceDropMinPercent: 10,
      smartRestockAlertsEnabled: false,
    });
  });

  it("returns 422 when settings update fails", async () => {
    updateSmartAlertSettings.mockRejectedValue(new Error("Database unavailable"));

    const response = await action({
      request: new Request("https://example.com/app/api/automations", {
        method: "POST",
        body: new FormData(),
      }),
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Database unavailable" });
  });
});
