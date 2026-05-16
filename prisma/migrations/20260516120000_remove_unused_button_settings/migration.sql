-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "wishlistRequiresLogin" BOOLEAN NOT NULL DEFAULT false,
    "wishlistPageTitle" TEXT NOT NULL DEFAULT 'Wishlist',
    "wishlistPageHandle" TEXT NOT NULL DEFAULT 'wishlist',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShopSettings" ("shop", "wishlistRequiresLogin", "wishlistPageTitle", "wishlistPageHandle", "createdAt", "updatedAt")
SELECT "shop", "wishlistRequiresLogin", "wishlistPageTitle", "wishlistPageHandle", "createdAt", "updatedAt" FROM "ShopSettings";
DROP TABLE "ShopSettings";
ALTER TABLE "new_ShopSettings" RENAME TO "ShopSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
