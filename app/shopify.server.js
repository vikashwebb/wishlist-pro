import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  BillingInterval,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { ensureDatabaseMigrated } from "./db-migrate.server";
import { PRO_PLAN, PRO_PLAN_PRICE } from "./billing.constants";
import prisma from "./db.server";

let shopifyInstance;
let shopifyReady;

async function getShopify() {
  if (!shopifyReady) {
    shopifyReady = (async () => {
      await ensureDatabaseMigrated();
      shopifyInstance = shopifyApp({
        apiKey: process.env.SHOPIFY_API_KEY,
        apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
        apiVersion: ApiVersion.October25,
        scopes: process.env.SCOPES?.split(","),
        appUrl: process.env.SHOPIFY_APP_URL || "",
        authPathPrefix: "/auth",
        sessionStorage: new PrismaSessionStorage(prisma),
        distribution: AppDistribution.AppStore,
        billing: {
          [PRO_PLAN]: {
            trialDays: PRO_PLAN_PRICE.trialDays,
            lineItems: [
              {
                amount: PRO_PLAN_PRICE.amount,
                currencyCode: PRO_PLAN_PRICE.currencyCode,
                interval: BillingInterval.Every30Days,
              },
            ],
          },
        },
        future: {
          expiringOfflineAccessTokens: true,
        },
        ...(process.env.SHOP_CUSTOM_DOMAIN
          ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
          : {}),
        hooks: {
          afterAuth: async ({ session, admin }) => {
            try {
              await shopifyInstance.registerWebhooks({ session });
            } catch (error) {
              console.error("wishlist.registerWebhooks.error", error);
            }

            try {
              const { getShopSettings } = await import("./models/shop-settings.server");
              const { provisionWishlistInfrastructure } = await import(
                "./models/shop-provision.server"
              );
              const settings = await getShopSettings(session.shop);
              const scopeResponse = await admin.graphql(
                `#graphql
                  query WishlistProvisionScopes {
                    currentAppInstallation {
                      accessScopes {
                        handle
                      }
                    }
                  }`,
              );
              const scopeJson = await scopeResponse.json();
              const accessScopes =
                scopeJson.data?.currentAppInstallation?.accessScopes?.map(
                  (scope) => scope.handle,
                ) ?? [];
              const provision = await provisionWishlistInfrastructure(admin, {
                settings,
                accessScopes,
              });

              if (provision.errors.length > 0) {
                console.error("wishlist.provision.afterAuth.errors", provision.errors);
              }
            } catch (error) {
              console.error("wishlist.provision.afterAuth.error", error);
            }
          },
        },
      });
      return shopifyInstance;
    })();
  }

  return shopifyReady;
}

function wrapAuthenticateMethod(namespace, method) {
  return (request) =>
    getShopify().then((shopify) => shopify.authenticate[namespace][method](request));
}

function wrapAuthenticateRoot(method) {
  return (request) =>
    getShopify().then((shopify) => shopify.authenticate[method](request));
}

export const apiVersion = ApiVersion.October25;

export const authenticate = {
  admin: wrapAuthenticateRoot("admin"),
  webhook: wrapAuthenticateRoot("webhook"),
  public: {
    appProxy: wrapAuthenticateMethod("public", "appProxy"),
  },
};

export const unauthenticated = {
  admin: (request) =>
    getShopify().then((shopify) => shopify.unauthenticated.admin(request)),
};

export const login = (request) => getShopify().then((shopify) => shopify.login(request));

export const registerWebhooks = (...args) =>
  getShopify().then((shopify) => shopify.registerWebhooks(...args));

export async function addDocumentResponseHeaders(request, responseHeaders) {
  const shopify = await getShopify();
  return shopify.addDocumentResponseHeaders(request, responseHeaders);
}

export async function getSessionStorage() {
  const shopify = await getShopify();
  return shopify.sessionStorage;
}

export default {
  get instance() {
    return getShopify();
  },
};

/**
 * Admin auth for /app/* routes: runs billing.check on load and optionally
 * redirects to /app/pricing when BILLING_REDIRECT_ON_LOAD=true.
 */
export async function authenticateAppAdmin(request) {
  const context = await authenticate.admin(request);

  try {
    const { enforceAppBillingOnLoad } = await import("./billing.server");
    await enforceAppBillingOnLoad(request, context);
  } catch (error) {
    const { isRedirectResponse } = await import("./billing.server");
    if (isRedirectResponse(error)) {
      throw error;
    }
    console.error("wishlist.billing.enforce.error", error);
  }

  return context;
}
