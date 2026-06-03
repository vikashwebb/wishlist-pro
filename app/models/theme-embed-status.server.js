/** Block handles from extensions/wishlist-theme/blocks/*.liquid (without .liquid). */
export const WISHLIST_THEME_EMBED_HANDLES = {
  productCards: "wishlist-product-cards",
  productEmbed: "wishlist-product-embed",
};

/**
 * Shopify themes may prefix settings_data.json with a block comment.
 */
export function stripSettingsDataComments(content = "") {
  return String(content).replace(/^\s*\/\*[\s\S]*?\*\//, "").trim();
}

/**
 * Returns whether an app embed block handle is enabled in settings_data.json.
 */
export function isAppEmbedEnabledInSettingsData(settingsDataContent, embedHandle) {
  if (!settingsDataContent || !embedHandle) {
    return false;
  }

  let parsed;
  try {
    parsed = JSON.parse(stripSettingsDataComments(settingsDataContent));
  } catch {
    return false;
  }

  const blocks = parsed?.current?.blocks ?? {};
  const needle = `/blocks/${embedHandle}/`;

  return Object.values(blocks).some((block) => {
    const type = String(block?.type ?? "");
    const disabled = block?.disabled === true;
    return type.includes(needle) && !disabled;
  });
}

export function getWishlistEmbedStatusFromSettingsData(settingsDataContent) {
  return {
    productCardsEnabled: isAppEmbedEnabledInSettingsData(
      settingsDataContent,
      WISHLIST_THEME_EMBED_HANDLES.productCards,
    ),
    productEmbedEnabled: isAppEmbedEnabledInSettingsData(
      settingsDataContent,
      WISHLIST_THEME_EMBED_HANDLES.productEmbed,
    ),
  };
}

export async function getMainThemeEmbedStatus(admin, mainThemeId, accessScopes = []) {
  const unavailable = {
    available: false,
    productCardsEnabled: false,
    productEmbedEnabled: false,
  };

  if (!admin || !mainThemeId || !accessScopes.includes("read_themes")) {
    return unavailable;
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query WishlistThemeEmbedStatus($id: ID!) {
          theme(id: $id) {
            files(filenames: ["config/settings_data.json"], first: 1) {
              nodes {
                body {
                  ... on OnlineStoreThemeFileBodyText {
                    content
                  }
                }
              }
            }
          }
        }`,
      { variables: { id: mainThemeId } },
    );
    const payload = await response.json();

    if (payload.errors?.length) {
      console.error(
        "wishlist.themeEmbedStatus.graphql.errors",
        payload.errors.map((error) => error.message).join(", "),
      );
      return unavailable;
    }

    const content =
      payload.data?.theme?.files?.nodes?.[0]?.body?.content ?? "";
    const status = getWishlistEmbedStatusFromSettingsData(content);

    return {
      available: true,
      ...status,
    };
  } catch (error) {
    console.error("wishlist.themeEmbedStatus.error", error);
    return unavailable;
  }
}
