/* eslint-disable react/prop-types */
import { useState } from "react";
import { useLocation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

async function buildExportRequest(shopify, search) {
  const headers = {};

  if (typeof shopify?.idToken === "function") {
    headers.Authorization = `Bearer ${await shopify.idToken()}`;
  }

  return {
    url: `/app/api/analytics-export${search}`,
    init: {
      method: "GET",
      headers,
      credentials: "same-origin",
    },
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function mergeExportSearch(locationSearch, exportFilters = {}) {
  const params = new URLSearchParams(
    locationSearch.startsWith("?") ? locationSearch.slice(1) : locationSearch,
  );

  if (exportFilters.dateFrom) {
    params.set("dateFrom", exportFilters.dateFrom);
  } else {
    params.delete("dateFrom");
  }

  if (exportFilters.dateTo) {
    params.set("dateTo", exportFilters.dateTo);
  } else {
    params.delete("dateTo");
  }

  if (exportFilters.reportType) {
    params.set("reportType", exportFilters.reportType);
  } else {
    params.delete("reportType");
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function ExportCsvButton({
  className,
  label = "Export CSV",
  exportFilters,
  disabled = false,
}) {
  const location = useLocation();
  const shopify = useAppBridge();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (disabled) {
      return;
    }

    setLoading(true);

    try {
      const search = mergeExportSearch(location.search, exportFilters);
      const { url, init } = await buildExportRequest(shopify, search);
      const response = await fetch(url, init);

      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "Could not export wishlist data.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const dateStamp = new Date().toISOString().slice(0, 10);
      const filename =
        match?.[1] ?? `wishlist-pro-export-${dateStamp}.csv`;

      downloadBlob(blob, filename);
      shopify.toast.show("CSV export downloaded");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not export wishlist data.";
      shopify.toast.show(message, { isError: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleExport}
      disabled={loading || disabled}
    >
      {loading ? "Exporting…" : label}
    </button>
  );
}
