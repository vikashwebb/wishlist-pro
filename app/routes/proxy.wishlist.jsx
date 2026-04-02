import {
  isProtectedCustomerDataError,
  readWishlist,
  resolveProduct,
  toCustomerGid,
} from "../models/wishlist.server";
import { getShopSettings } from "../models/shop-settings.server";
import { authenticate } from "../shopify.server";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPage(content) {
  return new Response(
    `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Wishlist</title>
        <style>
          body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
          .wishlist-shell { max-width: 1120px; margin: 0 auto; padding: 40px 20px 64px; }
          .wishlist-header { margin-bottom: 24px; }
          .wishlist-header p { margin: 0 0 8px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; font-weight: 700; }
          .wishlist-header h1 { margin: 0; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.05; }
          .wishlist-card { background: #fff; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 24px; padding: 24px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08); }
          .wishlist-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
          .wishlist-product { overflow: hidden; background: #fff; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 24px; }
          .wishlist-product__image { aspect-ratio: 4 / 5; background: #e2e8f0; display: block; width: 100%; object-fit: cover; }
          .wishlist-product__body { padding: 16px; display: grid; gap: 10px; }
          .wishlist-product__title { text-decoration: none; color: #0f172a; font-weight: 700; }
          .wishlist-product__link { color: #0f172a; font-weight: 600; text-decoration: none; }
          .wishlist-cta { display: inline-flex; align-items: center; justify-content: center; padding: 12px 16px; border-radius: 999px; background: #0f172a; color: #fff; text-decoration: none; font-weight: 700; }
        </style>
      </head>
      <body>${content}</body>
    </html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    },
  );
}

export const loader = async ({ request }) => {
  const context = await authenticate.public.appProxy(request);

  if (!context.session || !context.admin) {
    return renderPage(`
      <main class="wishlist-shell">
        <section class="wishlist-card">
          <div class="wishlist-header">
            <p>Wishlist</p>
            <h1>Unable to load wishlist</h1>
          </div>
          <p>The app proxy session was not found.</p>
        </section>
      </main>
    `);
  }

  const settings = await getShopSettings(context.session.shop);
  const { searchParams } = new URL(request.url);
  const customerId =
    searchParams.get("customerId") || searchParams.get("logged_in_customer_id");

  if (!toCustomerGid(customerId || "")) {
    return renderPage(`
      <main class="wishlist-shell">
        <section class="wishlist-card">
          <div class="wishlist-header">
            <p>Wishlist</p>
            <h1>${escapeHtml(
              settings.wishlistRequiresLogin
                ? "Sign in to view your wishlist"
                : "Your wishlist is empty",
            )}</h1>
          </div>
          <p>${
            settings.wishlistRequiresLogin
              ? "Please log in to see the products saved to your wishlist."
              : "Save products from the storefront to see them here."
          }</p>
          <a class="wishlist-cta" href="/account/login">Login</a>
        </section>
      </main>
    `);
  }

  try {
    const wishlist = await readWishlist(context.admin, customerId);
    const products = [];

    for (const productId of wishlist.items) {
      try {
        const product = await resolveProduct(context.admin, { productId });
        products.push(product);
      } catch (error) {
        console.error("wishlist.proxy.page.resolveProduct.error", {
          productId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const content =
      products.length > 0
        ? `
          <main class="wishlist-shell">
            <div class="wishlist-header">
              <p>Wishlist</p>
              <h1>Your saved products</h1>
            </div>
            <section class="wishlist-grid">
              ${products
                .map((product) => {
                  const title = escapeHtml(product.title);
                  const handle = escapeHtml(product.handle);
                  const href = `/products/${handle}`;
                  const imageUrl = product.featuredImage?.url
                    ? escapeHtml(product.featuredImage.url)
                    : null;
                  const imageAlt = escapeHtml(
                    product.featuredImage?.altText || product.title,
                  );

                  return `
                    <article class="wishlist-product">
                      ${
                        imageUrl
                          ? `<a href="${href}"><img class="wishlist-product__image" src="${imageUrl}" alt="${imageAlt}"></a>`
                          : `<a href="${href}" class="wishlist-product__image"></a>`
                      }
                      <div class="wishlist-product__body">
                        <a class="wishlist-product__title" href="${href}">${title}</a>
                        <a class="wishlist-product__link" href="${href}">View product</a>
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </section>
          </main>
        `
        : `
          <main class="wishlist-shell">
            <section class="wishlist-card">
              <div class="wishlist-header">
                <p>Wishlist</p>
                <h1>Your wishlist is empty</h1>
              </div>
              <p>Save products from the storefront to see them here.</p>
              <a class="wishlist-cta" href="/collections/all">Browse products</a>
            </section>
          </main>
        `;

    return renderPage(content);
  } catch (error) {
    if (isProtectedCustomerDataError(error)) {
      return renderPage(`
        <main class="wishlist-shell">
          <section class="wishlist-card">
            <div class="wishlist-header">
              <p>Wishlist</p>
              <h1>Wishlist access is not ready</h1>
            </div>
            <p>Protected customer data access is required before this wishlist page can read customer metafields.</p>
          </section>
        </main>
      `);
    }

    console.error("wishlist.proxy.page.error", error);
    return renderPage(`
      <main class="wishlist-shell">
        <section class="wishlist-card">
          <div class="wishlist-header">
            <p>Wishlist</p>
            <h1>Unable to load wishlist</h1>
          </div>
          <p>${escapeHtml(error.message)}</p>
        </section>
      </main>
    `);
  }
};
