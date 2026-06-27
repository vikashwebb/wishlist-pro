import { describe, expect, it } from "vitest";
import { splitAppLinkPath } from "../app/utils/app-navigation.js";
import {
  shouldRevalidateAppLayout,
  shouldRevalidateBootstrapPage,
  shouldRevalidateConfigurePage,
  shouldRevalidateSameAppPage,
} from "../app/utils/app-route-revalidation.js";

describe("splitAppLinkPath", () => {
  it("returns pathname only when there is no hash", () => {
    expect(splitAppLinkPath("/app/setup")).toEqual({
      pathname: "/app/setup",
      hash: "",
    });
  });

  it("splits pathname and hash", () => {
    expect(splitAppLinkPath("/app/setup#qa-lab")).toEqual({
      pathname: "/app/setup",
      hash: "qa-lab",
    });
  });
});

describe("shouldRevalidateAppLayout", () => {
  it("skips parent loader when navigating between /app routes", () => {
    expect(
      shouldRevalidateAppLayout({
        currentUrl: new URL("https://example.com/app"),
        nextUrl: new URL("https://example.com/app/configure"),
        defaultShouldRevalidate: true,
      }),
    ).toBe(false);
  });

  it("revalidates when leaving the embedded app shell", () => {
    expect(
      shouldRevalidateAppLayout({
        currentUrl: new URL("https://example.com/app/plan"),
        nextUrl: new URL("https://example.com/auth/login"),
        defaultShouldRevalidate: true,
      }),
    ).toBe(true);
  });
});

describe("shouldRevalidateConfigurePage", () => {
  it("skips bootstrap reload for hash-only tab changes", () => {
    expect(
      shouldRevalidateConfigurePage({
        currentUrl: new URL("https://example.com/app/configure#storefront"),
        nextUrl: new URL("https://example.com/app/configure#theme"),
        formMethod: "GET",
        defaultShouldRevalidate: true,
      }),
    ).toBe(false);
  });

  it("revalidates after form submissions", () => {
    expect(
      shouldRevalidateConfigurePage({
        currentUrl: new URL("https://example.com/app/configure#storefront"),
        nextUrl: new URL("https://example.com/app/configure#storefront"),
        formMethod: "POST",
        defaultShouldRevalidate: true,
      }),
    ).toBe(true);
  });
});

describe("shouldRevalidateBootstrapPage", () => {
  it("skips bootstrap reload when switching between Home and Smart Setup", () => {
    expect(
      shouldRevalidateBootstrapPage({
        currentUrl: new URL("https://example.com/app"),
        nextUrl: new URL("https://example.com/app/configure"),
        formMethod: "GET",
        defaultShouldRevalidate: true,
      }),
    ).toBe(false);
  });
});

describe("shouldRevalidateSameAppPage", () => {
  it("skips reload when navigating to the same pathname", () => {
    expect(
      shouldRevalidateSameAppPage({
        currentUrl: new URL("https://example.com/app/help"),
        nextUrl: new URL("https://example.com/app/help"),
        formMethod: "GET",
        defaultShouldRevalidate: true,
      }),
    ).toBe(false);
  });

  it("revalidates when pathname changes", () => {
    expect(
      shouldRevalidateSameAppPage({
        currentUrl: new URL("https://example.com/app/help"),
        nextUrl: new URL("https://example.com/app/plan"),
        formMethod: "GET",
        defaultShouldRevalidate: true,
      }),
    ).toBe(true);
  });
});
