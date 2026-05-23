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

export function buildWishlistExportCsv({
  shopDomain,
  summary,
  customers = [],
  products = [],
}) {
  const lines = [
    "# Wishlist Pro export",
    `# Shop: ${shopDomain || "unknown"}`,
    `# Generated: ${new Date().toISOString()}`,
    "",
    csvRow(["metric", "value"]),
    csvRow(["customers_scanned", summary?.customersScanned ?? 0]),
    csvRow(["customers_with_wishlist", summary?.customersWithWishlist ?? 0]),
    csvRow(["total_saved_items", summary?.totalWishlistItems ?? 0]),
    csvRow(["unique_products_saved", summary?.uniqueProductsWishlisted ?? 0]),
    csvRow(["adoption_rate_percent", summary?.adoptionRate ?? 0]),
    csvRow(["average_items_per_customer", summary?.averageItemsPerCustomer ?? 0]),
    csvRow(["data_truncated", summary?.truncated ? "yes" : "no"]),
    "",
    csvRow([
      "customer_id",
      "display_name",
      "email",
      "item_count",
      "updated_at",
      "product_ids",
    ]),
  ];

  customers.forEach((customer) => {
    lines.push(
      csvRow([
        customer.id,
        customer.displayName,
        customer.email,
        customer.itemCount,
        customer.updatedAt,
        (customer.productIds || []).join("; "),
      ]),
    );
  });

  lines.push("");
  lines.push(
    csvRow([
      "product_id",
      "title",
      "handle",
      "save_count",
      "customer_count",
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
        product.storefrontUrl,
      ]),
    );
  });

  return `${lines.join("\n")}\n`;
}

export async function loadWishlistExportCsv(admin, shopDomain) {
  const analytics = await getWishlistAnalytics(admin);
  const customers = analytics.exportCustomers || [];

  const products = await enrichExportProducts(
    admin,
    analytics.exportProductCounts || [],
  );

  return buildWishlistExportCsv({
    shopDomain,
    summary: analytics.summary,
    customers,
    products,
  });
}

async function enrichExportProducts(admin, productCounts) {
  if (!productCounts.length) {
    return [];
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
      variables: {
        ids: productCounts.map((entry) => entry.productId),
      },
    },
  );

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  const productById = new Map(
    (payload.data?.nodes ?? [])
      .filter((node) => node?.id)
      .map((node) => [node.id, node]),
  );

  return productCounts.map((entry) => {
    const product = productById.get(entry.productId);

    return {
      productId: entry.productId,
      saveCount: entry.saveCount,
      customerCount: entry.customerCount,
      title: product?.title ?? entry.productId.split("/").pop(),
      handle: product?.handle ?? null,
      storefrontUrl: product?.handle ? `/products/${product.handle}` : null,
    };
  });
}
