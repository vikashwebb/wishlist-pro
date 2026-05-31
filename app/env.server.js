import fs from "node:fs";

/** Writable SQLite path on Vercel serverless (ephemeral per instance). */
export const VERCEL_DATABASE_URL = "file:/tmp/wishlist-pro.sqlite";

/**
 * Force a valid DATABASE_URL before Prisma or migrate scripts run.
 * Vercel project env often copies a local `.data/dev.sqlite` path that cannot open in /var/task.
 */
export function ensureProductionDatabaseUrl() {
  if (process.env.VERCEL) {
    process.env.DATABASE_URL = VERCEL_DATABASE_URL;
    fs.mkdirSync("/tmp", { recursive: true });
    return process.env.DATABASE_URL;
  }

  if (!process.env.DATABASE_URL?.trim() && process.env.NODE_ENV === "production") {
    process.env.DATABASE_URL = VERCEL_DATABASE_URL;
    fs.mkdirSync("/tmp", { recursive: true });
  }

  return process.env.DATABASE_URL;
}

ensureProductionDatabaseUrl();
