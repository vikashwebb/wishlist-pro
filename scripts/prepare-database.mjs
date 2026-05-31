/**
 * Ensures SQLite parent dirs exist and runs Prisma migrations.
 * Vercel build writes prisma/vercel-template.sqlite; runtime copies it to /tmp.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SERVERLESS_DATABASE_URL } from "../app/preload.server.js";
import { getVercelTemplateDatabaseUrl } from "../app/bootstrap-sqlite.server.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveProjectRoot() {
  const candidates = [
    process.cwd(),
    root,
    path.resolve(process.cwd(), ".."),
    "/var/task",
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "prisma", "schema.prisma"))) {
      return dir;
    }
  }

  throw new Error(
    `Could not find prisma/schema.prisma (cwd=${process.cwd()}, scriptRoot=${root})`,
  );
}

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

function resolveDatabaseUrl(projectRoot) {
  if (process.env.VERCEL_BUILD === "true") {
    const url = getVercelTemplateDatabaseUrl(projectRoot);
    process.env.DATABASE_URL = url;
    return url;
  }

  if (process.env.VERCEL) {
    process.env.DATABASE_URL = SERVERLESS_DATABASE_URL;
    return SERVERLESS_DATABASE_URL;
  }

  loadDatabaseUrlFromDotEnv();

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(`DATABASE_URL is not set. Using fallback ${SERVERLESS_DATABASE_URL}.`);
    process.env.DATABASE_URL = SERVERLESS_DATABASE_URL;
    return SERVERLESS_DATABASE_URL;
  }

  return null;
}

/**
 * @param {{ skipGenerate?: boolean }} [options]
 * - skipGenerate: true on Vercel/runtime (generate runs at build). false for local setup.
 */
export function prepareDatabase(options = {}) {
  const projectRoot = resolveProjectRoot();
  const databaseUrl = resolveDatabaseUrl(projectRoot);

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Example: file:../.data/dev.sqlite or file:/tmp/wishlist-pro.sqlite",
    );
  }

  ensureSqliteDirectory(databaseUrl);

  const skipGenerate =
    options.skipGenerate ??
    (process.env.SKIP_PRISMA_GENERATE === "true" ||
      (Boolean(process.env.VERCEL) && process.env.VERCEL_BUILD !== "true"));

  if (!skipGenerate) {
    execSync("npx prisma generate", {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
    });
  }

  execSync("npx prisma migrate deploy", {
    cwd: projectRoot,
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
