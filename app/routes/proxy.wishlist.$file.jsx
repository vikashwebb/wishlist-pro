import { readThemeAsset } from "../utils/theme-asset.server";
import { authenticate } from "../shopify.server";

const ASSET_HEADERS = {
  "theme.js": {
    contentType: "application/javascript; charset=utf-8",
    filename: "wishlist-page.js",
  },
  "theme.css": {
    contentType: "text/css; charset=utf-8",
    filename: "wishlist.css",
  },
};

export const loader = async ({ request, params }) => {
  await authenticate.public.appProxy(request);

  const asset = ASSET_HEADERS[params.file];
  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  const contents = await readThemeAsset(asset.filename);

  return new Response(contents, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
};
