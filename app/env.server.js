import fs from "node:fs";
import {
  VERCEL_DATABASE_URL,
  bootstrapVercelSqlite,
} from "./bootstrap-sqlite.server.js";

export { VERCEL_DATABASE_URL };

function usesLocalDevDatabaseUrl(url) {
  if (!url) return false;
  return (
    url.includes(".data/") ||
    url.includes("dev.sqlite") ||
    url.startsWith("file:../") ||
    url.startsWith("file:./")
  );
}

/**
 * Force a valid DATABASE_URL before Prisma or migrate scripts run.
 * Vercel project env often copies a local `.data/dev.sqlite` path that cannot open in /var/task.
 */
export function ensureProductionDatabaseUrl() {
  if (process.env.VERCEL) {
    return bootstrapVercelSqlite();
  }

  if (
    process.env.NODE_ENV === "production" &&
    usesLocalDevDatabaseUrl(process.env.DATABASE_URL)
  ) {
    console.warn(
      "wishlist.db.env replacing local DATABASE_URL with /tmp fallback for production",
    );
    fs.mkdirSync("/tmp", { recursive: true });
    process.env.DATABASE_URL = VERCEL_DATABASE_URL;
  }

  return process.env.DATABASE_URL;
}

ensureProductionDatabaseUrl();
