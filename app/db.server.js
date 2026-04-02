import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient();
}

function hasShopSettingsDelegate(client) {
  return typeof client?.shopSettings?.findUnique === "function";
}

let prisma;

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal || !hasShopSettingsDelegate(global.prismaGlobal)) {
    global.prismaGlobal = createPrismaClient();
  }

  prisma = global.prismaGlobal;
} else {
  prisma = createPrismaClient();
}

export default prisma;
