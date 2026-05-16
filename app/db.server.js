import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient();
}

function hasShopSettingsDelegate(client) {
  return typeof client?.shopSettings?.findUnique === "function";
}

function shouldReusePrismaClient(client) {
  return hasShopSettingsDelegate(client);
}

let prisma;

if (process.env.NODE_ENV !== "production") {
  if (!shouldReusePrismaClient(global.prismaGlobal)) {
    global.prismaGlobal?.$disconnect?.().catch(() => {});
    global.prismaGlobal = createPrismaClient();
  }

  prisma = global.prismaGlobal;
} else {
  prisma = createPrismaClient();
}

export default prisma;
