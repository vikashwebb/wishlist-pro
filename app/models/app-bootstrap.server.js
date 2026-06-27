import { getShopSettings } from "./shop-settings.server";
import {
  hasOnlineStorePagesScope,
  provisionWishlistInfrastructure,
} from "./shop-provision.server";
import {
  getWishlistDiagnostics,
  isProtectedCustomerDataError,
  readWishlist,
} from "./wishlist.server";
import { ensureWishlistPageBodyCurrent } from "./wishlist-page.server";
import { getMainThemeEmbedStatus } from "./theme-embed-status.server";

const BOOTSTRAP_CACHE_TTL_MS = 45_000;
const bootstrapCache = new Map();

export function invalidateWishlistBootstrapCache(shop) {
  if (shop) {
    bootstrapCache.delete(shop);
    return;
  }

  bootstrapCache.clear();
}

async function getInitialWishlistPage(admin, accessScopes, settings) {
  const canInspectPages =
    accessScopes.includes("write_online_store_pages") ||
    accessScopes.includes("write_content") ||
    accessScopes.includes("read_content");

  if (!canInspectPages) {
    return null;
  }

  try {
    const { page } = await ensureWishlistPageBodyCurrent(admin, {
      title: settings.wishlistPageTitle,
      handle: settings.wishlistPageHandle,
    });
    return page;
  } catch (error) {
    console.error("wishlist.page.loader.error", error);
    return null;
  }
}

const BLOCKED_CUSTOMER_ACCESS_ERROR =
  "Protected customer data is not approved for this app. Request Customer access in Partner Dashboard, reinstall the app, then re-run the live system check.";

function markCustomerAccessBlocked(diagnostics) {
  if (!diagnostics) {
    return {
      customerId: null,
      checks: {
        protectedCustomerAccessApproved: false,
        storefrontLocalOnlyMode: true,
        definitionExists: false,
      },
      errors: [BLOCKED_CUSTOMER_ACCESS_ERROR],
      warnings: [],
    };
  }

  diagnostics.checks.protectedCustomerAccessApproved = false;
  diagnostics.checks.storefrontLocalOnlyMode = true;
  if (!diagnostics.errors.includes(BLOCKED_CUSTOMER_ACCESS_ERROR)) {
    diagnostics.errors.push(BLOCKED_CUSTOMER_ACCESS_ERROR);
  }

  return diagnostics;
}

async function getInitialDiagnostics(admin, customerId) {
  try {
    return await getWishlistDiagnostics(admin, customerId);
  } catch (error) {
    console.error("wishlist.diagnostics.loader.error", error);
    return null;
  }
}

const BOOTSTRAP_QUERY = `#graphql
  query WishlistPageBootstrap {
    currentAppInstallation {
      accessScopes {
        handle
      }
    }
    customers(first: 10) {
      nodes {
        id
      }
    }
    products(first: 10, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        status
      }
    }
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id
      }
    }
  }`;

const BOOTSTRAP_FALLBACK_QUERY = `#graphql
  query WishlistProductsOnly {
    currentAppInstallation {
      accessScopes {
        handle
      }
    }
    products(first: 10, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        status
      }
    }
    themes(first: 1, roles: [MAIN]) {
      nodes {
        id
      }
    }
  }`;

function parseBootstrapPayload(responseJson) {
  const accessScopes =
    responseJson.data?.currentAppInstallation?.accessScopes?.map(
      (scope) => scope.handle,
    ) ?? [];
  const customers = responseJson.data?.customers?.nodes ?? [];
  const products = responseJson.data?.products?.nodes ?? [];
  const mainThemeId = responseJson.data?.themes?.nodes?.[0]?.id ?? null;

  return {
    accessScopes,
    customers,
    products,
    mainThemeId,
    initialSelectedCustomerId: customers[0]?.id ?? "",
  };
}

