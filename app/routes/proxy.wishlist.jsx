import {
  isProtectedCustomerDataError,
  readWishlist,
  resolveProduct,
  toCustomerGid,
} from "../models/wishlist.server";
import { getProxyWishlistPageScript } from "../models/proxy-wishlist-page.server";
import { getShopSettings } from "../models/shop-settings.server";
import { authenticate } from "../shopify.server";
import { logWishlistError } from "../utils/logger.server";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toAmount(value) {
  const amount = Number.parseFloat(value ?? "");
  return Number.isFinite(amount) ? amount : null;
}

function formatMoney(amount, currencyCode) {
  if (typeof amount !== "number" || !currencyCode) {
    return "";
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

function renderPage(content, { includeGuestScript = false } = {}) {
  const guestScript = includeGuestScript
    ? `<script>${getProxyWishlistPageScript()}</script>`
    : "";

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
          .wishlist-product__meta { display: grid; gap: 8px; }
          .wishlist-product__title { text-decoration: none; color: #0f172a; font-weight: 700; }
          .wishlist-product__pricing { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
          .wishlist-product__price { color: #0f172a; font-size: 16px; font-weight: 800; }
          .wishlist-product__compare { color: rgba(15, 23, 42, 0.52); font-size: 14px; text-decoration: line-through; }
          .wishlist-product__discount { display: inline-flex; align-items: center; padding: 4px 8px; border-radius: 999px; background: rgba(220, 252, 231, 0.9); color: #166534; font-size: 12px; font-weight: 800; }
          .wishlist-product__actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
          .wishlist-product__link { color: #0f172a; font-weight: 600; text-decoration: none; }
          .wishlist-product__remove { border: 0; background: transparent; color: #b91c1c; font: inherit; font-weight: 700; cursor: pointer; padding: 0; }
          .wishlist-product__remove[disabled] { opacity: 0.6; cursor: wait; }
          .wishlist-status { margin: 0 0 16px; color: #475569; }
          .wishlist-cta { display: inline-flex; align-items: center; justify-content: center; padding: 12px 16px; border-radius: 999px; background: #0f172a; color: #fff; text-decoration: none; font-weight: 700; }
        </style>
      </head>
      <body>${content}${guestScript}</body>
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
    if (settings.wishlistRequiresLogin) {
      return renderPage(`
        <main class="wishlist-shell">
          <section class="wishlist-card">
            <div class="wishlist-header">
              <p>Wishlist</p>
              <h1>Sign in to view your wishlist</h1>
            </div>
            <p>Please log in to see the products saved to your wishlist.</p>
            <a class="wishlist-cta" href="/account/login">Login</a>
          </section>
        </main>
      `);
    }

    return renderPage(
      `
      <main class="wishlist-shell" data-wishlist-proxy-guest>
        <div class="wishlist-header">
          <p>Wishlist</p>
          <h1>Your saved products</h1>
        </div>
        <p class="wishlist-status" data-wishlist-status>Loading your wishlist.</p>
        <section class="wishlist-grid" data-wishlist-grid hidden></section>
      </main>
    `,
      { includeGuestScript: true },
    );
  }

  try {
    const wishlist = await readWishlist(context.admin, customerId);
    const products = [];

    for (const productId of wishlist.items) {
      try {
        const product = await resolveProduct(context.admin, { productId });
        products.push(product);
      } catch (error) {
        logWishlistError("wishlist.proxy.page.resolveProduct.error", {
          productId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const content =
      products.length > 0
        ? `
          <main class="wishlist-shell" data-wishlist-proxy-page data-customer-id="${escapeHtml(
            customerId,
          )}">
            <div class="wishlist-header">
              <p>Wishlist</p>
              <h1>Your saved products</h1>
            </div>
            <p class="wishlist-status" data-wishlist-status hidden></p>
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
                  const priceAmount = toAmount(
                    product.priceRangeV2?.minVariantPrice?.amount,
                  );
                  const compareAtPriceAmount = toAmount(
                    product.compareAtPriceRange?.minVariantCompareAtPrice
                      ?.amount,
                  );
                  const currencyCode =
                    product.priceRangeV2?.minVariantPrice?.currencyCode ||
                    product.compareAtPriceRange?.minVariantCompareAtPrice
                      ?.currencyCode ||
                    null;
                  const price = escapeHtml(
                    formatMoney(priceAmount, currencyCode),
                  );
                  const compareAtPrice = escapeHtml(
                    formatMoney(compareAtPriceAmount, currencyCode),
                  );
                  const discountPercentage =
                    compareAtPriceAmount &&
                    priceAmount &&
                    compareAtPriceAmount > priceAmount
                      ? Math.round(
                          ((compareAtPriceAmount - priceAmount) /
                            compareAtPriceAmount) *
                            100,
                        )
                      : null;

                  return `
                    <article class="wishlist-product" data-wishlist-product-id="${escapeHtml(
                      product.id,
                    )}" data-wishlist-product-handle="${handle}">
                      ${
                        imageUrl
                          ? `<a href="${href}"><img class="wishlist-product__image" src="${imageUrl}" alt="${imageAlt}"></a>`
                          : `<a href="${href}" class="wishlist-product__image"></a>`
                      }
                      <div class="wishlist-product__body">
                        <div class="wishlist-product__meta">
                          <a class="wishlist-product__title" href="${href}">${title}</a>
                          ${
                            price
                              ? `<div class="wishlist-product__pricing">
                                  <span class="wishlist-product__price">${price}</span>
                                  ${
                                    compareAtPrice &&
                                    compareAtPriceAmount > priceAmount
                                      ? `<span class="wishlist-product__compare">${compareAtPrice}</span>`
                                      : ""
                                  }
                                  ${
                                    discountPercentage
                                      ? `<span class="wishlist-product__discount">${discountPercentage}% off</span>`
                                      : ""
                                  }
                                </div>`
                              : ""
                          }
                        </div>
                        <div class="wishlist-product__actions">
                          <a class="wishlist-product__link" href="${href}">View product</a>
                          <button type="button" class="wishlist-product__remove" data-wishlist-remove>Remove</button>
                        </div>
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </section>
            <script>
              (function () {
                var root = document.querySelector("[data-wishlist-proxy-page]");
                if (!root) return;

                var statusNode = root.querySelector("[data-wishlist-status]");
                var gridNode = root.querySelector(".wishlist-grid");
                var customerId = root.getAttribute("data-customer-id");

                function setStatus(message) {
                  if (!statusNode) return;
                  statusNode.textContent = message || "";
                  statusNode.hidden = !message;
                }

                function showEmptyState() {
                  root.innerHTML =
                    '<section class="wishlist-card">' +
                    '<div class="wishlist-header"><p>Wishlist</p><h1>Your wishlist is empty</h1></div>' +
                    '<p>Save products from the storefront to see them here.</p>' +
                    '<a class="wishlist-cta" href="/collections/all">Browse products</a>' +
                    '</section>';
                }

                gridNode.addEventListener("click", function (event) {
                  var button = event.target.closest("[data-wishlist-remove]");
                  if (!button) return;

                  var card = button.closest("[data-wishlist-product-id]");
                  if (!card) return;

                  var formData = new FormData();
                  formData.append("customerId", customerId);
                  formData.append("productId", card.getAttribute("data-wishlist-product-id"));
                  formData.append("handle", card.getAttribute("data-wishlist-product-handle"));
                  formData.append("intent", "remove");

                  button.disabled = true;
                  setStatus("Removing product from wishlist.");

                  fetch("/apps/wishlist-proxy/wishlist/toggle", {
                    method: "POST",
                    credentials: "same-origin",
                    body: formData
                  })
                    .then(function (response) {
                      return response.json().catch(function () {
                        return {};
                      }).then(function (payload) {
                        if (!response.ok || payload.error) {
                          throw new Error(payload.error || "Unable to remove wishlist item");
                        }

                        return payload;
                      });
                    })
                    .then(function () {
                      card.remove();
                      setStatus("");

                      if (!gridNode.querySelector("[data-wishlist-product-id]")) {
                        showEmptyState();
                      }
                    })
                    .catch(function (error) {
                      console.error("wishlist.proxy.page.remove.error", error);
                      setStatus(error.message || "Unable to remove wishlist item right now.");
                      button.disabled = false;
                    });
                });
              })();
            </script>
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

    logWishlistError("wishlist.proxy.page.error", error);
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
