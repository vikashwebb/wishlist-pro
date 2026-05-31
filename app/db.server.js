import "./preload.server.js";
import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

function hasShopSettingsDelegate(client) {
  return typeof client?.shopSettings?.findUnique === "function";
}

function getOrCreateClient() {
  if (!hasShopSettingsDelegate(global.prismaGlobal)) {
    global.prismaGlobal?.$disconnect?.().catch(() => {});
    global.prismaGlobal = createPrismaClient();
  }

  return global.prismaGlobal;
}

export default new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getOrCreateClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);
