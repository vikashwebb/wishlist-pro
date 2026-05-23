import { describe, expect, it } from "vitest";
import {
  EXPORT_MAX_RANGE_DAYS,
  addDaysToDateInput,
  getDefaultExportDateRange,
  getTodayDateInputValue,
  syncExportDateRange,
  validateExportDateRange,
} from "../app/utils/wishlist-export-dates.js";

describe("wishlist-export-dates", () => {
  it("rejects future end dates", () => {
    const result = validateExportDateRange("2026-05-01", "2099-01-01");

    expect(result.valid).toBe(false);
    expect(result.message).toContain("future");
  });

  it("rejects when start is after end", () => {
    const result = validateExportDateRange("2026-05-20", "2026-05-01");

    expect(result.valid).toBe(false);
    expect(result.message).toContain("on or before");
  });

  it("requires both dates", () => {
    expect(validateExportDateRange("2026-05-01", "").valid).toBe(false);
    expect(validateExportDateRange("", "2026-05-01").valid).toBe(false);
  });

  it("bumps end date when start is moved after end", () => {
    const today = getTodayDateInputValue();
    const to = addDaysToDateInput(today, -10);
    const from = addDaysToDateInput(today, -3);
    const synced = syncExportDateRange(from, to, "from");

    expect(synced.dateFrom <= synced.dateTo).toBe(true);
    expect(synced.dateTo).toBe(from);
  });

  it("pulls start date forward when end is moved before start", () => {
    const today = getTodayDateInputValue();
    const from = addDaysToDateInput(today, -3);
    const to = addDaysToDateInput(today, -12);
    const synced = syncExportDateRange(from, to, "to");

    expect(synced.dateFrom).toBe(to);
    expect(synced.dateFrom <= synced.dateTo).toBe(true);
  });

  it("clamps ranges longer than two months", () => {
    const today = getTodayDateInputValue();
    const to = addDaysToDateInput(today, -3);
    const from = addDaysToDateInput(today, -120);
    const synced = syncExportDateRange(from, to);

    expect(daysBetween(synced.dateFrom, synced.dateTo)).toBeLessThanOrEqual(
      EXPORT_MAX_RANGE_DAYS,
    );
    expect(synced.dateFrom <= synced.dateTo).toBe(true);
  });

  it("defaults to a 30-day window", () => {
    const range = getDefaultExportDateRange(30);

    expect(range.dateFrom <= range.dateTo).toBe(true);
    expect(daysBetween(range.dateFrom, range.dateTo)).toBe(30);
  });
});

function daysBetween(from, to) {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}
