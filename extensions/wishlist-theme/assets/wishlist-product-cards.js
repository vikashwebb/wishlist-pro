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

  function readConfig() {
    var node = document.querySelector("[data-wishlist-card-config]");
    if (!node) return null;

    try {
      return JSON.parse(node.textContent || "{}");
    } catch {
      return null;
    }
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

  function pruneLegacyHandles(customerId, handles) {
    if (!customerId || !handles.length) return;

    var state = readState(customerId);
    handles.forEach(function (handle) {
      delete state.statusByHandle[handle];
    });

    var storageKey = key(customerId);
    if (!storageKey) return;

    if (!hasEntries(state.itemsByProductId) && !hasEntries(state.statusByHandle)) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    writeState(customerId, state);
  }

  function setLocalHandleState(customerId, handle, active) {
    var state = readState(customerId);
    if (active) {
      state.statusByHandle[handle] = true;
    } else {
      delete state.statusByHandle[handle];
    }
    writeState(customerId, state);
  }

  function setGuestHandleState(handle, active) {
    var state = readGuestState();

    if (active) {
      state.statusByHandle[handle] = true;
    } else {
      delete state.statusByHandle[handle];
    }

    if (!hasEntries(state.itemsByProductId) && !hasEntries(state.statusByHandle)) {
      clearGuestState();
      return;
    }

    writeGuestState(state);
  }

  function mergeGuestStateIntoCustomerState(customerId) {
    if (!customerId) return;

    var guestState = readGuestState();
    if (!hasEntries(guestState.itemsByProductId) && !hasEntries(guestState.statusByHandle)) {
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

  function extractHandle(url) {
    try {
      var pathname = new URL(url, window.location.origin).pathname;
      var match = pathname.match(/\/products\/([^/?#]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function setState(button, active, labels) {
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.querySelector("[data-wishlist-label]").textContent = active
      ? labels.added
      : labels.add;
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

    return window.__wishlistConfigPromises[config.configUrl].then(function (payload) {
      config.requireLogin = !!payload.requireLogin;
      return config;
    });
  }

  function toggleRemote(config, handle, intent) {
    var formData = new window.FormData();
    formData.append("customerId", config.customerId);
    formData.append("handle", handle);
    formData.append("intent", intent);

    return window
      .fetch(config.toggleUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      })
      .then(readJson);
  }

  function fetchStatuses(config, handles) {
    var url = new URL(config.statusUrl, window.location.origin);
    url.searchParams.set("customerId", config.customerId);
    url.searchParams.set("handles", handles.join(","));

    return window
      .fetch(url.toString(), {
        credentials: "same-origin",
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
          return responsePayload;
        }

        clearGuestState();
        return responsePayload;
      })
      .catch(function (error) {
        delete window.__wishlistGuestSyncPromises[config.customerId];
        throw error;
      });

    return window.__wishlistGuestSyncPromises[config.customerId];
  }

  function makeButton(labels) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "wishlist-pro-button";
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("data-wishlist-button", "true");
    button.innerHTML =
      '<span class="wishlist-pro-button__icon" aria-hidden="true">♥</span>' +
      '<span data-wishlist-label>' +
      labels.add +
      "</span>";
    return button;
  }

  function inject(config, labels, onToggle) {
    var createdHandle = false;

    document.querySelectorAll(config.productLinkSelector).forEach(function (link) {
      var handle = extractHandle(link.href);
      if (!handle) return;

      var card =
        link.closest(config.productCardSelector) ||
        link.closest(".card-wrapper") ||
        link.closest(".grid__item");

      if (!card || card.querySelector("[data-wishlist-card-handle]")) return;
      if (window.getComputedStyle(card).position === "static") {
        card.style.position = "relative";
      }

      var anchor = document.createElement("div");
      anchor.className = "wishlist-pro-card-anchor";
      anchor.setAttribute("data-wishlist-card-handle", handle);

      var button = makeButton(labels);
      setState(button, false, labels);

      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        onToggle(handle, button);
      });

      anchor.appendChild(button);
      card.appendChild(anchor);
      createdHandle = true;
    });

    return createdHandle;
  }

  function getHandles() {
    return Array.from(
      document.querySelectorAll("[data-wishlist-card-handle]"),
      function (node) {
        return node.getAttribute("data-wishlist-card-handle");
      },
    ).filter(Boolean);
  }

  function applyStatuses(labels, statusByHandle) {
    document.querySelectorAll("[data-wishlist-card-handle]").forEach(function (node) {
      var handle = node.getAttribute("data-wishlist-card-handle");
      var button = node.querySelector("[data-wishlist-button]");
      if (!button) return;

      setState(button, !!statusByHandle[handle], labels);
      button.disabled = false;
    });
  }

  function setButtonsDisabled(disabled) {
    document
      .querySelectorAll("[data-wishlist-card-handle] [data-wishlist-button]")
      .forEach(function (button) {
        button.disabled = disabled;
      });
  }

  function syncLegacyHandles(config, payload, handles) {
    var legacyState = readState(config.customerId);
    var legacyHandles = handles.filter(function (handle) {
      return !!legacyState.statusByHandle[handle];
    });
    var handlesToSync = legacyHandles.filter(function (handle) {
      return !(payload.statusByHandle || {})[handle];
    });

    if (!handlesToSync.length) {
      if (legacyHandles.length) {
        pruneLegacyHandles(config.customerId, legacyHandles);
      }

      return Promise.resolve(payload);
    }

    var statusByHandle = Object.assign({}, payload.statusByHandle || {});
    var chain = Promise.resolve();

    handlesToSync.forEach(function (handle) {
      chain = chain.then(function () {
        return toggleRemote(config, handle, "add").then(
          function (nextPayload) {
            if (!nextPayload.localOnly) {
              statusByHandle[handle] = true;
            }
          },
          function (error) {
            console.error("wishlist.cards.legacySync.error", error);
          },
        );
      });
    });

    return chain.then(function () {
      pruneLegacyHandles(config.customerId, legacyHandles);
      payload.statusByHandle = statusByHandle;
      return payload;
    });
  }

  var config = readConfig();
  if (!config) return;

  var labels = {
    add: config.addLabel || "Wishlist",
    added: config.addedLabel || "Saved",
  };
  var localOnly = false;
  var statusByHandle = {};
  var refreshTimeoutId = null;

  function scheduleRefresh() {
    if (!config.customerId) {
      if (requiresLogin(config)) {
        applyStatuses(labels, {});
        return;
      }

      applyStatuses(labels, readGuestState().statusByHandle || {});
      return;
    }

    if (localOnly) {
      applyStatuses(labels, readState(config.customerId).statusByHandle || {});
      return;
    }

    window.clearTimeout(refreshTimeoutId);
    refreshTimeoutId = window.setTimeout(function () {
      var handles = getHandles();
      if (!handles.length) return;

      document
        .querySelectorAll("[data-wishlist-card-handle] [data-wishlist-button]")
        .forEach(function (button) {
          button.disabled = true;
        });

      syncGuestState(config)
        .catch(function (error) {
          console.error("wishlist.cards.sync.error", error);
          return null;
        })
        .then(function (syncPayload) {
          if (syncPayload && syncPayload.localOnly) {
            localOnly = true;
            statusByHandle = readState(config.customerId).statusByHandle || {};
            applyStatuses(labels, statusByHandle);
            return;
          }

          fetchStatuses(config, handles).then(
            function (payload) {
              if (payload.localOnly) {
                localOnly = true;
                statusByHandle = readState(config.customerId).statusByHandle || {};
                applyStatuses(labels, statusByHandle);
                return;
              }

              syncLegacyHandles(config, payload, handles).then(
                function (nextPayload) {
                  statusByHandle = nextPayload.statusByHandle || {};
                  applyStatuses(labels, statusByHandle);
                },
                function () {
                  applyStatuses(labels, statusByHandle);
                },
              );
            },
            function (error) {
              console.error("wishlist.cards.status.error", error);
              localOnly = true;
              mergeGuestStateIntoCustomerState(config.customerId);
              statusByHandle = readState(config.customerId).statusByHandle || {};
              applyStatuses(labels, statusByHandle);
            },
          );
        });
    }, 100);
  }

  function handleToggle(handle, button) {
    if (!config.customerId) {
      if (requiresLogin(config)) {
        window.location.href = config.loginUrl || "/account/login";
        return;
      }

      var nextGuestActive = button.getAttribute("aria-pressed") !== "true";
      setGuestHandleState(handle, nextGuestActive);
      setState(button, nextGuestActive, labels);
      return;
    }

    if (button.disabled) return;

    var nextActive = button.getAttribute("aria-pressed") !== "true";

    if (localOnly) {
      setLocalHandleState(config.customerId, handle, nextActive);
      statusByHandle[handle] = nextActive;
      setState(button, nextActive, labels);
      return;
    }

    button.disabled = true;
    toggleRemote(config, handle, nextActive ? "add" : "remove").then(
      function (payload) {
        if (payload.localOnly) {
          localOnly = true;
          setLocalHandleState(config.customerId, handle, nextActive);
          statusByHandle[handle] = nextActive;
          setState(button, nextActive, labels);
          button.disabled = false;
          return;
        }

        pruneLegacyHandles(config.customerId, [handle]);
        statusByHandle = Object.assign({}, statusByHandle, payload.statusByHandle || {});
        statusByHandle[handle] = !!payload.active;
        applyStatuses(labels, statusByHandle);
      },
      function (error) {
        console.error("wishlist.cards.toggle.error", error);
        button.disabled = false;
      },
    );
  }

  inject(config, labels, handleToggle);
  setButtonsDisabled(true);

  loadSettings(config).then(function () {
    scheduleRefresh();
  });

  new MutationObserver(function () {
    var createdHandle = inject(config, labels, handleToggle);
    if (createdHandle) {
      if (typeof config.requireLogin === "boolean") {
        scheduleRefresh();
      } else {
        setButtonsDisabled(true);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
