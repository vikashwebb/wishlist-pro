import { describe, expect, it, vi } from "vitest";
import {
  buildSupportContactSubject,
  submitSupportContact,
} from "../app/models/support-contact.server.js";

describe("buildSupportContactSubject", () => {
  it("uses a custom subject when provided", () => {
    expect(
      buildSupportContactSubject({
        subject: "Theme embed issue",
        reason: "Theme embed or wishlist button",
        shopDomain: "demo.myshopify.com",
      }),
    ).toBe("Theme embed issue");
  });

  it("builds a default subject from reason and shop", () => {
    expect(
      buildSupportContactSubject({
        subject: "",
        reason: "Smart Setup & launch",
        shopDomain: "demo.myshopify.com",
      }),
    ).toBe("[WishMe] Smart Setup & launch — demo.myshopify.com");
  });
});

describe("submitSupportContact", () => {
  it("rejects missing message", async () => {
    await expect(
      submitSupportContact({
        shopDomain: "demo.myshopify.com",
        reason: "Bug or something broken",
        priority: "Normal",
        name: "Alex",
        email: "alex@example.com",
        subject: "",
        message: "   ",
        affectedArea: "",
        gotcha: "",
      }),
    ).rejects.toThrow("describe your issue");
  });

  it("posts JSON payload to Formspree when valid", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "fs-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await submitSupportContact({
      shopDomain: "demo.myshopify.com",
      reason: "Smart Alerts",
      priority: "Normal",
      name: "Alex",
      email: "alex@example.com",
      subject: "",
      message: "Need help with Smart Recovery",
      affectedArea: "Smart Alerts",
      gotcha: "",
    });

    expect(result).toEqual({ ok: true, id: "fs-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://formspree.io/f/mbdeqdlq",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.shop).toBe("demo.myshopify.com");
    expect(body.reason).toBe("Smart Alerts");
    expect(body._replyto).toBe("alex@example.com");
    expect(body._subject).toBe("[WishMe] Smart Alerts — demo.myshopify.com");

    vi.unstubAllGlobals();
  });

  it("rejects invalid email before calling Formspree", async () => {
    await expect(
      submitSupportContact({
        shopDomain: "demo.myshopify.com",
        reason: "Bug or something broken",
        priority: "Normal",
        name: "Alex",
        email: "not-an-email",
        subject: "",
        message: "Help please",
        affectedArea: "",
        gotcha: "",
      }),
    ).rejects.toThrow("valid reply-to email");
  });

  it("silently accepts honeypot spam", async () => {
    await expect(
      submitSupportContact({
        shopDomain: "demo.myshopify.com",
        reason: "Bug or something broken",
        priority: "Normal",
        name: "Bot",
        email: "bot@example.com",
        subject: "",
        message: "spam",
        affectedArea: "",
        gotcha: "filled",
      }),
    ).resolves.toEqual({ ok: true, skipped: true });
  });
});
