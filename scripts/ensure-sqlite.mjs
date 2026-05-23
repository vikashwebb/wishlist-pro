import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, ".data");
const dbPath = path.join(dataDir, "dev.sqlite");
const legacyDbPath = path.join(root, "prisma", "dev.sqlite");
const databaseUrl = `file:${dbPath.replace(/\\/g, "/")}`;

fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
  fs.copyFileSync(legacyDbPath, dbPath);
  console.log("Copied prisma/dev.sqlite → .data/dev.sqlite");
}

if (fs.existsSync(dbPath)) {
  try {
    fs.chmodSync(dbPath, 0o664);
    fs.chmodSync(dataDir, 0o775);
  } catch {
    /* ignore chmod errors on some filesystems */
  }
}

function upsertEnvVar(filePath, key, value) {
  const line = `${key}="${value}"`;
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${line}\n`, "utf8");
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    fs.writeFileSync(filePath, content.replace(pattern, line), "utf8");
  } else {
    fs.writeFileSync(
      filePath,
      `${content.trimEnd()}\n${line}\n`,
      "utf8",
    );
  }
}

upsertEnvVar(path.join(root, ".env"), "DATABASE_URL", databaseUrl);

console.log(`SQLite database: ${dbPath}`);
