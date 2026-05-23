import { describe, expect, it } from "vitest";
import { splitAppLinkPath } from "../app/utils/app-navigation.js";

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
