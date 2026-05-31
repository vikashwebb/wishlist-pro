import "./preload.server.js";
import { PrismaClient } from "@prisma/client";
import { isServerlessRuntime } from "./preload.server.js";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  return new PrismaClient({
    datasources: {
      db: { url },
    },
  });
}

function hasShopSettingsDelegate(client) {
  return typeof client?.shopSettings?.findUnique === "function";
}

export function resetPrismaClient() {
  const existing = globalThis.prismaGlobal;
  if (existing?.$disconnect) {
    existing.$disconnect().catch(() => {});
  }

  globalThis.prismaGlobal = undefined;
}

function getOrCreateClient() {
  const currentUrl = process.env.DATABASE_URL;

  if (
    globalThis.prismaGlobal &&
    globalThis.prismaDatabaseUrl !== currentUrl
  ) {
    resetPrismaClient();
  }

  if (!hasShopSettingsDelegate(globalThis.prismaGlobal)) {
    globalThis.prismaGlobal = createPrismaClient();
    globalThis.prismaDatabaseUrl = currentUrl;
  }

  return globalThis.prismaGlobal;
}

export function getPrismaClient() {
  return getOrCreateClient();
}

export default new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "then") {
        return undefined;
      }

      const client = getOrCreateClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  },
);

/** On serverless, always recreate the client after DATABASE_URL is finalized. */
export function syncPrismaClientForServerless() {
  if (!isServerlessRuntime()) {
    return getOrCreateClient();
  }

  resetPrismaClient();
  return getOrCreateClient();
}
