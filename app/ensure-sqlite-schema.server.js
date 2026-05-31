import { getPrismaClient, syncPrismaClientForServerless } from "./db.server.js";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS "ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "wishlistRequiresLogin" BOOLEAN NOT NULL DEFAULT false,
    "wishlistPageTitle" TEXT NOT NULL DEFAULT 'Wishlist',
    "wishlistPageHandle" TEXT NOT NULL DEFAULT 'wishlist',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Session_shop_idx" ON "Session"("shop")`,
];

/** Create Session/ShopSettings tables without invoking the Prisma CLI (needed on Vercel). */
export async function ensureSqliteSchema() {
  const prisma = syncPrismaClientForServerless();

  for (const statement of SCHEMA_STATEMENTS) {
    await prisma.$executeRawUnsafe(statement);
  }

  await prisma.session.count();
}

export { getPrismaClient };
