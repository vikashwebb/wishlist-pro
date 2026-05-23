import { prepareDatabase } from "../scripts/prepare-database.mjs";

const globalState = globalThis;

if (!globalState.__wishlistDbMigratePromise) {
  globalState.__wishlistDbMigratePromise = Promise.resolve()
    .then(() => {
      prepareDatabase();
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
