import { readFile } from "node:fs/promises";
import path from "node:path";

const THEME_ASSETS_DIR = path.join(
  process.cwd(),
  "extensions/wishlist-theme/assets",
);

export async function readThemeAsset(filename) {
  return readFile(path.join(THEME_ASSETS_DIR, filename), "utf8");
}
