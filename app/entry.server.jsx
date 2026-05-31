import "./env.server.js";
import { handleRequest as vercelHandleRequest } from "@vercel/react-router/entry.server";

export { streamTimeout } from "@vercel/react-router/entry.server";

function isPublicLegalPage(pathname) {
  return /^\/privacy(?:\.html)?\/?$/.test(pathname);
}

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
  loadContext,
) {
  const pathname = new URL(request.url).pathname;

  if (pathname === "/privecy" || pathname === "/privecy/") {
    return Response.redirect(new URL("/privacy", request.url), 301);
  }

  // Serve privacy policy without React Router matching (works on Vercel SSR catch-all).
  if (isPublicLegalPage(pathname)) {
    const { privacyHtmlResponse } = await import("./utils/privacy-html.server");
    return privacyHtmlResponse();
  }

  const { addDocumentResponseHeaders } = await import("./shopify.server");
  await addDocumentResponseHeaders(request, responseHeaders);

  return vercelHandleRequest(
    request,
    responseStatusCode,
    responseHeaders,
    reactRouterContext,
    loadContext,
  );
}
