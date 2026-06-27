import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { AppNavigationShell } from "../components/app-navigation-shell";
import { shouldRevalidateAppLayout } from "../utils/app-route-revalidation";

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

export function shouldRevalidate(args) {
  return shouldRevalidateAppLayout(args);
}

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/configure">Smart Setup</s-link>
        <s-link href="/app/automations">Smart Alerts</s-link>
        <s-link href="/app/analytics">Insights</s-link>
        <s-link href="/app/plan">Plan</s-link>
        <s-link href="/app/help">Help</s-link>
      </s-app-nav>
      <AppNavigationShell />
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
