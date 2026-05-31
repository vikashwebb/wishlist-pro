import { bootstrapVercelSqlite } from "./bootstrap-sqlite.server.js";
import { ensureSqliteSchema } from "./ensure-sqlite-schema.server.js";

const globalState = globalThis;

if (!globalState.__wishlistDbMigratePromise) {
  globalState.__wishlistDbMigratePromise = Promise.resolve()
    .then(async () => {
      bootstrapVercelSqlite();
      await ensureSqliteSchema();
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