async function buildBootstrapPayload({
  admin,
  session,
  billing,
  settings,
  responseJson,
  customerAccessBlocked,
}) {
  const { hasProSubscription } = await import("../billing.server");
  const isPro = await hasProSubscription(billing, session.shop);
  // eslint-disable-next-line no-undef
  const appApiKey = process.env.SHOPIFY_API_KEY || "";
  const {
    accessScopes,
    customers,
    products,
    mainThemeId,
    initialSelectedCustomerId,
  } = parseBootstrapPayload(responseJson);

  const [initialWishlistItems, provision] = await Promise.all([
    initialSelectedCustomerId && !customerAccessBlocked
      ? readWishlist(admin, initialSelectedCustomerId)
          .then((wishlist) => wishlist.items ?? [])
          .catch((error) => {
            console.error("wishlist.initial.loader.error", error);
            return [];
          })
      : Promise.resolve([]),
    provisionWishlistInfrastructure(admin, {
      settings,
      accessScopes,
    }),
  ]);

  if (provision.errors.length > 0) {
    console.error("wishlist.provision.bootstrap.errors", provision.errors);
  }

  let initialWishlistPage = provision.wishlistPage;
  const pagePromise =
    !initialWishlistPage && hasOnlineStorePagesScope(accessScopes)
      ? getInitialWishlistPage(admin, accessScopes, settings)
      : Promise.resolve(null);

  const diagnosticsCustomerId =
    customerAccessBlocked || !initialSelectedCustomerId
      ? undefined
      : initialSelectedCustomerId;

  const [pageResult, initialDiagnosticsRaw, themeEmbedStatus] =
    await Promise.all([
      pagePromise,
      getInitialDiagnostics(admin, diagnosticsCustomerId),
      getMainThemeEmbedStatus(admin, mainThemeId, accessScopes),
    ]);

  if (!initialWishlistPage) {
    initialWishlistPage = pageResult;
  }

  const initialDiagnostics = customerAccessBlocked
    ? markCustomerAccessBlocked(initialDiagnosticsRaw)
    : initialDiagnosticsRaw;

  return {
    accessScopes,
    customers: customerAccessBlocked ? [] : customers,
    products,
    settings,
    isPro,
    shopDomain: session.shop,
    mainThemeId,
    themeEmbedStatus,
    appApiKey,
    customerAccessBlocked,
    initialSelectedCustomerId: customerAccessBlocked ? "" : initialSelectedCustomerId,
    initialWishlistItems: customerAccessBlocked ? [] : initialWishlistItems,
    initialDiagnostics,
    initialWishlistPage,
  };
}

async function loadWishlistDashboardBootstrapUncached({ request }) {
  const { authenticate } = await import("../shopify.server");
  const { admin, session, billing } = await authenticate.admin(request);

  try {
    const [responseJson, settings] = await Promise.all([
      admin.graphql(BOOTSTRAP_QUERY).then((response) => response.json()),
      getShopSettings(session.shop),
    ]);

    return buildBootstrapPayload({
      admin,
      session,
      billing,
      settings,
      responseJson,
      customerAccessBlocked: false,
    });
  } catch (error) {
    const customerAccessBlocked = isProtectedCustomerDataError(error);

    if (!customerAccessBlocked) {
      throw error;
    }

    const [responseJson, settings] = await Promise.all([
      admin.graphql(BOOTSTRAP_FALLBACK_QUERY).then((response) => response.json()),
      getShopSettings(session.shop),
    ]);

    return buildBootstrapPayload({
      admin,
      session,
      billing,
      settings,
      responseJson,
      customerAccessBlocked: true,
    });
  }
}

export async function loadWishlistDashboardBootstrap(args) {
  const { authenticate } = await import("../shopify.server");
  const { session } = await authenticate.admin(args.request);
  const cached = bootstrapCache.get(session.shop);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await loadWishlistDashboardBootstrapUncached(args);
  bootstrapCache.set(session.shop, {
    data,
    expiresAt: Date.now() + BOOTSTRAP_CACHE_TTL_MS,
  });

  return data;
}
