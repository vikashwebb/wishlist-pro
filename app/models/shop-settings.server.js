import prisma from "../db.server";

const DEFAULT_SETTINGS = {
  wishlistRequiresLogin: false,
  wishlistPageTitle: "Wishlist",
  wishlistPageHandle: "wishlist",
};

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

  const settings = await prisma.shopSettings.upsert({
    where: { shop },
    update: { wishlistRequiresLogin, wishlistPageTitle, wishlistPageHandle },
    create: {
      shop,
      wishlistRequiresLogin,
      wishlistPageTitle,
      wishlistPageHandle,
    },
  });

  return {
    wishlistRequiresLogin: settings.wishlistRequiresLogin,
    wishlistPageTitle: settings.wishlistPageTitle,
    wishlistPageHandle: settings.wishlistPageHandle,
  };
}
