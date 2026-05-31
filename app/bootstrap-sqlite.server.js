import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SERVERLESS_DATABASE_URL,
  SERVERLESS_SQLITE_PATH,
  isServerlessRuntime,
  prepareServerlessSqliteFile,
} from "./preload.server.js";

/** @deprecated use SERVERLESS_DATABASE_URL */
export const VERCEL_DATABASE_URL = SERVERLESS_DATABASE_URL;

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_FILENAME = "vercel-template.sqlite";

function resolveTemplatePaths() {
  const roots = [
    process.cwd(),
    appRoot,
    "/var/task",
    path.resolve(process.cwd(), ".."),
  ];

  const seen = new Set();
  const paths = [];

  for (const root of roots) {
    const candidate = path.join(root, "prisma", TEMPLATE_FILENAME);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      paths.push(candidate);
    }
  }

  return paths;
}

/** Copy build-time migrated SQLite template into writable /tmp on serverless. */
export function bootstrapVercelSqlite() {
  if (!isServerlessRuntime() || process.env.VERCEL_BUILD === "true") {
    return process.env.DATABASE_URL ?? SERVERLESS_DATABASE_URL;
  }

  prepareServerlessSqliteFile();

  if (fs.existsSync(SERVERLESS_SQLITE_PATH) && fs.statSync(SERVERLESS_SQLITE_PATH).size > 0) {
    return SERVERLESS_DATABASE_URL;
  }

  for (const templatePath of resolveTemplatePaths()) {
    if (!fs.existsSync(templatePath)) {
      continue;
    }

    fs.copyFileSync(templatePath, SERVERLESS_SQLITE_PATH);
    console.log(
      `wishlist.db.bootstrap copied ${templatePath} -> ${SERVERLESS_SQLITE_PATH}`,
    );
    return SERVERLESS_DATABASE_URL;
  }

  console.warn(
    "wishlist.db.bootstrap using empty /tmp database; schema init runs on first request",
  );
  return SERVERLESS_DATABASE_URL;
}

export function getVercelTemplateDatabaseUrl(projectRoot = appRoot) {
  const templatePath = path.join(projectRoot, "prisma", TEMPLATE_FILENAME);
  return `file:${templatePath.replace(/\\/g, "/")}`;
}
