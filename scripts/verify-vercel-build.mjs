import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "build/client/privacy/index.html",
  "app/routes/privacy.jsx",
];

const serverBundle = fs.existsSync(path.join(root, "build/server/index.js"))
  ? "build/server/index.js"
  : fs.readdirSync(path.join(root, "build/server"), { withFileTypes: true })
      .find((entry) => entry.isDirectory() && entry.name.startsWith("nodejs_"));

let serverPath = "build/server/index.js";
if (serverBundle && typeof serverBundle === "object") {
  serverPath = path.join("build/server", serverBundle.name, "index.js");
}

if (fs.existsSync(path.join(root, serverPath))) {
  const serverSource = fs.readFileSync(path.join(root, serverPath), "utf8");
  if (!/privacy/.test(serverSource)) {
    console.error("FAIL: /privacy route missing from server route manifest.");
    process.exit(1);
  }
  console.log("OK: /privacy found in server route manifest.");
}

for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`FAIL: missing ${rel}`);
    process.exit(1);
  }
  console.log(`OK: ${rel}`);
}

console.log("Vercel build verification passed.");
