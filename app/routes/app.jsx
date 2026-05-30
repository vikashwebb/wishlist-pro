import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

export const loader = async ({ request }) => {
  const { authenticateAppAdmin } = await import("../shopify.server");

  try {
    await authenticateAppAdmin(request);
  } catch (error) {
    // Shopify returns 410 for bot user agents (isbot). Return the app shell so
    // App Bridge can still initialize instead of a blank "Handling response" page.
    if (error instanceof Response && error.status === 410) {
      // eslint-disable-next-line no-undef
      return { apiKey: process.env.SHOPIFY_API_KEY || "" };
    }
    throw error;
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/setup">Setup</s-link>
        <s-link href="/app/storefront">Storefront</s-link>
        <s-link href="/app/theme">Theme</s-link>
        <s-link href="/app/analytics">Analytics</s-link>
        <s-link href="/app/pricing">Pricing</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
