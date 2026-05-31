import "./env.server.js";
import { handleRequest as vercelHandleRequest } from "@vercel/react-router/entry.server";

export { streamTimeout } from "@vercel/react-router/entry.server";

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
  loadContext,
) {
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
