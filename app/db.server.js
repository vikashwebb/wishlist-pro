import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient();
}

const REQUIRED_SHOP_SETTINGS_FIELDS = [
  "wishlistButtonStyle",
  "wishlistButtonAccentColor",
  "wishlistButtonTextColor",
  "wishlistButtonIconColor",
];

function hasShopSettingsDelegate(client) {
  return typeof client?.shopSettings?.findUnique === "function";
}

function hasLatestShopSettingsFields(client) {
  const fields = client?._runtimeDataModel?.models?.ShopSettings?.fields;

  if (!Array.isArray(fields)) {
    return false;
  }

  const fieldNames = new Set(fields.map((field) => field.name));

  return REQUIRED_SHOP_SETTINGS_FIELDS.every((field) => fieldNames.has(field));
}

function shouldReusePrismaClient(client) {
  return hasShopSettingsDelegate(client) && hasLatestShopSettingsFields(client);
}

let prisma;

if (process.env.NODE_ENV !== "production") {
  // Refresh the cached client after Prisma schema changes during dev hot reloads.
  if (!shouldReusePrismaClient(global.prismaGlobal)) {
    global.prismaGlobal?.$disconnect?.().catch(() => {});
    global.prismaGlobal = createPrismaClient();
  }

  prisma = global.prismaGlobal;
} else {
  prisma = createPrismaClient();
}

export default prisma;
