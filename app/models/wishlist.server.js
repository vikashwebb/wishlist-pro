import { DEFINITION_NAME, KEY, NAMESPACE } from "./wishlist";

export { DEFINITION_NAME, KEY, NAMESPACE };

export function json(data, init) {
  return Response.json(data, init);
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

export function isProtectedCustomerDataError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("not approved to access the Customer object");
}

export async function readWishlist(admin, customerId) {
  const ownerId = toCustomerGid(customerId);
  if (!ownerId) {
    throw new Error(`Invalid customerId ${customerId}`);
  }

  const response = await admin.graphql(
    `#graphql
      query WishlistMetafield($customerId: ID!, $namespace: String!, $key: String!) {
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
        }
      }`,
    {
      variables: {
        customerId: ownerId,
        namespace: NAMESPACE,
        key: KEY,
      },
    },
  );

  const payload = await response.json();
  console.log("wishlist.read.graphql", JSON.stringify(payload, null, 2));

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  if (!payload.data?.customer) {
    throw new Error(`Customer not found for ownerId ${ownerId}`);
  }

  const metafield = payload.data.customer.metafield;
  const items = normalizeWishlistItems(
    metafield?.jsonValue ?? metafield?.value,
  );

  return {
    customer: payload.data.customer,
    metafield,
    items,
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
  console.log(
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

export async function resolveProduct(admin, { productId, handle }) {
  const ownerId = toProductGid(productId);

  if (ownerId) {
    const response = await admin.graphql(
      `#graphql
        query ProductById($id: ID!) {
          product(id: $id) {
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
          }
        }`,
      {
        variables: { id: ownerId },
      },
    );
    const payload = await response.json();
    console.log(
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
  console.log(
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
  console.log(
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
  const definition =
    definitionPayload.data?.metafieldDefinitions?.nodes?.find((node) => {
      return node.namespace === NAMESPACE && node.key === KEY;
    }) ?? null;

  const diagnostics = {
    definitionName: DEFINITION_NAME,
    namespace: NAMESPACE,
    key: KEY,
    ownerType: "CUSTOMER",
    customerId: customerId || null,
    checks: {
      customerIdProvided: !!customerId,
      customerIdValid: !!toCustomerGid(customerId || ""),
      definitionExists: !!definition,
      definitionType: definition?.type?.name ?? null,
      accessScopes,
      hasReadCustomersScope: accessScopes.includes("read_customers"),
      hasWriteCustomersScope: accessScopes.includes("write_customers"),
      protectedCustomerAccessApproved: null,
      customerMetafieldExists: null,
      customerMetafieldType: null,
      customerWishlistItemsCount: null,
    },
    definition,
    metafield: null,
    items: [],
    errors: [],
  };

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
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      diagnostics.checks.protectedCustomerAccessApproved = false;
      diagnostics.errors.push(
        "This app is not approved to access the Customer object.",
      );
      return diagnostics;
    }

    diagnostics.errors.push(error.message);
  }

  return diagnostics;
}
