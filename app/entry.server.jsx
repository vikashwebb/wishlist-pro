import { handleRequest as vercelHandleRequest } from "@vercel/react-router/entry.server";
import { addDocumentResponseHeaders } from "./shopify.server";

export { streamTimeout } from "@vercel/react-router/entry.server";

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
  loadContext,
) {
  const pathname = new URL(request.url).pathname;
  const isPublicLegalPage =
    pathname === "/privacy" || pathname === "/privacy/";

  // Privacy is pre-rendered static HTML — no Shopify session/DB required.
  if (!isPublicLegalPage) {
    await addDocumentResponseHeaders(request, responseHeaders);
  }

  return vercelHandleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    reactRouterContext,
    loadContext,
  );
}
