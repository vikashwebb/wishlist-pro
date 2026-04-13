export function getWishlistPagePath(handle = "wishlist") {
  return `/pages/${handle}`;
}

export function getWishlistProxyPath() {
  return "/apps/wishlist-proxy/wishlist";
}

function buildWishlistPageBody() {
  const proxyPath = getWishlistProxyPath();

  return `
    <meta http-equiv="refresh" content="0; url=${proxyPath}">
    <script>window.location.replace(${JSON.stringify(proxyPath)});</script>
    <p>Redirecting to your wishlist...</p>
    <p><a href="${proxyPath}">Open wishlist</a></p>
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
  console.log("wishlist.pageFind.graphql", JSON.stringify(payload, null, 2));

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  return payload.data?.pages?.nodes?.[0] ?? null;
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
          body: buildWishlistPageBody(),
          isPublished: true,
        },
      },
    },
  );

  const payload = await response.json();
  console.log("wishlist.pageCreate.graphql", JSON.stringify(payload, null, 2));

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
          body: buildWishlistPageBody(),
          isPublished: true,
        },
      },
    },
  );

  const payload = await response.json();
  console.log("wishlist.pageUpdate.graphql", JSON.stringify(payload, null, 2));

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
