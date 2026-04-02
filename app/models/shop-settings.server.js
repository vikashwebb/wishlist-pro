import prisma from "../db.server";

const DEFAULT_SETTINGS = {
  wishlistRequiresLogin: false,
};

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
  };
}

export async function updateShopSettings(shop, input) {
  if (!shop) {
    throw new Error("shop is required");
  }

  if (!hasShopSettingsModel()) {
    return DEFAULT_SETTINGS;
  }

  const wishlistRequiresLogin = !!input?.wishlistRequiresLogin;

  const settings = await prisma.shopSettings.upsert({
    where: { shop },
    update: { wishlistRequiresLogin },
    create: { shop, wishlistRequiresLogin },
  });

  return {
    wishlistRequiresLogin: settings.wishlistRequiresLogin,
  };
}
