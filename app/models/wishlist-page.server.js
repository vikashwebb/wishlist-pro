import { logWishlist } from "../utils/logger.server";

export function getWishlistPagePath(handle = "wishlist") {
  return `/pages/${handle}`;
}

export function getWishlistProxyPath() {
  return "/apps/wishlist-proxy/wishlist";
}

export function isLegacyWishlistPageBody(body = "") {
  const normalized = String(body).toLowerCase();
  const proxyPath = getWishlistProxyPath().toLowerCase();

  if (
    normalized.includes('http-equiv="refresh"') ||
    normalized.includes("http-equiv='refresh'") ||
    normalized.includes("location.replace")
  ) {
    return true;
  }

  if (!normalized.includes("data-wishlist-page")) {
    return (
      normalized.includes(proxyPath) &&
      !normalized.includes("data-wishlist-page-config")
    );
  }

  if (
    normalized.includes("theme-js") ||
    normalized.includes("theme-css") ||
    normalized.includes("wishlist-pro-page__eyebrow") ||
    normalized.includes("wishlist-pro-page__header") ||
    (normalized.includes("<script") &&
      !normalized.includes(`${proxyPath}/theme.js`))
  ) {
    return true;
  }

  return false;
}

function normalizePageBody(body = "") {
  return String(body).replace(/\s+/g, " ").trim();
}

export function isWishlistPageBodyCurrent(body, { title = "Your wishlist" } = {}) {
  return (
    normalizePageBody(body) === normalizePageBody(buildWishlistPageBody({ title }))
  );
}

export function needsWishlistPageBodyRepair(body = "") {
  if (!String(body ?? "").trim()) {
    return true;
  }

  const duplicateWidgets =
    (String(body).match(/data-wishlist-page(?!-)/g) || []).length > 1;

  return isLegacyWishlistPageBody(body) || duplicateWidgets;
}

export function buildWishlistPageBody({ title = "Your wishlist" } = {}) {
  const proxyPath = getWishlistProxyPath();
  const config = {
    customerId: "",
    configUrl: `${proxyPath}/config`,
    itemsUrl: `${proxyPath}/items`,
    syncUrl: `${proxyPath}/sync`,
    toggleUrl: `${proxyPath}/toggle`,
    loginUrl: "/account/login",
    emptyTitle: "Your wishlist is empty",
    emptyText: "Save products to see them here.",
    loginTitle: "Sign in to view your wishlist",
    loginText: "Your wishlist is available after you log in to your account.",
    browseLabel: "Browse products",
    removeLabel: "Remove",
  };
  const configJson = JSON.stringify(config).replace(/</g, "\\u003c");

  return `
<link rel="stylesheet" href="${proxyPath}/theme.css">
<script src="${proxyPath}/theme.js" defer></script>
<div
  data-wishlist-page
  data-wishlist-page-config='${configJson}'
>
  <div class="wishlist-pro-page">
    <div class="wishlist-pro-page__status" data-wishlist-page-status>
      Loading your wishlist.
    </div>
    <div class="wishlist-pro-page__empty" data-wishlist-page-empty hidden>
      <h3 data-wishlist-empty-title>Your wishlist is empty</h3>
      <p data-wishlist-empty-text>Save products to see them here.</p>
      <a class="wishlist-pro-page__cta" href="/collections/all" data-wishlist-empty-link>
        Browse products
      </a>
    </div>
    <div class="wishlist-pro-page__grid" data-wishlist-page-grid hidden></div>
  </div>
</div>
  `.trim();
}

async function findWishlistPage(admin, handle) {
  const response = await admin.graphql(
    `#graphql
      query FindWishlistPage($query: String!) {
        pages(first: 1, query: $query) {
          nodes {
            id
            title
            handle
            body
          }
        }
      }`,
    {
      variables: {
        query: `handle:${handle}`,
      },
    },
  );

  const payload = await response.json();
  logWishlist("wishlist.pageFind.graphql", JSON.stringify(payload, null, 2));

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  return payload.data?.pages?.nodes?.[0] ?? null;
}

export async function getWishlistPageByHandle(admin, handle = "wishlist") {
  if (!handle) return null;
  return findWishlistPage(admin, handle);
}

async function createWishlistPage(admin, { title, handle }) {
  const response = await admin.graphql(
    `#graphql
      mutation CreateWishlistPage($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page {
            id
            title
            handle
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
    {
      variables: {
        page: {
          title,
          handle,
          body: buildWishlistPageBody({ title }),
          isPublished: true,
        },
      },
    },
  );

  const payload = await response.json();
  logWishlist("wishlist.pageCreate.graphql", JSON.stringify(payload, null, 2));

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  const userErrors = payload.data?.pageCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  const page = payload.data?.pageCreate?.page ?? null;
  if (!page) {
    throw new Error("Wishlist page was not created");
  }

  return {
    page,
    path: getWishlistPagePath(page.handle),
  };
}

async function updateWishlistPage(admin, pageId, { title, handle }) {
  const response = await admin.graphql(
    `#graphql
      mutation UpdateWishlistPage($id: ID!, $page: PageUpdateInput!) {
        pageUpdate(id: $id, page: $page) {
          page {
            id
            title
            handle
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
    {
      variables: {
        id: pageId,
        page: {
          title,
          handle,
          body: buildWishlistPageBody({ title }),
          isPublished: true,
        },
      },
    },
  );

  const payload = await response.json();
  logWishlist("wishlist.pageUpdate.graphql", JSON.stringify(payload, null, 2));

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  const userErrors = payload.data?.pageUpdate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  const page = payload.data?.pageUpdate?.page ?? null;
  if (!page) {
    throw new Error("Wishlist page was not updated");
  }

  return {
    page,
    path: getWishlistPagePath(page.handle),
  };
}

export async function ensureWishlistPageBodyCurrent(
  admin,
  { title = "Wishlist", handle = "wishlist" } = {},
) {
  const page = await findWishlistPage(admin, handle);
  if (!page) {
    return { repaired: false, page: null };
  }

  if (
    isWishlistPageBodyCurrent(page.body, { title }) &&
    !needsWishlistPageBodyRepair(page.body)
  ) {
    return { repaired: false, page };
  }

  logWishlist("wishlist.pageRepair", { pageId: page.id, handle });

  const result = await updateWishlistPage(admin, page.id, { title, handle });
  return { repaired: true, page: result.page, path: result.path };
}

export async function upsertWishlistPage(
  admin,
  { title = "Wishlist", handle = "wishlist", previousHandle = handle } = {},
) {
  const existingPage =
    (await findWishlistPage(admin, handle)) ||
    (previousHandle && previousHandle !== handle
      ? await findWishlistPage(admin, previousHandle)
      : null);

  if (existingPage) {
    const result = await updateWishlistPage(admin, existingPage.id, {
      title,
      handle,
    });
    return { ...result, mode: "updated" };
  }

  const result = await createWishlistPage(admin, { title, handle });
  return { ...result, mode: "created" };
}
