(function () {
  function initWishlistPage() {
  function dedupeWishlistPageRoots() {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll("[data-wishlist-page]"),
    );
    if (roots.length <= 1) {
      return roots[0] || null;
    }

    function scoreRoot(root) {
      var score = 0;
      if (
        root.closest(
          ".rte, .page__content, .page-content, .main-page-content, #MainContent, .shopify-section--page, .page-width",
        )
      ) {
        score += 2;
      }

      try {
        var parsed = JSON.parse(
          root.getAttribute("data-wishlist-page-config") || "{}",
        );
        if (parsed.customerId) {
          score += 3;
        }
        if (parsed.itemsUrl) {
          score += 1;
        }
      } catch {
        score -= 1;
      }

      return score;
    }

    var preferred = roots[0];
    var bestScore = scoreRoot(preferred);
    roots.forEach(function (root) {
      var nextScore = scoreRoot(root);
      if (nextScore > bestScore) {
        preferred = root;
        bestScore = nextScore;
      }
    });

    roots.forEach(function (root) {
      if (root === preferred) {
        return;
      }

      root.setAttribute("data-wishlist-page-skip", "true");
      root.hidden = true;
      root.style.display = "none";
    });

    return preferred;
  }

  if (!document.querySelector("[data-wishlist-page]")) {
    return;
  }

  dedupeWishlistPageRoots();

  if (!document.querySelector("[data-wishlist-page]:not([data-wishlist-page-skip])")) {
    return;
  }

  function guestKey() {
    return "wishlist-pro:guest";
  }

  function key(customerId) {
    return customerId ? "wishlist-pro:" + customerId : null;
  }

  function emptyState() {
    return { itemsByProductId: {}, statusByHandle: {} };
  }

  function readStoredState(storageKey) {
    if (!storageKey) return emptyState();

    try {
      var parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      return {
        itemsByProductId: parsed.itemsByProductId || {},
        statusByHandle: parsed.statusByHandle || {},
      };
    } catch {
      return emptyState();
    }
  }

  function readGuestState() {
    return readStoredState(guestKey());
  }

  function readCustomerState(customerId) {
    return readStoredState(key(customerId));
  }

  function writeStoredState(storageKey, state) {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function clearStoredState(storageKey) {
    if (!storageKey) return;
    window.localStorage.removeItem(storageKey);
  }

  function hasEntries(object) {
    return Object.keys(object || {}).length > 0;
  }

  function activeKeys(object) {
    return Object.keys(object || {}).filter(function (item) {
      return !!object[item];
    });
  }

  function hasGuestWishlistState() {
    var guestState = readGuestState();
    return (
      hasEntries(guestState.itemsByProductId) ||
      hasEntries(guestState.statusByHandle)
    );
  }

  function readJson(response) {
    return response
      .json()
      .catch(function () {
        return {};
      })
      .then(function (payload) {
        if (!response.ok || payload.error) {
          throw new Error(payload.error || "Wishlist request failed");
        }

        return payload;
      });
  }

  function loadSettings(config) {
    if (typeof config.requireLogin === "boolean") {
      return Promise.resolve(config);
    }

    if (!config.configUrl) {
      config.requireLogin = false;
      return Promise.resolve(config);
    }

    window.__wishlistConfigPromises = window.__wishlistConfigPromises || {};

    if (!window.__wishlistConfigPromises[config.configUrl]) {
      window.__wishlistConfigPromises[config.configUrl] = window
        .fetch(config.configUrl, {
          credentials: "same-origin",
        })
        .then(readJson)
        .then(function (payload) {
          return { requireLogin: !!payload.requireLogin };
        })
        .catch(function () {
          return { requireLogin: false };
        });
    }

    return window.__wishlistConfigPromises[config.configUrl].then(
      function (payload) {
        config.requireLogin = !!payload.requireLogin;
        return config;
      },
    );
  }

  function guestSyncSessionKey(customerId) {
    return "wishlist-pro:guest-synced:" + customerId;
  }

  function isGuestSyncPending(customerId) {
    var guestState = readGuestState();
    if (
      !activeKeys(guestState.itemsByProductId).length &&
      !activeKeys(guestState.statusByHandle).length
    ) {
      return false;
    }

    try {
      return (
        window.sessionStorage.getItem(guestSyncSessionKey(customerId)) !== "1"
      );
    } catch {
      return true;
    }
  }

  function markGuestSynced(customerId) {
    try {
      window.sessionStorage.setItem(guestSyncSessionKey(customerId), "1");
    } catch {
      /* ignore storage errors */
    }
  }

  function syncGuestState(config) {
    if (!config.customerId || !config.syncUrl) {
      return Promise.resolve(null);
    }

    var guestState = readGuestState();
    var payload = {
      productIds: activeKeys(guestState.itemsByProductId),
      handles: activeKeys(guestState.statusByHandle),
    };

    if (!payload.productIds.length && !payload.handles.length) {
      return Promise.resolve(null);
    }

    if (!isGuestSyncPending(config.customerId)) {
      return Promise.resolve(null);
    }

    window.__wishlistGuestSyncPromises =
      window.__wishlistGuestSyncPromises || {};

    if (window.__wishlistGuestSyncPromises[config.customerId]) {
      return window.__wishlistGuestSyncPromises[config.customerId];
    }

    var formData = new window.FormData();
    formData.append("customerId", config.customerId);
    formData.append("state", JSON.stringify(payload));

    window.__wishlistGuestSyncPromises[config.customerId] = window
      .fetch(config.syncUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      })
      .then(readJson)
      .then(function (responsePayload) {
        if (!responsePayload.localOnly) {
          clearStoredState(guestKey());
          markGuestSynced(config.customerId);
        }

        delete window.__wishlistGuestSyncPromises[config.customerId];
        return responsePayload;
      })
      .catch(function (error) {
        delete window.__wishlistGuestSyncPromises[config.customerId];
        throw error;
      });

    return window.__wishlistGuestSyncPromises[config.customerId];
  }

  function buildItemsUrl(config, options) {
    var url = new URL(config.itemsUrl, window.location.origin);

    if (options.customerId) {
      url.searchParams.set("customerId", options.customerId);
    }

    if (options.productIds && options.productIds.length) {
      url.searchParams.set("productIds", options.productIds.join(","));
    }

    if (options.handles && options.handles.length) {
      url.searchParams.set("handles", options.handles.join(","));
    }

    return url.toString();
  }

  function fetchItems(config, options) {
    return window
      .fetch(buildItemsUrl(config, options), {
        credentials: "same-origin",
      })
      .then(readJson);
  }

  function formatMoney(amount, currencyCode) {
    if (typeof amount !== "number" || !currencyCode) {
      return "";
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
      }).format(amount);
    } catch {
      return amount.toFixed(2) + " " + currencyCode;
    }
  }

  function toggleRemote(config, product, intent) {
    var formData = new window.FormData();
    formData.append("customerId", config.customerId);
    formData.append("productId", product.id);
    formData.append("handle", product.handle);
    formData.append("intent", intent);

    return window
      .fetch(config.toggleUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      })
      .then(readJson);
  }

  function resolveCustomerId(config) {
    if (config.customerId) {
      return String(config.customerId);
    }

    if (window.Shopify && window.Shopify.customer && window.Shopify.customer.id) {
      return String(window.Shopify.customer.id);
    }

    if (window.__st && window.__st.cid) {
      return String(window.__st.cid);
    }

    var meta = document.querySelector('meta[name="shopify-customer-id"]');
    if (meta && meta.content) {
      return meta.content;
    }

    return "";
  }

  document
    .querySelectorAll("[data-wishlist-page]:not([data-wishlist-page-skip])")
    .forEach(function (root) {
    var config = {};
    try {
      config = JSON.parse(root.getAttribute("data-wishlist-page-config") || "{}");
    } catch (error) {
      console.error("wishlist.page.config.error", error);
    }
    config.customerId = resolveCustomerId(config);
    var statusNode = root.querySelector("[data-wishlist-page-status]");
    var emptyNode = root.querySelector("[data-wishlist-page-empty]");
    var emptyTitleNode = root.querySelector("[data-wishlist-empty-title]");
    var emptyTextNode = root.querySelector("[data-wishlist-empty-text]");
    var emptyLinkNode = root.querySelector("[data-wishlist-empty-link]");
    var gridNode = root.querySelector("[data-wishlist-page-grid]");
    var localOnly = false;

    if (!statusNode || !emptyNode || !gridNode) {
      console.error("wishlist.page.mount.error", "Missing wishlist page markup");
      return;
    }

    function setPanelVisible(node, visible) {
      if (!node) return;
      node.hidden = !visible;
    }

    function setStatus(text) {
      if (!statusNode) return;
      statusNode.textContent = text || "";
      setPanelVisible(statusNode, !!text);
    }

    function showEmpty(title, text, linkLabel, linkHref) {
      if (emptyTitleNode) emptyTitleNode.textContent = title;
      if (emptyTextNode) emptyTextNode.textContent = text;
      if (emptyLinkNode) {
        emptyLinkNode.textContent = linkLabel;
        emptyLinkNode.href = linkHref;
      }
      setPanelVisible(emptyNode, true);
      setPanelVisible(gridNode, false);
      if (gridNode) gridNode.innerHTML = "";
    }

    function showProducts(products) {
      if (!gridNode || !emptyNode) {
        return;
      }

      if (!products.length) {
        showEmpty(
          config.emptyTitle || "Your wishlist is empty",
          config.emptyText || "Save products to see them here.",
          config.browseLabel || "Browse products",
          "/collections/all",
        );
        return;
      }

      setPanelVisible(emptyNode, false);
      setPanelVisible(gridNode, true);
      gridNode.innerHTML = products
        .map(function (product) {
          var image = product.image
            ? '<img class="wishlist-pro-page-card__image" src="' +
              product.image +
              '" alt="' +
              (product.imageAlt || product.title) +
              '">'
            : '<div class="wishlist-pro-page-card__image wishlist-pro-page-card__image--placeholder">No image</div>';
          var price = formatMoney(product.priceAmount, product.currencyCode);
          var compareAt = formatMoney(
            product.compareAtPriceAmount,
            product.currencyCode,
          );
          var pricing = price
            ? '<div class="wishlist-pro-page-card__pricing">' +
              '<span class="wishlist-pro-page-card__price">' +
              price +
              "</span>" +
              (compareAt && product.compareAtPriceAmount > product.priceAmount
                ? '<span class="wishlist-pro-page-card__compare">' +
                  compareAt +
                  "</span>"
                : "") +
              (product.discountPercentage
                ? '<span class="wishlist-pro-page-card__discount">' +
                  product.discountPercentage +
                  "% off</span>"
                : "") +
              "</div>"
            : "";

          return (
            '<article class="wishlist-pro-page-card" data-wishlist-product-id="' +
            product.id +
            '" data-wishlist-product-handle="' +
            product.handle +
            '">' +
            '<a class="wishlist-pro-page-card__media" href="' +
            product.url +
            '">' +
            image +
            "</a>" +
            '<div class="wishlist-pro-page-card__body">' +
            '<div class="wishlist-pro-page-card__meta">' +
            '<a class="wishlist-pro-page-card__title" href="' +
            product.url +
            '">' +
            product.title +
            "</a>" +
            pricing +
            "</div>" +
            '<div class="wishlist-pro-page-card__actions">' +
            '<a class="wishlist-pro-page-card__link" href="' +
            product.url +
            '">View product</a>' +
            '<button type="button" class="wishlist-pro-page-card__remove" data-wishlist-remove>' +
            (config.removeLabel || "Remove") +
            "</button>" +
            "</div>" +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function getGuestPayload() {
      var state = readGuestState();
      return {
        productIds: activeKeys(state.itemsByProductId),
        handles: activeKeys(state.statusByHandle),
      };
    }

    function getCustomerFallbackPayload() {
      var state = readCustomerState(config.customerId);
      return {
        productIds: activeKeys(state.itemsByProductId),
        handles: activeKeys(state.statusByHandle),
      };
    }

    function removeGuestItem(productId, handle) {
      var state = readGuestState();
      delete state.itemsByProductId[productId];
      delete state.statusByHandle[handle];

      if (
        !hasEntries(state.itemsByProductId) &&
        !hasEntries(state.statusByHandle)
      ) {
        clearStoredState(guestKey());
        return;
      }

      writeStoredState(guestKey(), state);
    }

    function removeCustomerFallbackItem(productId, handle) {
      var storageKey = key(config.customerId);
      var state = readCustomerState(config.customerId);
      delete state.itemsByProductId[productId];
      delete state.statusByHandle[handle];

      if (
        !hasEntries(state.itemsByProductId) &&
        !hasEntries(state.statusByHandle)
      ) {
        clearStoredState(storageKey);
        return;
      }

      writeStoredState(storageKey, state);
    }

    function loadWishlist() {
      setStatus("Loading your wishlist.");

      loadSettings(config)
        .then(function () {
          if (!config.customerId) {
            if (config.requireLogin) {
              showEmpty(
                config.loginTitle || "Sign in to view your wishlist",
                config.loginText ||
                  "Your wishlist is available after you log in to your account.",
                "Login",
                config.loginUrl || "/account/login",
              );
              setStatus("");
              return null;
            }

            var guestPayload = getGuestPayload();
            if (
              !guestPayload.productIds.length &&
              !guestPayload.handles.length
            ) {
              showProducts([]);
              setStatus("");
              return null;
            }

            return fetchItems(config, guestPayload);
          }

          var itemsPromise = fetchItems(config, {
            customerId: config.customerId,
          });

          if (!isGuestSyncPending(config.customerId)) {
            return itemsPromise;
          }

          return Promise.all([
            itemsPromise,
            syncGuestState(config).catch(function (error) {
              console.error("wishlist.page.sync.error", error);
              return null;
            }),
          ]).then(function (results) {
            var itemsPayload = results[0];
            var syncPayload = results[1];

            if (syncPayload && syncPayload.synced) {
              return fetchItems(config, { customerId: config.customerId });
            }

            return itemsPayload;
          });
        })
        .then(function (payload) {
          if (!payload) {
            if (statusNode.textContent === "Loading your wishlist.") {
              setStatus("");
            }
            return;
          }

          if (payload.localOnly) {
            localOnly = true;
            var fallbackPayload = getCustomerFallbackPayload();

            if (
              !fallbackPayload.productIds.length &&
              !fallbackPayload.handles.length
            ) {
              showProducts([]);
              setStatus("");
              return;
            }

            return fetchItems(config, fallbackPayload).then(
              function (localPayload) {
                showProducts(localPayload.products || []);
                setStatus("");
              },
            );
          }

          localOnly = false;
          showProducts(payload.products || []);
          setStatus("");
        })
        .catch(function (error) {
          console.error("wishlist.page.load.error", error);
          setStatus(
            error && error.message
              ? error.message
              : "Unable to load wishlist right now.",
          );
        });
    }

    gridNode.addEventListener("click", function (event) {
      var button = event.target.closest("[data-wishlist-remove]");
      if (!button) return;

      var card = button.closest("[data-wishlist-product-id]");
      if (!card) return;

      var product = {
        id: card.getAttribute("data-wishlist-product-id"),
        handle: card.getAttribute("data-wishlist-product-handle"),
      };

      button.disabled = true;

      if (!config.customerId) {
        removeGuestItem(product.id, product.handle);
        loadWishlist();
        return;
      }

      if (localOnly) {
        removeCustomerFallbackItem(product.id, product.handle);
        loadWishlist();
        return;
      }

      toggleRemote(config, product, "remove").then(
        function () {
          loadWishlist();
        },
        function (error) {
          console.error("wishlist.page.remove.error", error);
          button.disabled = false;
        },
      );
    });

    loadWishlist();
  });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWishlistPage);
  } else {
    initWishlistPage();
  }
})();
