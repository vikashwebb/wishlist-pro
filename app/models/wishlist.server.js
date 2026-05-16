import {
  DEFINITION_NAME,
  KEY,
  LEGACY_NAMESPACE,
  NAMESPACE,
} from "./wishlist";
import { logWishlist, logWishlistError } from "../utils/logger.server";

export { DEFINITION_NAME, KEY, LEGACY_NAMESPACE, NAMESPACE };

export function json(data, init) {
  return Response.json(data, init);
}

const VALID_WISHLIST_INTENTS = new Set(["add", "remove"]);

export function normalizeWishlistIntent(intent) {
  const normalized = intent?.toString().trim().toLowerCase();
  if (!VALID_WISHLIST_INTENTS.has(normalized)) {
    throw new Error('intent must be "add" or "remove"');
  }

  return normalized;
}

export function normalizeWishlistItems(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean))];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? [...new Set(parsed.filter(Boolean))] : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function toCustomerGid(customerId) {
  if (!customerId) return null;
  if (customerId.startsWith("gid://shopify/Customer/")) return customerId;
  if (/^\d+$/.test(customerId)) return `gid://shopify/Customer/${customerId}`;
  return null;
}

export function toProductGid(productId) {
  if (!productId) return null;
  if (productId.startsWith("gid://shopify/Product/")) return productId;
  if (/^\d+$/.test(productId)) return `gid://shopify/Product/${productId}`;
  return null;
}

export function wishlistItemsEqual(left = [], right = []) {
  const a = [...new Set(left.filter(Boolean))].sort();
  const b = [...new Set(right.filter(Boolean))].sort();
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

export function isProtectedCustomerDataError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("not approved to access the Customer object");
}

export function mergeWishlistMetafields(primaryMetafield, legacyMetafield) {
  const primaryItems = normalizeWishlistItems(
    primaryMetafield?.jsonValue ?? primaryMetafield?.value,
  );
  const legacyItems = normalizeWishlistItems(
    legacyMetafield?.jsonValue ?? legacyMetafield?.value,
  );

  if (primaryItems.length > 0) {
    return {
      metafield: primaryMetafield,
      items: primaryItems,
      usedLegacyNamespace: false,
    };
  }

  if (legacyItems.length > 0) {
    return {
      metafield: legacyMetafield,
      items: legacyItems,
      usedLegacyNamespace: true,
    };
  }

  return {
    metafield: primaryMetafield ?? legacyMetafield ?? null,
    items: [],
    usedLegacyNamespace: false,
  };
}

export async function readWishlist(admin, customerId) {
  const ownerId = toCustomerGid(customerId);
  if (!ownerId) {
    throw new Error(`Invalid customerId ${customerId}`);
  }

  const response = await admin.graphql(
    `#graphql
      query WishlistMetafield(
        $customerId: ID!
        $namespace: String!
        $legacyNamespace: String!
        $key: String!
      ) {
        customer(id: $customerId) {
          id
          displayName
          metafield(namespace: $namespace, key: $key) {
            id
            namespace
            key
            type
            value
            jsonValue
            updatedAt
          }
          legacyMetafield: metafield(namespace: $legacyNamespace, key: $key) {
            id
            namespace
            key
            type
            value
            jsonValue
            updatedAt
          }
        }
      }`,
    {
      variables: {
        customerId: ownerId,
        namespace: NAMESPACE,
        legacyNamespace: LEGACY_NAMESPACE,
        key: KEY,
      },
    },
  );

  const payload = await response.json();
  logWishlist("wishlist.read.graphql", JSON.stringify(payload, null, 2));

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  if (!payload.data?.customer) {
    throw new Error(`Customer not found for ownerId ${ownerId}`);
  }

  const merged = mergeWishlistMetafields(
    payload.data.customer.metafield,
    payload.data.customer.legacyMetafield,
  );

  if (merged.usedLegacyNamespace && merged.items.length > 0) {
    try {
      await writeWishlist(admin, customerId, merged.items);
    } catch (error) {
      logWishlistError("wishlist.migrateLegacy.error", error);
    }
  }

  return {
    customer: payload.data.customer,
    metafield: merged.metafield,
    items: merged.items,
  };
}

