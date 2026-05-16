const PROXY_BASE = "/apps/wishlist-proxy/wishlist";

export function getProxyWishlistPageScript() {
  return `(function () {
  var GUEST_KEY = "wishlist-pro:guest";
  var CONFIG = {
    configUrl: "${PROXY_BASE}/config",
    itemsUrl: "${PROXY_BASE}/items",
    loginUrl: "/account/login"
  };

  function readJson(response) {
    return response.json().catch(function () { return {}; }).then(function (payload) {
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Wishlist request failed");
      }
      return payload;
    });
  }

  function readGuestState() {
    try {
      return JSON.parse(window.localStorage.getItem(GUEST_KEY) || "{}");
    } catch {
      return { itemsByProductId: {}, statusByHandle: {} };
    }
  }

  function writeGuestState(state) {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(state));
  }

  function clearGuestState() {
    window.localStorage.removeItem(GUEST_KEY);
  }

  function activeKeys(object) {
    return Object.keys(object || {}).filter(function (key) { return !!object[key]; });
  }

  function formatMoney(amount, currencyCode) {
    if (typeof amount !== "number" || !currencyCode) return "";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(amount);
    } catch {
      return amount.toFixed(2) + " " + currencyCode;
    }
  }

  function renderProductCard(product) {
    var href = product.url || (product.handle ? "/products/" + product.handle : "#");
    var image = product.image
      ? '<a href="' + href + '"><img class="wishlist-product__image" src="' + product.image + '" alt="' + (product.imageAlt || product.title) + '"></a>'
      : '<a href="' + href + '" class="wishlist-product__image"></a>';
    var price = formatMoney(product.priceAmount, product.currencyCode);
    var compareAt = formatMoney(product.compareAtPriceAmount, product.currencyCode);
    var pricing = "";
    if (price) {
      pricing = '<div class="wishlist-product__pricing"><span class="wishlist-product__price">' + price + "</span>";
      if (compareAt && product.compareAtPriceAmount > product.priceAmount) {
        pricing += '<span class="wishlist-product__compare">' + compareAt + "</span>";
      }
      if (product.discountPercentage) {
        pricing += '<span class="wishlist-product__discount">' + product.discountPercentage + "% off</span>";
      }
      pricing += "</div>";
    }
    return (
      '<article class="wishlist-product" data-wishlist-product-id="' + product.id + '" data-wishlist-product-handle="' + (product.handle || "") + '">' +
      image +
      '<div class="wishlist-product__body"><div class="wishlist-product__meta"><a class="wishlist-product__title" href="' + href + '">' + product.title + "</a>" + pricing + '</div><div class="wishlist-product__actions"><a class="wishlist-product__link" href="' + href + '">View product</a><button type="button" class="wishlist-product__remove" data-wishlist-remove>Remove</button></div></div></article>'
    );
  }

  function showEmpty(root, title, text, ctaLabel, ctaHref) {
    root.innerHTML =
      '<section class="wishlist-card"><div class="wishlist-header"><p>Wishlist</p><h1>' +
      title +
      "</h1></div><p>" +
      text +
      '</p><a class="wishlist-cta" href="' +
      ctaHref +
      '">' +
      ctaLabel +
      "</a></section>";
  }

  function mountGuestPage(shell) {
    var statusNode = shell.querySelector("[data-wishlist-status]");
    var gridNode = shell.querySelector("[data-wishlist-grid]");

    function setStatus(message) {
      if (!statusNode) return;
      statusNode.textContent = message || "";
      statusNode.hidden = !message;
    }

    function bindRemoveHandlers() {
      gridNode.addEventListener("click", function (event) {
        var button = event.target.closest("[data-wishlist-remove]");
        if (!button) return;
        var card = button.closest("[data-wishlist-product-id]");
        if (!card) return;
        var productId = card.getAttribute("data-wishlist-product-id");
        var handle = card.getAttribute("data-wishlist-product-handle");
        var state = readGuestState();
        delete state.itemsByProductId[productId];
        delete state.statusByHandle[handle];
        if (!activeKeys(state.itemsByProductId).length && !activeKeys(state.statusByHandle).length) {
          clearGuestState();
        } else {
          writeGuestState(state);
        }
        card.remove();
        if (!gridNode.querySelector("[data-wishlist-product-id]")) {
          showEmpty(shell, "Your wishlist is empty", "Save products from the storefront to see them here.", "Browse products", "/collections/all");
        }
      });
    }

    setStatus("Loading your wishlist.");
    fetch(CONFIG.configUrl, { credentials: "same-origin" })
      .then(readJson)
      .then(function (settings) {
        if (settings.requireLogin) {
          showEmpty(shell, "Sign in to view your wishlist", "Please log in to see the products saved to your wishlist.", "Login", CONFIG.loginUrl);
          return null;
        }
        var guestState = readGuestState();
        var productIds = activeKeys(guestState.itemsByProductId);
        var handles = activeKeys(guestState.statusByHandle);
        if (!productIds.length && !handles.length) {
          showEmpty(shell, "Your wishlist is empty", "Save products from the storefront to see them here.", "Browse products", "/collections/all");
          return null;
        }
        var url = new URL(CONFIG.itemsUrl, window.location.origin);
        if (productIds.length) url.searchParams.set("productIds", productIds.join(","));
        if (handles.length) url.searchParams.set("handles", handles.join(","));
        return fetch(url.toString(), { credentials: "same-origin" }).then(readJson);
      })
      .then(function (payload) {
        if (!payload) return;
        var products = payload.products || [];
        if (!products.length) {
          showEmpty(shell, "Your wishlist is empty", "Save products from the storefront to see them here.", "Browse products", "/collections/all");
          return;
        }
        gridNode.innerHTML = products.map(renderProductCard).join("");
        gridNode.hidden = false;
        bindRemoveHandlers();
        setStatus("");
      })
      .catch(function (error) {
        console.error("wishlist.proxy.guest.error", error);
        setStatus(error.message || "Unable to load wishlist right now.");
      });
  }

  document.querySelectorAll("[data-wishlist-proxy-guest]").forEach(mountGuestPage);
})();`;
}
