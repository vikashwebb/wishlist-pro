import fs from "node:fs";
import { prepareDatabase } from "../scripts/prepare-database.mjs";
import { bootstrapVercelSqlite } from "./bootstrap-sqlite.server.js";

const globalState = globalThis;
const RUNTIME_DB_PATH = "/tmp/wishlist-pro.sqlite";

if (!globalState.__wishlistDbMigratePromise) {
  globalState.__wishlistDbMigratePromise = Promise.resolve()
    .then(() => {
      bootstrapVercelSqlite();

      if (process.env.VERCEL && fs.existsSync(RUNTIME_DB_PATH)) {
        return;
      }

      prepareDatabase({ skipGenerate: true });
    })
    .catch((error) => {
      globalState.__wishlistDbMigratePromise = undefined;
      console.error("wishlist.db.migrate.error", error);
      throw error;
    });
}

export function ensureDatabaseMigrated() {
  return globalState.__wishlistDbMigratePromise;
}
