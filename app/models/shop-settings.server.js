import prisma from "../db.server";

const DEFAULT_SETTINGS = {
  wishlistRequiresLogin: false,
  wishlistPageTitle: "Wishlist",
  wishlistPageHandle: "wishlist",
  wishlistButtonStyle: "outline",
  wishlistButtonAccentColor: "#0f172a",
  wishlistButtonTextColor: "#ffffff",
  wishlistButtonIconColor: "#0f172a",
};

const BUTTON_STYLES = new Set(["outline", "solid", "icon-only"]);

function normalizeWishlistPageTitle(value) {
  const title = value?.toString().trim();
  return title || DEFAULT_SETTINGS.wishlistPageTitle;
}

function normalizeWishlistPageHandle(value) {
  const raw = value?.toString().trim().toLowerCase();
  const normalized = (raw || DEFAULT_SETTINGS.wishlistPageHandle)
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || DEFAULT_SETTINGS.wishlistPageHandle;
}

function normalizeWishlistButtonStyle(value) {
  const normalized = value?.toString().trim().toLowerCase();
  return BUTTON_STYLES.has(normalized)
    ? normalized
    : DEFAULT_SETTINGS.wishlistButtonStyle;
}

function normalizeColor(value, fallback) {
  const normalized = value?.toString().trim().toLowerCase();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(normalized)
    ? normalized
    : fallback;
}

function hasShopSettingsModel() {
  return typeof prisma?.shopSettings?.findUnique === "function";
}

export async function getShopSettings(shop) {
  if (!shop || !hasShopSettingsModel()) {
    return DEFAULT_SETTINGS;
  }

  const settings = await prisma.shopSettings.findUnique({
    where: { shop },
  });

  return {
    wishlistRequiresLogin:
      settings?.wishlistRequiresLogin ?? DEFAULT_SETTINGS.wishlistRequiresLogin,
    wishlistPageTitle:
      settings?.wishlistPageTitle ?? DEFAULT_SETTINGS.wishlistPageTitle,
    wishlistPageHandle:
      settings?.wishlistPageHandle ?? DEFAULT_SETTINGS.wishlistPageHandle,
    wishlistButtonStyle:
      settings?.wishlistButtonStyle ?? DEFAULT_SETTINGS.wishlistButtonStyle,
    wishlistButtonAccentColor:
      settings?.wishlistButtonAccentColor ??
      DEFAULT_SETTINGS.wishlistButtonAccentColor,
    wishlistButtonTextColor:
      settings?.wishlistButtonTextColor ??
      DEFAULT_SETTINGS.wishlistButtonTextColor,
    wishlistButtonIconColor:
      settings?.wishlistButtonIconColor ??
      DEFAULT_SETTINGS.wishlistButtonIconColor,
  };
}

export async function updateShopSettings(shop, input) {
  if (!shop) {
    throw new Error("shop is required");
  }

  if (!hasShopSettingsModel()) {
    return DEFAULT_SETTINGS;
  }

  const current = await prisma.shopSettings.findUnique({
    where: { shop },
  });

  const wishlistRequiresLogin =
    typeof input?.wishlistRequiresLogin === "boolean"
      ? input.wishlistRequiresLogin
      : (current?.wishlistRequiresLogin ??
        DEFAULT_SETTINGS.wishlistRequiresLogin);
  const wishlistPageTitle =
    typeof input?.wishlistPageTitle === "string"
      ? normalizeWishlistPageTitle(input.wishlistPageTitle)
      : (current?.wishlistPageTitle ?? DEFAULT_SETTINGS.wishlistPageTitle);
  const wishlistPageHandle =
    typeof input?.wishlistPageHandle === "string"
      ? normalizeWishlistPageHandle(input.wishlistPageHandle)
      : (current?.wishlistPageHandle ?? DEFAULT_SETTINGS.wishlistPageHandle);
  const wishlistButtonStyle =
    typeof input?.wishlistButtonStyle === "string"
      ? normalizeWishlistButtonStyle(input.wishlistButtonStyle)
      : (current?.wishlistButtonStyle ?? DEFAULT_SETTINGS.wishlistButtonStyle);
  const wishlistButtonAccentColor =
    typeof input?.wishlistButtonAccentColor === "string"
      ? normalizeColor(
          input.wishlistButtonAccentColor,
          DEFAULT_SETTINGS.wishlistButtonAccentColor,
        )
      : (current?.wishlistButtonAccentColor ??
        DEFAULT_SETTINGS.wishlistButtonAccentColor);
  const wishlistButtonTextColor =
    typeof input?.wishlistButtonTextColor === "string"
      ? normalizeColor(
          input.wishlistButtonTextColor,
          DEFAULT_SETTINGS.wishlistButtonTextColor,
        )
      : (current?.wishlistButtonTextColor ??
        DEFAULT_SETTINGS.wishlistButtonTextColor);
  const wishlistButtonIconColor =
    typeof input?.wishlistButtonIconColor === "string"
      ? normalizeColor(
          input.wishlistButtonIconColor,
          DEFAULT_SETTINGS.wishlistButtonIconColor,
        )
      : (current?.wishlistButtonIconColor ??
        DEFAULT_SETTINGS.wishlistButtonIconColor);

  const settings = await prisma.shopSettings.upsert({
    where: { shop },
    update: {
      wishlistRequiresLogin,
      wishlistPageTitle,
      wishlistPageHandle,
      wishlistButtonStyle,
      wishlistButtonAccentColor,
      wishlistButtonTextColor,
      wishlistButtonIconColor,
    },
    create: {
      shop,
      wishlistRequiresLogin,
      wishlistPageTitle,
      wishlistPageHandle,
      wishlistButtonStyle,
      wishlistButtonAccentColor,
      wishlistButtonTextColor,
      wishlistButtonIconColor,
    },
  });

  return {
    wishlistRequiresLogin: settings.wishlistRequiresLogin,
    wishlistPageTitle: settings.wishlistPageTitle,
    wishlistPageHandle: settings.wishlistPageHandle,
    wishlistButtonStyle: settings.wishlistButtonStyle,
    wishlistButtonAccentColor: settings.wishlistButtonAccentColor,
    wishlistButtonTextColor: settings.wishlistButtonTextColor,
    wishlistButtonIconColor: settings.wishlistButtonIconColor,
  };
}