export async function writeWishlist(admin, customerId, items) {
  const ownerId = toCustomerGid(customerId);
  if (!ownerId) {
    throw new Error(`Invalid customerId ${customerId}`);
  }

  const uniqueItems = [...new Set(items.filter(Boolean))];
  const mutationResponse = await admin.graphql(
    `#graphql
      mutation WishlistMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            type
            value
            jsonValue
            updatedAt
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
    {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: NAMESPACE,
            key: KEY,
            type: "json",
            value: JSON.stringify(uniqueItems),
          },
        ],
      },
    },
  );

  const mutationPayload = await mutationResponse.json();
  logWishlist(
    "wishlist.write.graphql",
    JSON.stringify(mutationPayload, null, 2),
  );

  if (mutationPayload.errors?.length) {
    throw new Error(
      mutationPayload.errors.map((error) => error.message).join(", "),
    );
  }

  const userErrors = mutationPayload.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  return {
    items: uniqueItems,
    metafield: mutationPayload.data?.metafieldsSet?.metafields?.[0] ?? null,
  };
}

const WISHLIST_PRODUCT_FIELDS = `
  id
  handle
  title
  priceRangeV2 {
    minVariantPrice {
      amount
      currencyCode
    }
  }
  compareAtPriceRange {
    minVariantCompareAtPrice {
      amount
      currencyCode
    }
  }
  featuredImage {
    url
    altText
  }
`;

function toAmount(value) {
  const amount = Number.parseFloat(value ?? "");
  return Number.isFinite(amount) ? amount : null;
}

export function formatWishlistStorefrontProduct(product) {
  if (!product?.id) return null;

  const price = product.priceRangeV2?.minVariantPrice ?? null;
  const compareAtPrice =
    product.compareAtPriceRange?.minVariantCompareAtPrice ?? null;
  const priceAmount = toAmount(price?.amount);
  const compareAtPriceAmount = toAmount(compareAtPrice?.amount);
  const discountPercentage =
    compareAtPriceAmount && priceAmount && compareAtPriceAmount > priceAmount
      ? Math.round(
          ((compareAtPriceAmount - priceAmount) / compareAtPriceAmount) * 100,
        )
      : null;

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    image: product.featuredImage?.url ?? null,
    imageAlt: product.featuredImage?.altText ?? product.title,
    priceAmount,
    compareAtPriceAmount,
    currencyCode: price?.currencyCode ?? compareAtPrice?.currencyCode ?? null,
    discountPercentage,
    url: product.handle ? `/products/${product.handle}` : "#",
  };
}

export async function resolveProducts(
  admin,
  { productIds = [], handles = [] } = {},
) {
  const ids = [
    ...new Set(
      productIds.map((productId) => toProductGid(productId)).filter(Boolean),
    ),
  ];
  const uniqueHandles = [...new Set(handles.filter(Boolean))];
  const products = [];
  const seen = new Set();

  const addProduct = (product) => {
    if (!product?.id || seen.has(product.id)) return;
    seen.add(product.id);
    products.push(product);
  };

  if (ids.length > 0) {
    const response = await admin.graphql(
      `#graphql
        query WishlistProductsByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              ${WISHLIST_PRODUCT_FIELDS}
            }
          }
        }`,
      { variables: { ids } },
    );
    const payload = await response.json();

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join(", "));
    }

    for (const node of payload.data?.nodes ?? []) {
      if (node?.id) {
        addProduct(node);
      }
    }
  }

  if (uniqueHandles.length > 0) {
    const query = uniqueHandles.map((handle) => `handle:${handle}`).join(" OR ");
    const response = await admin.graphql(
      `#graphql
        query WishlistProductsByHandles($query: String!, $first: Int!) {
          products(first: $first, query: $query) {
            nodes {
              ${WISHLIST_PRODUCT_FIELDS}
            }
          }
        }`,
      {
        variables: {
          query,
          first: Math.min(uniqueHandles.length, 50),
        },
      },
    );
    const payload = await response.json();

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join(", "));
    }

    for (const product of payload.data?.products?.nodes ?? []) {
      addProduct(product);
    }
  }

  return products;
}

export async function resolveProduct(admin, { productId, handle }) {
  const ownerId = toProductGid(productId);

  if (ownerId) {
    const response = await admin.graphql(
      `#graphql
        query ProductById($id: ID!) {
          product(id: $id) {
            ${WISHLIST_PRODUCT_FIELDS}
          }
        }`,
      {
        variables: { id: ownerId },
      },
    );
    const payload = await response.json();
    logWishlist(
      "wishlist.resolveProductById.graphql",
      JSON.stringify(payload, null, 2),
    );

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join(", "));
    }

    if (!payload.data?.product) {
      throw new Error(`Product not found for productId ${productId}`);
    }

    return payload.data.product;
  }

  if (!handle) {
    throw new Error("productId or handle is required");
  }

  const response = await admin.graphql(
    `#graphql
      query ProductByHandle($query: String!) {
        products(first: 1, query: $query) {
          nodes {
            ${WISHLIST_PRODUCT_FIELDS}
          }
        }
      }`,
    {
      variables: {
        query: `handle:${handle}`,
      },
    },
  );
  const payload = await response.json();
  logWishlist(
    "wishlist.resolveProductByHandle.graphql",
    JSON.stringify(payload, null, 2),
  );

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  const product = payload.data?.products?.nodes?.[0];
  if (!product) {
    throw new Error(`Product not found for handle ${handle}`);
  }

  return product;
}

function findWishlistDefinition(definitions = []) {
  return (
    definitions.find(
      (node) => node.namespace === NAMESPACE && node.key === KEY,
    ) ??
    definitions.find(
      (node) => node.namespace === LEGACY_NAMESPACE && node.key === KEY,
    ) ??
    null
  );
}

export async function ensureWishlistMetafieldDefinition(admin) {
  const diagnostics = await getWishlistDiagnostics(admin);

  if (diagnostics.checks.definitionExists) {
    return diagnostics.definition;
  }

  const response = await admin.graphql(
    `#graphql
      mutation EnsureWishlistDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            name
            namespace
            key
            type {
              name
            }
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
    {
      variables: {
        definition: {
          name: DEFINITION_NAME,
          namespace: NAMESPACE,
          key: KEY,
          ownerType: "CUSTOMER",
          type: "json",
        },
      },
    },
  );

  const payload = await response.json();
  logWishlist(
    "wishlist.definitionCreate.graphql",
    JSON.stringify(payload, null, 2),
  );

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  const userErrors =
    payload.data?.metafieldDefinitionCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  return payload.data?.metafieldDefinitionCreate?.createdDefinition ?? null;
}

