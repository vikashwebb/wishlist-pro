import type { Config } from "@react-router/dev/config";

/**
 * Load all routes in the initial manifest. Avoids /__manifest fetch failures
 * during client navigations (common with Shopify CLI Cloudflare tunnels).
 */
export default {
  routeDiscovery: { mode: "initial" },
} satisfies Config;
