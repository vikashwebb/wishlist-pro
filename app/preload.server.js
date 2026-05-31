import fs from "node:fs";
import path from "node:path";

/** Writable SQLite file on Vercel/Lambda (only /tmp is writable in serverless). */
export const SERVERLESS_SQLITE_PATH = "/tmp/wishlist-pro/data.sqlite";

/** Prisma absolute SQLite URL (three slashes for Linux absolute paths). */
export const SERVERLESS_DATABASE_URL = `file://${SERVERLESS_SQLITE_PATH}`;

export function isServerlessRuntime() {
  return (
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    (process.env.NODE_ENV === "production" &&
      (process.cwd() === "/var/task" || process.cwd().startsWith("/var/task/")))
  );
}

function isInvalidProductionDatabaseUrl(url = "") {
  const trimmed = url.trim();
  if (!trimmed) return true;
  return (
    trimmed.includes(".data/") ||
    trimmed.includes("dev.sqlite") ||
    trimmed.startsWith("file:../") ||
    trimmed.startsWith("file:./") ||
    trimmed.startsWith("file:.\\")
  );
}

/** Create /tmp SQLite file and point DATABASE_URL at it. Safe to call repeatedly. */
export function prepareServerlessSqliteFile() {
  fs.mkdirSync(path.dirname(SERVERLESS_SQLITE_PATH), { recursive: true });

  if (!fs.existsSync(SERVERLESS_SQLITE_PATH)) {
    fs.writeFileSync(SERVERLESS_SQLITE_PATH, Buffer.alloc(0));
  }

  process.env.DATABASE_URL = SERVERLESS_DATABASE_URL;
  return SERVERLESS_DATABASE_URL;
}

export function applyDatabaseUrlForRuntime() {
  if (isServerlessRuntime()) {
    prepareServerlessSqliteFile();
    return process.env.DATABASE_URL;
  }

  if (
    process.env.NODE_ENV === "production" &&
    isInvalidProductionDatabaseUrl(process.env.DATABASE_URL)
  ) {
    console.warn("wishlist.db.preload replacing invalid production DATABASE_URL with /tmp");
    prepareServerlessSqliteFile();
  }

  return process.env.DATABASE_URL;
}

applyDatabaseUrlForRuntime();
