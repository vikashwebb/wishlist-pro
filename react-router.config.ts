import { vercelPreset } from "@vercel/react-router/vite";
import type { Config } from "@react-router/dev/config";

/**
 * Load all routes in the initial manifest. Avoids /__manifest fetch failures
 * during client navigations (common with Shopify CLI Cloudflare tunnels).
 * vercelPreset ensures Vercel deploys every route (e.g. /privacy) correctly.
 */
export default {
  ssr: true,
  routeDiscovery: { mode: "initial" },
  presets: [vercelPreset()],
} satisfies Config;
