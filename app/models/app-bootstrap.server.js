import { getShopSettings } from "./shop-settings.server";
import { getWishlistDiagnostics, readWishlist } from "./wishlist.server";
import { ensureWishlistPageBodyCurrent } from "./wishlist-page.server";

async function getMainThemeId(admin, accessScopes) {
  if (!accessScopes.includes("read_themes")) {
    return null;
  }

  try {
    const themeResponse = await admin.graphql(
      `#graphql
        query WishlistMainTheme {
          themes(first: 1, roles: [MAIN]) {
            nodes {
              id
            }
          }
        }`,
    );
    const themeJson = await themeResponse.json();

    return themeJson.data?.themes?.nodes?.[0]?.id ?? null;
  } catch (error) {
    console.error("wishlist.mainTheme.loader.error", error);
    return null;
  }
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

export async function loadWishlistDashboardBootstrap({ request }) {
  const { authenticate } = await import("../shopify.server");
  const { admin, session } = await authenticate.admin(request);
  // eslint-disable-next-line no-undef
  const appApiKey = process.env.SHOPIFY_API_KEY || "";

  try {
    const response = await admin.graphql(
      `#graphql
        query WishlistPageBootstrap {
          currentAppInstallation {
            accessScopes {
              handle
            }
          }
          customers(first: 10) {
            nodes {
              id
              displayName
              email
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
        }`,
    );
    const responseJson = await response.json();
    const accessScopes =
      responseJson.data?.currentAppInstallation?.accessScopes?.map(
        (scope) => scope.handle,
      ) ?? [];
    const customers = responseJson.data?.customers?.nodes ?? [];
    const products = responseJson.data?.products?.nodes ?? [];
    const initialSelectedCustomerId = customers[0]?.id ?? "";
    let initialWishlistItems = [];

    if (initialSelectedCustomerId) {
      try {
        const initialWishlist = await readWishlist(admin, initialSelectedCustomerId);
        initialWishlistItems = initialWishlist.items ?? [];
      } catch (error) {
        console.error("wishlist.initial.loader.error", error);
      }
    }

    const settings = await getShopSettings(session.shop);
    const [initialWishlistPage, initialDiagnostics] = await Promise.all([
      getInitialWishlistPage(admin, accessScopes, settings),
      getInitialDiagnostics(admin, initialSelectedCustomerId || undefined),
    ]);

    return {
      accessScopes,
      customers,
      products,
      settings,
      shopDomain: session.shop,
      mainThemeId: await getMainThemeId(admin, accessScopes),
      appApiKey,
      customerAccessBlocked: false,
      initialSelectedCustomerId,
      initialWishlistItems,
      initialDiagnostics,
      initialWishlistPage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const customerAccessBlocked = message.includes(
      "not approved to access the Customer object",
    );

    if (!customerAccessBlocked) {
      throw error;
    }

    const fallbackResponse = await admin.graphql(
      `#graphql
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
        }`,
    );
    const fallbackJson = await fallbackResponse.json();
    const accessScopes =
      fallbackJson.data?.currentAppInstallation?.accessScopes?.map(
        (scope) => scope.handle,
      ) ?? [];
    const settings = await getShopSettings(session.shop);
    const [initialWishlistPage, initialDiagnosticsRaw] = await Promise.all([
      getInitialWishlistPage(admin, accessScopes, settings),
      getInitialDiagnostics(admin),
    ]);
    const initialDiagnostics = markCustomerAccessBlocked(initialDiagnosticsRaw);

    return {
      accessScopes,
      customers: [],
      products: fallbackJson.data?.products?.nodes ?? [],
      settings,
      shopDomain: session.shop,
      mainThemeId: await getMainThemeId(admin, accessScopes),
      appApiKey,
      customerAccessBlocked: true,
      initialSelectedCustomerId: "",
      initialWishlistItems: [],
      initialDiagnostics,
      initialWishlistPage,
    };
  }
}
