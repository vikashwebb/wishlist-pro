import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Writable SQLite path on Vercel serverless (ephemeral per instance). */
export const VERCEL_DATABASE_URL = "file:/tmp/wishlist-pro.sqlite";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_DB_PATH = "/tmp/wishlist-pro.sqlite";
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

/** Copy build-time migrated SQLite template into writable /tmp on Vercel. */
export function bootstrapVercelSqlite() {
  if (!process.env.VERCEL || process.env.VERCEL_BUILD === "true") {
    return VERCEL_DATABASE_URL;
  }

  fs.mkdirSync("/tmp", { recursive: true });
  process.env.DATABASE_URL = VERCEL_DATABASE_URL;

  if (fs.existsSync(RUNTIME_DB_PATH)) {
    return VERCEL_DATABASE_URL;
  }

  for (const templatePath of resolveTemplatePaths()) {
    if (!fs.existsSync(templatePath)) {
      continue;
    }

    fs.copyFileSync(templatePath, RUNTIME_DB_PATH);
    console.log(`wishlist.db.bootstrap copied ${templatePath} -> ${RUNTIME_DB_PATH}`);
    return VERCEL_DATABASE_URL;
  }

  fs.writeFileSync(RUNTIME_DB_PATH, Buffer.alloc(0));
  console.warn(
    "wishlist.db.bootstrap created empty /tmp database; schema init will run on first request",
  );
  return VERCEL_DATABASE_URL;
}

export function getVercelTemplateDatabaseUrl(projectRoot = appRoot) {
  const templatePath = path.join(projectRoot, "prisma", TEMPLATE_FILENAME);
  return `file:${templatePath.replace(/\\/g, "/")}`;
}
