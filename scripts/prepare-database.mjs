/**
 * Ensures SQLite parent dirs exist and runs Prisma migrations.
 * Safe for Vercel/production: uses process.env.DATABASE_URL only (does not overwrite it).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function ensureSqliteDirectory(databaseUrl) {
  if (!databaseUrl?.startsWith("file:")) {
    return;
  }

  const filePath = databaseUrl.replace(/^file:/, "");
  const dir = path.dirname(filePath);

  if (dir && dir !== "." && dir !== "/") {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`Database file: ${filePath}`);
}

function loadDatabaseUrlFromDotEnv() {
  const envPath = path.join(root, ".env");

  if (!fs.existsSync(envPath) || process.env.DATABASE_URL) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  const match = content.match(/^DATABASE_URL=(.+)$/m);

  if (match) {
    process.env.DATABASE_URL = match[1].trim().replace(/^["']|["']$/g, "");
  }
}

function resolveDatabaseUrl() {
  loadDatabaseUrlFromDotEnv();

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    const fallback = "file:/tmp/wishlist-pro.sqlite";
    console.warn(
      `DATABASE_URL is not set. Using fallback ${fallback} (set DATABASE_URL in Vercel for a stable path).`,
    );
    process.env.DATABASE_URL = fallback;
    return fallback;
  }

  return null;
}

/**
 * @param {{ skipGenerate?: boolean }} [options]
 * - skipGenerate: true on Vercel/runtime (generate runs at build). false for local setup.
 */
export function prepareDatabase(options = {}) {
  const databaseUrl = resolveDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Example: file:../.data/dev.sqlite or file:/tmp/wishlist-pro.sqlite",
    );
  }

  ensureSqliteDirectory(databaseUrl);

  const skipGenerate =
    options.skipGenerate ??
    (process.env.SKIP_PRISMA_GENERATE === "true" ||
      Boolean(process.env.VERCEL));

  if (!skipGenerate) {
    execSync("npx prisma generate", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
  }

  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  console.log("Prisma migrations applied.");
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  prepareDatabase();
}
