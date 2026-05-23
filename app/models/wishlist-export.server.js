import { resolveExportDateRange } from "../utils/wishlist-export-dates";
import { getWishlistAnalytics } from "./wishlist-analytics.server";

function escapeCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function csvRow(values) {
  return values.map(escapeCsvCell).join(",");
}

function joinList(values, separator = "; ") {
  return (values || []).filter(Boolean).join(separator);
}

export const EXPORT_REPORT_TYPES = ["full", "customer", "product"];

export function normalizeExportDateParam(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const parsed = new Date(`${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return trimmed;
}

export function parseWishlistExportFilters(searchParams) {
  const reportType = searchParams.get("reportType")?.toLowerCase() ?? "full";
  const rawFrom = normalizeExportDateParam(searchParams.get("dateFrom"));
  const rawTo = normalizeExportDateParam(searchParams.get("dateTo"));
  const { dateFrom, dateTo } = resolveExportDateRange(rawFrom, rawTo);

  return {
    dateFrom,
    dateTo,
    reportType: EXPORT_REPORT_TYPES.includes(reportType) ? reportType : "full",
  };
}

export function filterCustomerRowsByDateRange(
  customerRows = [],
  { dateFrom, dateTo } = {},
) {
  if (!dateFrom && !dateTo) {
    return customerRows;
  }

  const fromMs = dateFrom
    ? new Date(`${dateFrom}T00:00:00.000Z`).getTime()
    : null;
  const toMs = dateTo ? new Date(`${dateTo}T23:59:59.999Z`).getTime() : null;

  return customerRows.filter((row) => {
    if (!row.updatedAt) {
      return false;
    }

    const updatedMs = new Date(row.updatedAt).getTime();
    if (Number.isNaN(updatedMs)) {
      return false;
    }

    if (fromMs != null && updatedMs < fromMs) {
      return false;
    }

    if (toMs != null && updatedMs > toMs) {
      return false;
    }

    return true;
  });
}

export function buildProductExportRowsFromCustomers(customerRows = []) {
  const productMap = new Map();

  customerRows.forEach((customer) => {
    (customer.productIds || []).forEach((productId) => {
      const current = productMap.get(productId) || {
        productId,
        saveCount: 0,
        customers: [],
        customerIds: new Set(),
      };

      current.saveCount += 1;
      if (!current.customerIds.has(customer.id)) {
        current.customerIds.add(customer.id);
        current.customers.push({
          id: customer.id,
          displayName: customer.displayName,
          email: customer.email,
        });
      }

      productMap.set(productId, current);
    });
  });

  return [...productMap.values()]
    .sort((left, right) => {
      if (right.customers.length !== left.customers.length) {
        return right.customers.length - left.customers.length;
      }

      return right.saveCount - left.saveCount;
    })
    .map((entry) => ({
      productId: entry.productId,
      saveCount: entry.saveCount,
      customerCount: entry.customers.length,
      customers: entry.customers,
    }));
}

function buildFilteredSummary(customerRows, productRows, truncated) {
  const totalWishlistItems = customerRows.reduce(
    (sum, row) => sum + row.itemCount,
    0,
  );
  const customersWithWishlist = customerRows.length;

  return {
    customersWithWishlist,
    totalWishlistItems,
    uniqueProductsWishlisted: productRows.length,
    averageItemsPerCustomer: customersWithWishlist
      ? Number((totalWishlistItems / customersWithWishlist).toFixed(1))
      : 0,
    truncated,
  };
}

export function buildWishlistExportCsv({
  shopDomain,
  summary,
  customers = [],
  products = [],
  filters = {},
}) {
  const { dateFrom, dateTo, reportType = "full" } = filters;
  const dateLabel =
    dateFrom || dateTo
      ? `${dateFrom ?? "…"} to ${dateTo ?? "…"}`
      : "all time";

  const lines = [
    "# Wishlist Pro export",
    `# Shop: ${shopDomain || "unknown"}`,
    `# Generated: ${new Date().toISOString()}`,
    `# Report: ${reportType}`,
    `# Date range: ${dateLabel}`,
    "",
    csvRow(["metric", "value"]),
    csvRow(["customers_in_report", summary?.customersWithWishlist ?? 0]),
    csvRow(["total_saved_items", summary?.totalWishlistItems ?? 0]),
    csvRow(["unique_products", summary?.uniqueProductsWishlisted ?? 0]),
    csvRow(["average_items_per_customer", summary?.averageItemsPerCustomer ?? 0]),
    csvRow(["data_truncated", summary?.truncated ? "yes" : "no"]),
  ];

  if (reportType === "full" || reportType === "customer") {
    lines.push("");
    lines.push(
      csvRow([
        "customer_id",
        "display_name",
        "email",
        "item_count",
        "last_updated",
        "product_titles",
        "product_handles",
        "product_ids",
      ]),
    );

    customers.forEach((customer) => {
      lines.push(
        csvRow([
          customer.id,
          customer.displayName,
          customer.email,
          customer.itemCount,
          customer.updatedAt,
          joinList(customer.productTitles),
          joinList(customer.productHandles),
          joinList(customer.productIds),
        ]),
      );
    });
  }

  if (reportType === "full" || reportType === "product") {
    lines.push("");
    lines.push(
      csvRow([
        "product_id",
        "title",
        "handle",
        "save_count",
        "customer_count",
        "customer_names",
        "customer_emails",
        "storefront_path",
      ]),
    );

    products.forEach((product) => {
      lines.push(
        csvRow([
          product.productId,
          product.title,
          product.handle,
          product.saveCount,
          product.customerCount,
          joinList(product.customerNames),
          joinList(product.customerEmails),
          product.storefrontUrl,
        ]),
      );
    });
  }

  return `${lines.join("\n")}\n`;
}

