import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticate, submitSupportContact } = vi.hoisted(() => ({
  authenticate: vi.fn(),
  submitSupportContact: vi.fn(),
}));

vi.mock("../app/shopify.server.js", () => ({
  authenticate: {
    admin: authenticate,
  },
}));

vi.mock("../app/models/support-contact.server.js", () => ({
  submitSupportContact,
}));

import { action } from "../app/routes/app.api.support-contact.jsx";

describe("POST /app/api/support-contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticate.mockResolvedValue({
      session: { shop: "demo.myshopify.com" },
    });
    submitSupportContact.mockResolvedValue({ ok: true, id: "formspree-123" });
  });

  it("forwards validated contact fields to Formspree helper", async () => {
    const formData = new FormData();
    formData.append("reason", "Smart Alerts");
    formData.append("priority", "Normal — general question");
    formData.append("name", "Alex");
    formData.append("email", "alex@example.com");
    formData.append("subject", "Need help");
    formData.append("message", "Smart Recovery is not tagging customers.");
    formData.append("affectedArea", "Smart Alerts page");
    formData.append("_gotcha", "");

    const response = await action({
      request: new Request("https://example.com/app/api/support-contact", {
        method: "POST",
        body: formData,
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      id: "formspree-123",
    });
    expect(submitSupportContact).toHaveBeenCalledWith({
      shopDomain: "demo.myshopify.com",
      reason: "Smart Alerts",
      priority: "Normal — general question",
      name: "Alex",
      email: "alex@example.com",
      subject: "Need help",
      message: "Smart Recovery is not tagging customers.",
      affectedArea: "Smart Alerts page",
      gotcha: "",
    });
  });

  it("returns 422 when contact delivery fails", async () => {
    submitSupportContact.mockRejectedValue(
      new Error("Could not deliver your message. Confirm the Formspree form is activated, then try again."),
    );

    const formData = new FormData();
    formData.append("reason", "Bug or something broken");
    formData.append("name", "Alex");
    formData.append("email", "alex@example.com");
    formData.append("message", "Help");

    const response = await action({
      request: new Request("https://example.com/app/api/support-contact", {
        method: "POST",
        body: formData,
      }),
    });

    expect(response.status).toBe(422);
    expect((await response.json()).error).toMatch(/Formspree form is activated/);
  });
});
