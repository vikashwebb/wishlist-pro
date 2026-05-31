import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const required = ["public/privacy.html", "app/routes/privacy.jsx"];

const entryServer = fs.readFileSync(
  path.join(root, "app/entry.server.jsx"),
  "utf8",
);

if (!entryServer.includes("privacyHtmlResponse")) {
  console.error("FAIL: entry.server.jsx must short-circuit /privacy via privacyHtmlResponse().");
  process.exit(1);
}
console.log("OK: entry.server.jsx serves /privacy before React Router.");

for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`FAIL: missing ${rel}`);
    process.exit(1);
  }
  console.log(`OK: ${rel}`);
}

console.log("Vercel build verification passed.");
