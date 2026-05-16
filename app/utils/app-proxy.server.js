import { authenticate, unauthenticated } from "../shopify.server";

/**
 * App proxy requests always have a session; admin is resolved from the offline
 * token when Shopify does not attach it on the context.
 */
export async function authenticateAppProxy(request) {
  const context = await authenticate.public.appProxy(request);

  if (!context.session) {
    return { ...context, admin: null };
  }

  if (context.admin) {
    return context;
  }

  try {
    const { admin } = await unauthenticated.admin(context.session.shop);
    return { ...context, admin };
  } catch (error) {
    console.error("wishlist.proxy.resolveAdmin.error", {
      shop: context.session.shop,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...context, admin: null };
  }
}
