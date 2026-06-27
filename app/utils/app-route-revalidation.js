/**
 * Skip re-running the /app layout loader on in-app navigations.
 * Child routes still authenticate and load their own data.
 */
export function shouldRevalidateAppLayout({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) {
  const inApp = (url) => url.pathname.startsWith("/app");

  if (inApp(currentUrl) && inApp(nextUrl)) {
    return false;
  }

  return defaultShouldRevalidate;
}

const BOOTSTRAP_PATHS = new Set(["/app", "/app/configure"]);

/**
 * Home and Smart Setup share the same bootstrap loader — reuse cached route data
 * when switching between them.
 */
export function shouldRevalidateBootstrapPage({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}) {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }

  const currentPath = currentUrl.pathname;
  const nextPath = nextUrl.pathname;

  if (currentPath === "/app/configure" && nextPath === "/app/configure") {
    return false;
  }

  if (BOOTSTRAP_PATHS.has(currentPath) && BOOTSTRAP_PATHS.has(nextPath)) {
    return false;
  }

  return defaultShouldRevalidate;
}

/**
 * @deprecated Use shouldRevalidateBootstrapPage
 */
export function shouldRevalidateConfigurePage(args) {
  return shouldRevalidateBootstrapPage(args);
}

/**
 * Skip GET revalidation when landing on the same app page again.
 */
export function shouldRevalidateSameAppPage({
  currentUrl,
  nextUrl,
  formMethod,
  defaultShouldRevalidate,
}) {
  if (formMethod && formMethod !== "GET") {
    return defaultShouldRevalidate;
  }

  if (
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search === nextUrl.search
  ) {
    return false;
  }

  return defaultShouldRevalidate;
}
