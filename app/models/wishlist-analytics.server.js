import { KEY, LEGACY_NAMESPACE, NAMESPACE } from "./wishlist";
import { isProtectedCustomerDataError, normalizeWishlistItems } from "./wishlist.server";
import { logWishlistError } from "../utils/logger.server";

const CUSTOMERS_PAGE_SIZE = 100;
const MAX_CUSTOMER_PAGES = 10;
const TOP_PRODUCTS_LIMIT = 8;
const TOP_CUSTOMERS_LIMIT = 8;
const RECENT_ACTIVITY_LIMIT = 6;

function readCustomerWishlistItems(customer) {
  const primaryItems = normalizeWishlistItems(
    customer?.metafield?.jsonValue ?? customer?.metafield?.value,
  );
  const legacyItems = normalizeWishlistItems(
    customer?.legacyMetafield?.jsonValue ?? customer?.legacyMetafield?.value,
  );

  const items = primaryItems.length > 0 ? primaryItems : legacyItems;
  const updatedAt =
    customer?.metafield?.updatedAt ?? customer?.legacyMetafield?.updatedAt ?? null;

  return { items, updatedAt };
}

export function buildWishlistAnalytics(customers = [], options = {}) {
  const truncated = !!options.truncated;
  const productCounts = new Map();
  const customerRows = [];

  let totalWishlistItems = 0;

  customers.forEach((customer) => {
    const { items, updatedAt } = readCustomerWishlistItems(customer);
    if (!items.length) return;

    customerRows.push({
      id: customer.id,
      displayName: customer.displayName || customer.email || customer.id,
      email: customer.email || null,
      itemCount: items.length,
      updatedAt,
    });

    totalWishlistItems += items.length;

    items.forEach((productId) => {
      const current = productCounts.get(productId) || {
        productId,
        saveCount: 0,
        customerIds: new Set(),
      };
      current.saveCount += 1;
      current.customerIds.add(customer.id);
      productCounts.set(productId, current);
    });
  });

  const customersWithWishlist = customerRows.length;
  const uniqueProductsWishlisted = productCounts.size;
  const averageItemsPerCustomer = customersWithWishlist
    ? Number((totalWishlistItems / customersWithWishlist).toFixed(1))
    : 0;
  const adoptionRate = customers.length
    ? Math.round((customersWithWishlist / customers.length) * 100)
    : 0;

  const topProducts = [...productCounts.values()]
    .sort((left, right) => {
      if (right.customerIds.size !== left.customerIds.size) {
        return right.customerIds.size - left.customerIds.size;
      }

      return right.saveCount - left.saveCount;
    })
    .slice(0, TOP_PRODUCTS_LIMIT)
    .map((entry) => ({
      productId: entry.productId,
      saveCount: entry.saveCount,
      customerCount: entry.customerIds.size,
    }));

  const topCustomers = [...customerRows]
    .sort((left, right) => right.itemCount - left.itemCount)
    .slice(0, TOP_CUSTOMERS_LIMIT);

  const recentActivity = [...customerRows]
    .filter((row) => row.updatedAt)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, RECENT_ACTIVITY_LIMIT);

  const charts = buildAnalyticsCharts(customerRows, {
    customersScanned: customers.length,
    customersWithWishlist,
  });

  return {
    summary: {
      customersScanned: customers.length,
      customersWithWishlist,
      totalWishlistItems,
      uniqueProductsWishlisted,
      averageItemsPerCustomer,
      adoptionRate,
      truncated,
    },
    topProducts,
    topCustomers,
    recentActivity,
    charts,
  };
}

const WISHLIST_SIZE_BUCKETS = [
  { label: "1 item", min: 1, max: 1 },
  { label: "2–3 items", min: 2, max: 3 },
  { label: "4–5 items", min: 4, max: 5 },
  { label: "6+ items", min: 6, max: Infinity },
];

const ACTIVITY_TIMELINE_DAYS = 14;

function formatTimelineDayLabel(dateKey) {
  try {
    const date = new Date(`${dateKey}T12:00:00Z`);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return dateKey;
  }
}

export function buildWishlistSizeBuckets(customerRows = []) {
  return WISHLIST_SIZE_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: customerRows.filter(
      (row) => row.itemCount >= bucket.min && row.itemCount <= bucket.max,
    ).length,
  }));
}