async function fetchProductsById(admin, productIds) {
  if (!productIds.length) {
    return new Map();
  }

  const response = await admin.graphql(
    `#graphql
      query WishlistExportProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
          }
        }
      }`,
    {
      variables: { ids: productIds },
    },
  );

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  return new Map(
    (payload.data?.nodes ?? [])
      .filter((node) => node?.id)
      .map((node) => [node.id, node]),
  );
}

async function enrichExportCustomers(admin, customerRows) {
  const productIds = [
    ...new Set(customerRows.flatMap((row) => row.productIds || [])),
  ];
  const productById = await fetchProductsById(admin, productIds);

  return customerRows.map((customer) => {
    const products = (customer.productIds || []).map(
      (productId) => productById.get(productId) ?? { id: productId },
    );

    return {
      ...customer,
      productTitles: products.map(
        (product) => product.title ?? product.id?.split("/").pop(),
      ),
      productHandles: products.map((product) => product.handle).filter(Boolean),
    };
  });
}

async function enrichExportProducts(admin, productRows) {
  if (!productRows.length) {
    return [];
  }

  const productById = await fetchProductsById(
    admin,
    productRows.map((entry) => entry.productId),
  );

  return productRows.map((entry) => {
    const product = productById.get(entry.productId);
    const customers = entry.customers || [];

    return {
      productId: entry.productId,
      saveCount: entry.saveCount,
      customerCount: entry.customerCount,
      title: product?.title ?? entry.productId.split("/").pop(),
      handle: product?.handle ?? null,
      storefrontUrl: product?.handle ? `/products/${product.handle}` : null,
      customerNames: customers.map((customer) => customer.displayName),
      customerEmails: customers.map((customer) => customer.email).filter(Boolean),
    };
  });
}

export function buildExportFilename({ reportType = "full", dateFrom, dateTo } = {}) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const range =
    dateFrom && dateTo
      ? `${dateFrom}-to-${dateTo}`
      : dateFrom
        ? `from-${dateFrom}`
        : dateTo
          ? `to-${dateTo}`
          : "all-time";

  return `wishlist-pro-${reportType}-${range}-${dateStamp}.csv`;
}

export async function loadWishlistExportCsv(admin, shopDomain, filters = {}) {
  const analytics = await getWishlistAnalytics(admin);
  const allCustomers = analytics.exportCustomers || [];
  const filteredCustomers = filterCustomerRowsByDateRange(allCustomers, filters);
  const productRows = buildProductExportRowsFromCustomers(filteredCustomers);

  const [customers, products] = await Promise.all([
    enrichExportCustomers(admin, filteredCustomers),
    enrichExportProducts(admin, productRows),
  ]);

  const summary = buildFilteredSummary(
    filteredCustomers,
    productRows,
    analytics.summary?.truncated,
  );

  return {
    csv: buildWishlistExportCsv({
      shopDomain,
      summary,
      customers,
      products,
      filters,
    }),
    filename: buildExportFilename(filters),
  };
}
