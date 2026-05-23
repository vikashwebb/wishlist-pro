/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import {
  EXPORT_MAX_RANGE_DAYS,
  daysBetweenDateInputs,
  getDefaultExportDateRange,
  getExportDatePickerBounds,
  syncExportDateRange,
  validateExportDateRange,
} from "../utils/wishlist-export-dates";
import { ExportCsvButton } from "./export-csv-button";
import styles from "../styles/app-analytics.module.css";

export function AnalyticsExportPanel({ buttonClassName }) {
  const defaults = getDefaultExportDateRange(30);
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom);
  const [dateTo, setDateTo] = useState(defaults.dateTo);
  const [reportType, setReportType] = useState("customer");

  const bounds = useMemo(
    () => getExportDatePickerBounds(dateFrom, dateTo),
    [dateFrom, dateTo],
  );

  const validation = useMemo(
    () => validateExportDateRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );

  const exportFilters = useMemo(() => {
    if (!validation.valid) {
      return { reportType };
    }

    const synced = syncExportDateRange(dateFrom, dateTo);

    return {
      dateFrom: synced.dateFrom,
      dateTo: synced.dateTo,
      reportType,
    };
  }, [dateFrom, dateTo, reportType, validation.valid]);

  const reportHint =
    reportType === "customer"
      ? "One row per customer with product names they saved."
      : reportType === "product"
        ? "One row per product with customer names who saved it."
        : "Summary metrics plus customer and product sections.";

  function applyRange(nextFrom, nextTo, changed) {
    const synced = syncExportDateRange(nextFrom, nextTo, changed);
    setDateFrom(synced.dateFrom);
    setDateTo(synced.dateTo);
  }

  return (
    <section className={styles.exportPanel} aria-label="Export options">
      <p className={styles.exportPanelTitle}>Export report</p>
      <p className={styles.exportPanelText}>
        Start date must be on or before the end date, neither can be in the
        future, and the range cannot exceed {EXPORT_MAX_RANGE_DAYS} days.
      </p>

      <div className={styles.exportFilters}>
        <label className={styles.exportField}>
          <span className={styles.exportLabel}>From</span>
          <input
            className={styles.exportInput}
            type="date"
            value={dateFrom}
            min={bounds.fromMin ?? undefined}
            max={bounds.fromMax ?? undefined}
            onChange={(event) =>
              applyRange(event.currentTarget.value, dateTo, "from")
            }
          />
        </label>

        <label className={styles.exportField}>
          <span className={styles.exportLabel}>To</span>
          <input
            className={styles.exportInput}
            type="date"
            value={dateTo}
            min={bounds.toMin ?? undefined}
            max={bounds.toMax ?? undefined}
            onChange={(event) =>
              applyRange(dateFrom, event.currentTarget.value, "to")
            }
          />
        </label>

        <label className={styles.exportField}>
          <span className={styles.exportLabel}>Report type</span>
          <select
            className={styles.exportInput}
            value={reportType}
            onChange={(event) => setReportType(event.currentTarget.value)}
          >
            <option value="customer">Customer-based</option>
            <option value="product">Product-based</option>
            <option value="full">Full (customers + products)</option>
          </select>
        </label>
      </div>

      <p className={styles.exportHint}>{reportHint}</p>

      {validation.valid ? (
        <p className={styles.exportRangeSummary}>
          Exporting {dateFrom} → {dateTo} (
          {daysBetweenDateInputs(dateFrom, dateTo) + 1} days)
        </p>
      ) : (
        <p className={styles.exportError} role="alert">
          {validation.message}
        </p>
      )}

      <div className={styles.exportActions}>
        <ExportCsvButton
          className={buttonClassName}
          exportFilters={exportFilters}
          disabled={!validation.valid}
        />
        <button
          type="button"
          className={styles.exportResetButton}
          onClick={() => {
            const reset = getDefaultExportDateRange(30);
            setDateFrom(reset.dateFrom);
            setDateTo(reset.dateTo);
          }}
        >
          Reset to last 30 days
        </button>
      </div>
    </section>
  );
}
