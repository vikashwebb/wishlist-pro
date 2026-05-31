import "./preload.server.js";
import { bootstrapVercelSqlite } from "./bootstrap-sqlite.server.js";
import { SERVERLESS_DATABASE_URL, isServerlessRuntime } from "./preload.server.js";

export { SERVERLESS_DATABASE_URL as VERCEL_DATABASE_URL };

export function ensureProductionDatabaseUrl() {
  if (isServerlessRuntime()) {
    return bootstrapVercelSqlite();
  }

  return process.env.DATABASE_URL;
}

ensureProductionDatabaseUrl();
