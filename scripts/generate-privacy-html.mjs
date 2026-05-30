import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrivacyHtml } from "../app/utils/privacy-html.server.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contactEmail = process.env.SUPPORT_EMAIL?.trim() || "";
const html = buildPrivacyHtml(contactEmail);

// Avoid public/privacy.html — it conflicts with React Router prerender output paths.
const outPath = join(root, "public", "legal", "privacy-fallback.html");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log(`Generated ${outPath}`);