export function buildActivityTimeline(
  customerRows = [],
  dayCount = ACTIVITY_TIMELINE_DAYS,
  referenceDate = new Date(),
) {
  const days = [];
  const now = referenceDate;

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - offset);
    const dateKey = date.toISOString().slice(0, 10);

    days.push({
      date: dateKey,
      label: formatTimelineDayLabel(dateKey),
      count: 0,
    });
  }

  const countsByDate = new Map(days.map((day) => [day.date, day]));

  customerRows.forEach((row) => {
    if (!row.updatedAt) return;

    const dateKey = new Date(row.updatedAt).toISOString().slice(0, 10);
    const entry = countsByDate.get(dateKey);
    if (entry) {
      entry.count += 1;
    }
  });

  return days;
}

export function buildAnalyticsCharts(customerRows = [], summary = {}) {
  const customersScanned = summary.customersScanned ?? 0;
  const customersWithWishlist = summary.customersWithWishlist ?? 0;

  return {
    adoption: {
      withWishlist: customersWithWishlist,
      withoutWishlist: Math.max(customersScanned - customersWithWishlist, 0),
    },
    wishlistSizes: buildWishlistSizeBuckets(customerRows),
    activityTimeline: buildActivityTimeline(customerRows),
  };
}

async function fetchCustomersPage(admin, cursor) {
  const response = await admin.graphql(
    `#graphql
      query WishlistAnalyticsCustomers(
        $first: Int!
        $after: String
        $namespace: String!
        $key: String!
        $legacyNamespace: String!
      ) {
        customers(first: $first, after: $after) {
          nodes {
            id
            displayName
            email
            metafield(namespace: $namespace, key: $key) {
              value
              jsonValue
              updatedAt
            }
            legacyMetafield: metafield(namespace: $legacyNamespace, key: $key) {
              value
              jsonValue
              updatedAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
    {
      variables: {
        first: CUSTOMERS_PAGE_SIZE,
        after: cursor,
        namespace: NAMESPACE,
        key: KEY,
        legacyNamespace: LEGACY_NAMESPACE,
      },
    },
  );

  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  return payload.data?.customers ?? { nodes: [], pageInfo: { hasNextPage: false } };
}

async function enrichTopProducts(admin, topProducts) {
  if (!topProducts.length) return [];

  const response = await admin.graphql(
    `#graphql
      query WishlistAnalyticsProducts($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
          }
        }
      }`,
    {
      variables: {
        ids: topProducts.map((product) => product.productId),
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

  return topProducts.map((entry) => {
    const product = productById.get(entry.productId);

    return {
      ...entry,
      title: product?.title ?? entry.productId.split("/").pop(),
      handle: product?.handle ?? null,
      imageUrl: product?.featuredImage?.url ?? null,
      imageAlt: product?.featuredImage?.altText ?? product?.title ?? "Product",
      storefrontUrl: product?.handle ? `/products/${product.handle}` : null,
    };
  });
}

export async function getWishlistAnalytics(admin) {
  const customers = [];
  let cursor = null;
  let truncated = false;

  for (let page = 0; page < MAX_CUSTOMER_PAGES; page += 1) {
    const batch = await fetchCustomersPage(admin, cursor);
    customers.push(...(batch.nodes ?? []));

    if (!batch.pageInfo?.hasNextPage) {
      break;
    }

    cursor = batch.pageInfo.endCursor;

    if (page === MAX_CUSTOMER_PAGES - 1) {
      truncated = true;
    }
  }

  const analytics = buildWishlistAnalytics(customers, { truncated });
  analytics.topProducts = await enrichTopProducts(admin, analytics.topProducts);

  return analytics;
}

export async function loadWishlistAnalyticsReport(admin) {
  try {
    const analytics = await getWishlistAnalytics(admin);

    return {
      available: true,
      protectedCustomerAccessBlocked: false,
      analytics,
      error: null,
    };
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      return {
        available: false,
        protectedCustomerAccessBlocked: true,
        analytics: null,
        error:
          "Customer analytics require protected customer data approval in Partner Dashboard.",
      };
    }

    logWishlistError("wishlist.analytics.error", error);

    return {
      available: false,
      protectedCustomerAccessBlocked: false,
      analytics: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
