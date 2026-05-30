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
  if (!isPublicLegalPage(new URL(request.url).pathname)) {
    const { addDocumentResponseHeaders } = await import("./shopify.server");
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
