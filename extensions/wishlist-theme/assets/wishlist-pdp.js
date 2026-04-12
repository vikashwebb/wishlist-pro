(function () {
  function guestKey() {
    return "wishlist-pro:guest";
  }

  function requiresLogin(config) {
    return !!config.requireLogin;
  }

  function emptyState() {
    return { itemsByProductId: {}, statusByHandle: {}, localOnly: true };
  }

  function key(customerId) {
    return customerId ? "wishlist-pro:" + customerId : null;
  }

  function readStoredState(storageKey) {
    if (!storageKey) {
      return emptyState();
    }

    try {
      var parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      return {
        itemsByProductId: parsed.itemsByProductId || {},
        statusByHandle: parsed.statusByHandle || {},
        localOnly: true,
      };
    } catch {
      return emptyState();
    }
  }

  function readState(customerId) {
    return readStoredState(key(customerId));
  }

  function readGuestState() {
    return readStoredState(guestKey());
  }

  function writeState(customerId, state) {
    var storageKey = key(customerId);
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function writeGuestState(state) {
    window.localStorage.setItem(guestKey(), JSON.stringify(state));
  }

  function clearGuestState() {
    window.localStorage.removeItem(guestKey());
  }

  function hasEntries(object) {
    return Object.keys(object || {}).length > 0;
  }

  function activeKeys(object) {
    return Object.keys(object || {}).filter(function (item) {
      return !!object[item];
    });
  }

  function pruneLegacyState(customerId, productId, productHandle) {
    if (!customerId) return;

    var state = readState(customerId);
    delete state.itemsByProductId[productId];
    delete state.statusByHandle[productHandle];

    var storageKey = key(customerId);
    if (!storageKey) return;

    if (
      !hasEntries(state.itemsByProductId) &&
      !hasEntries(state.statusByHandle)
    ) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    writeState(customerId, state);
  }

  function setLocalState(customerId, productId, productHandle, active) {
    var state = readState(customerId);
    if (active) {
      state.itemsByProductId[productId] = true;
      state.statusByHandle[productHandle] = true;
    } else {
      delete state.itemsByProductId[productId];
      delete state.statusByHandle[productHandle];
    }
    writeState(customerId, state);
  }

  function setGuestState(productId, productHandle, active) {
    var state = readGuestState();

    if (active) {
      state.itemsByProductId[productId] = true;
      state.statusByHandle[productHandle] = true;
    } else {
      delete state.itemsByProductId[productId];
      delete state.statusByHandle[productHandle];
    }

    if (
      !hasEntries(state.itemsByProductId) &&
      !hasEntries(state.statusByHandle)
    ) {
      clearGuestState();
      return;
    }

    writeGuestState(state);
  }

  function mergeGuestStateIntoCustomerState(customerId) {
    if (!customerId) return;

    var guestState = readGuestState();
    if (
      !hasEntries(guestState.itemsByProductId) &&
      !hasEntries(guestState.statusByHandle)
    ) {
      return;
    }

    var customerState = readState(customerId);
    customerState.itemsByProductId = Object.assign(
      {},
      guestState.itemsByProductId,
      customerState.itemsByProductId,
    );
    customerState.statusByHandle = Object.assign(
      {},
      guestState.statusByHandle,
      customerState.statusByHandle,
    );
    writeState(customerId, customerState);
  }

  function hasGuestWishlistState() {
    var guestState = readGuestState();
    return (
      hasEntries(guestState.itemsByProductId) ||
      hasEntries(guestState.statusByHandle)
    );
  }

  function buildStatusUrl(config) {
    var url = new URL(config.statusUrl, window.location.origin);
    url.searchParams.set("customerId", config.customerId);
    url.searchParams.set("productId", config.productId);
    url.searchParams.set("handle", config.productHandle);
    return url.toString();
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
          return {
            requireLogin: !!payload.requireLogin,
          };
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

  function fetchStatus(config) {
    return window
      .fetch(buildStatusUrl(config), {
        credentials: "same-origin",
      })
      .then(readJson);
  }

  function toggleRemote(config, intent) {
    var formData = new window.FormData();
    formData.append("customerId", config.customerId);
    formData.append("productId", config.productId);
    formData.append("handle", config.productHandle);
    formData.append("intent", intent);

    return window
      .fetch(config.toggleUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      })
      .then(readJson);
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
        if (responsePayload.localOnly) {
          mergeGuestStateIntoCustomerState(config.customerId);
          delete window.__wishlistGuestSyncPromises[config.customerId];
          return responsePayload;
        }

        clearGuestState();
        delete window.__wishlistGuestSyncPromises[config.customerId];
        return responsePayload;
      })
      .catch(function (error) {
        delete window.__wishlistGuestSyncPromises[config.customerId];
        throw error;
      });

    return window.__wishlistGuestSyncPromises[config.customerId];
  }

  function isActive(config, payload) {
    if (!payload) return false;
    if (typeof payload.active === "boolean") return payload.active;

    return (
      !!(payload.items || []).includes(config.productId) ||
      !!(payload.statusByHandle || {})[config.productHandle]
    );
  }

  function defaultMountSelectors() {
    return [
      "product-info .product-form",
      "product-info .buy-buttons",
      ".product-form",
      ".product__buy-buttons",
      ".product__info-wrapper",
      ".product__info-container",
      "[data-product-form]",
      "form[action*='/cart/add']",
      "main",
    ];
  }

  function buildMountSelectors(config) {
    var selectors = [];

    if (
      typeof config.targetSelector === "string" &&
      config.targetSelector.trim()
    ) {
      selectors.push(config.targetSelector.trim());
    }

    return selectors.concat(defaultMountSelectors());
  }

  function ensureMarkup(root, labels, config) {
    var button = root.querySelector("[data-wishlist-button]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "wishlist-pro-button";
      button.setAttribute("data-wishlist-button", "true");
      button.setAttribute("aria-pressed", "false");
      button.innerHTML =
        '<span class="wishlist-pro-button__icon" aria-hidden="true">♥</span>' +
        "<span data-wishlist-label>" +
        labels.add +
        "</span>";
      root.appendChild(button);
    }

    var loginNote = root.querySelector("[data-wishlist-login-note]");
    if (!loginNote && config.loginText) {
      loginNote = document.createElement("p");
      loginNote.className = "wishlist-pro-login-note";
      loginNote.setAttribute("data-wishlist-login-note", "true");
      loginNote.hidden = true;
      loginNote.textContent = config.loginText;
      root.appendChild(loginNote);
    }

    return {
      button: button,
      loginNote: loginNote,
    };
  }

  function mountInlineRoot(root, config) {
    if (root.getAttribute("data-wishlist-auto-insert") !== "true") {
      return true;
    }

    if (root.getAttribute("data-wishlist-mounted") === "true") {
      root.hidden = false;
      return true;
    }

    var selectors = buildMountSelectors(config);
    for (var index = 0; index < selectors.length; index += 1) {
      var target = document.querySelector(selectors[index]);
      if (!target) continue;

      root.classList.add("wishlist-pro-inline");
      root.hidden = false;

      if (target.tagName === "FORM") {
        target.insertAdjacentElement("afterend", root);
      } else {
        target.appendChild(root);
      }

      root.setAttribute("data-wishlist-mounted", "true");
      return true;
    }

    root.hidden = true;
    return false;
  }

  function mountInlineRootWhenReady(root, config, start) {
    if (mountInlineRoot(root, config)) {
      start();
      return;
    }

    var observer = new MutationObserver(function () {
      if (!mountInlineRoot(root, config)) {
        return;
      }

      observer.disconnect();
      start();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function setState(button, active, labels) {
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.querySelector("[data-wishlist-label]").textContent = active
      ? labels.added
      : labels.add;
  }

  function syncLegacyState(config, payload) {
    var legacyState = readState(config.customerId);
    var legacyActive =
      !!legacyState.itemsByProductId[config.productId] ||
      !!legacyState.statusByHandle[config.productHandle];

    if (!legacyActive) {
      return Promise.resolve(payload);
    }

    if (isActive(config, payload)) {
      pruneLegacyState(
        config.customerId,
        config.productId,
        config.productHandle,
      );
      return Promise.resolve(payload);
    }

    return toggleRemote(config, "add")
      .then(function (nextPayload) {
        pruneLegacyState(
          config.customerId,
          config.productId,
          config.productHandle,
        );
        return nextPayload;
      })
      .catch(function (error) {
        console.error("wishlist.pdp.legacySync.error", error);
        return payload;
      });
  }

  document.querySelectorAll("[data-wishlist-pdp]").forEach(function (root) {
    var config = JSON.parse(root.getAttribute("data-wishlist-config") || "{}");
    var labels = {
      add: config.addLabel || "Add to Wishlist",
      added: config.addedLabel || "Added to Wishlist",
    };
    var markup = ensureMarkup(root, labels, config);
    var button = markup.button;
    var loginNote = markup.loginNote;

    function start() {
      if (root.getAttribute("data-wishlist-bound") === "true") {
        return;
      }

      root.setAttribute("data-wishlist-bound", "true");

      if (!config.customerId) {
        button.disabled = true;

        loadSettings(config).then(function () {
          if (requiresLogin(config)) {
            if (loginNote) {
              loginNote.hidden = false;
            }
            setState(button, false, labels);
            button.disabled = false;
            return;
          }

          if (loginNote) {
            loginNote.hidden = true;
          }

          var guestState = readGuestState();
          setState(
            button,
            !!guestState.itemsByProductId[config.productId] ||
              !!guestState.statusByHandle[config.productHandle],
            labels,
          );
          button.disabled = false;
        });

        button.addEventListener("click", function () {
          if (button.disabled) return;

          if (requiresLogin(config)) {
            window.location.href = config.loginUrl || "/account/login";
            return;
          }

          var nextActive = button.getAttribute("aria-pressed") !== "true";
          setGuestState(config.productId, config.productHandle, nextActive);
          setState(button, nextActive, labels);
        });
        return;
      }

      var localOnly = false;
      button.disabled = true;
      var hadGuestWishlist = hasGuestWishlistState();

      if (hadGuestWishlist) {
        mergeGuestStateIntoCustomerState(config.customerId);
        var immediateState = readState(config.customerId);
        setState(
          button,
          !!immediateState.itemsByProductId[config.productId] ||
            !!immediateState.statusByHandle[config.productHandle],
          labels,
        );
        button.disabled = false;
      }

      loadSettings(config)
        .then(function () {
          if (loginNote) {
            loginNote.hidden = true;
          }

          return syncGuestState(config);
        })
        .catch(function (error) {
          console.error("wishlist.pdp.sync.error", error);
          return null;
        })
        .then(function (syncPayload) {
          if (syncPayload && syncPayload.localOnly) {
            localOnly = true;
            var syncedFallbackState = readState(config.customerId);
            setState(
              button,
              !!syncedFallbackState.itemsByProductId[config.productId] ||
                !!syncedFallbackState.statusByHandle[config.productHandle],
              labels,
            );
            button.disabled = false;
            return;
          }

          if (hadGuestWishlist) {
            var syncedImmediateState = readState(config.customerId);
            setState(
              button,
              !!syncedImmediateState.itemsByProductId[config.productId] ||
                !!syncedImmediateState.statusByHandle[config.productHandle],
              labels,
            );
            button.disabled = false;
          }

          fetchStatus(config).then(
            function (payload) {
              if (payload.localOnly) {
                localOnly = true;
                var fallbackState = readState(config.customerId);
                setState(
                  button,
                  !!fallbackState.itemsByProductId[config.productId] ||
                    !!fallbackState.statusByHandle[config.productHandle],
                  labels,
                );
                button.disabled = false;
                return;
              }

              syncLegacyState(config, payload).then(
                function (nextPayload) {
                  var active = isActive(config, nextPayload);
                  setLocalState(
                    config.customerId,
                    config.productId,
                    config.productHandle,
                    active,
                  );
                  setState(button, active, labels);
                  button.disabled = false;
                },
                function () {
                  button.disabled = false;
                },
              );
            },
            function (error) {
              console.error("wishlist.pdp.status.error", error);
              localOnly = true;
              mergeGuestStateIntoCustomerState(config.customerId);
              var fallbackState = readState(config.customerId);
              setState(
                button,
                !!fallbackState.itemsByProductId[config.productId] ||
                  !!fallbackState.statusByHandle[config.productHandle],
                labels,
              );
              button.disabled = false;
            },
          );
        });

      button.addEventListener("click", function () {
        if (button.disabled) return;

        var previousActive = button.getAttribute("aria-pressed") === "true";
        var nextActive = button.getAttribute("aria-pressed") !== "true";
        if (localOnly) {
          setLocalState(
            config.customerId,
            config.productId,
            config.productHandle,
            nextActive,
          );
          setState(button, nextActive, labels);
          return;
        }

        setLocalState(
          config.customerId,
          config.productId,
          config.productHandle,
          nextActive,
        );
        setState(button, nextActive, labels);
        button.disabled = true;
        toggleRemote(config, nextActive ? "add" : "remove").then(
          function (payload) {
            if (payload.localOnly) {
              localOnly = true;
              setLocalState(
                config.customerId,
                config.productId,
                config.productHandle,
                nextActive,
              );
              setState(button, nextActive, labels);
              button.disabled = false;
              return;
            }

            pruneLegacyState(
              config.customerId,
              config.productId,
              config.productHandle,
            );
            setLocalState(
              config.customerId,
              config.productId,
              config.productHandle,
              !!payload.active,
            );
            setState(button, isActive(config, payload), labels);
            button.disabled = false;
          },
          function (error) {
            console.error("wishlist.pdp.toggle.error", error);
            setLocalState(
              config.customerId,
              config.productId,
              config.productHandle,
              previousActive,
            );
            setState(button, previousActive, labels);
            button.disabled = false;
          },
        );
      });
    }

    if (root.getAttribute("data-wishlist-auto-insert") === "true") {
      mountInlineRootWhenReady(root, config, start);
      return;
    }

    start();
  });
})();