export async function getWishlistDiagnostics(admin, customerId) {
  const definitionResponse = await admin.graphql(
    `#graphql
      query WishlistDiagnosticsDefinitions {
        currentAppInstallation {
          accessScopes {
            handle
          }
        }
        metafieldDefinitions(first: 100, ownerType: CUSTOMER) {
          nodes {
            id
            name
            namespace
            key
            ownerType
            type {
              name
            }
          }
        }
      }`,
  );
  const definitionPayload = await definitionResponse.json();
  logWishlist(
    "wishlist.diagnostics.definitions.graphql",
    JSON.stringify(definitionPayload, null, 2),
  );

  if (definitionPayload.errors?.length) {
    throw new Error(
      definitionPayload.errors.map((error) => error.message).join(", "),
    );
  }

  const accessScopes =
    definitionPayload.data?.currentAppInstallation?.accessScopes?.map(
      (scope) => scope.handle,
    ) ?? [];
  const definitions =
    definitionPayload.data?.metafieldDefinitions?.nodes ?? [];
  const definition = findWishlistDefinition(definitions);
  const hasCanonicalDefinition = definitions.some(
    (node) => node.namespace === NAMESPACE && node.key === KEY,
  );
  const hasLegacyDefinition = definitions.some(
    (node) => node.namespace === LEGACY_NAMESPACE && node.key === KEY,
  );

  const diagnostics = {
    definitionName: DEFINITION_NAME,
    namespace: NAMESPACE,
    legacyNamespace: LEGACY_NAMESPACE,
    key: KEY,
    ownerType: "CUSTOMER",
    customerId: customerId || null,
    checks: {
      customerIdProvided: !!customerId,
      customerIdValid: !!toCustomerGid(customerId || ""),
      definitionExists: !!definition,
      canonicalDefinitionExists: hasCanonicalDefinition,
      legacyDefinitionExists: hasLegacyDefinition,
      definitionType: definition?.type?.name ?? null,
      definitionNamespace: definition?.namespace ?? null,
      accessScopes,
      hasReadCustomersScope: accessScopes.includes("read_customers"),
      hasWriteCustomersScope: accessScopes.includes("write_customers"),
      protectedCustomerAccessApproved: null,
      customerMetafieldExists: null,
      customerMetafieldType: null,
      customerWishlistItemsCount: null,
      storefrontLocalOnlyMode: false,
    },
    definition,
    metafield: null,
    items: [],
    errors: [],
    warnings: [],
  };

  if (hasLegacyDefinition && !hasCanonicalDefinition) {
    diagnostics.warnings.push(
      `Legacy metafield definition ${LEGACY_NAMESPACE}.${KEY} was found. Create ${NAMESPACE}.${KEY} and migrate customer data.`,
    );
  }

  if (!customerId || !toCustomerGid(customerId)) {
    return diagnostics;
  }

  try {
    const result = await readWishlist(admin, customerId);
    diagnostics.checks.protectedCustomerAccessApproved = true;
    diagnostics.checks.customerMetafieldExists = !!result.metafield;
    diagnostics.checks.customerMetafieldType = result.metafield?.type ?? null;
    diagnostics.checks.customerWishlistItemsCount = result.items.length;
    diagnostics.metafield = result.metafield;
    diagnostics.items = result.items;

    if (result.metafield?.namespace === LEGACY_NAMESPACE) {
      diagnostics.warnings.push(
        `Customer wishlist data is still stored under ${LEGACY_NAMESPACE}.${KEY}. It was migrated automatically on read.`,
      );
    }
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      diagnostics.checks.protectedCustomerAccessApproved = false;
      diagnostics.checks.storefrontLocalOnlyMode = true;
      diagnostics.errors.push(
        "This app is not approved to access the Customer object. Storefront toggles will stay browser-only until Partner Dashboard access is approved.",
      );
      return diagnostics;
    }

    diagnostics.errors.push(error.message);
  }

  return diagnostics;
}
