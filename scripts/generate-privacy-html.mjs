import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrivacyHtml } from "./privacy-html-content.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contactEmail = process.env.SUPPORT_EMAIL?.trim() || "";
const outPath = join(root, "public", "privacy.html");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buildPrivacyHtml(contactEmail), "utf8");
console.log(`Generated ${outPath}${contactEmail ? ` (contact: ${contactEmail})` : ""}`);
