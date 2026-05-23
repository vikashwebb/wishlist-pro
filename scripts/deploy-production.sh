#!/usr/bin/env bash
# Clean install, regenerate Prisma client, migrate, build, then deploy to Shopify.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "→ Removing node_modules and build artifacts…"
rm -rf node_modules build .react-router

echo "→ Installing dependencies…"
npm ci

echo "→ Prisma generate + migrate + production build (tests + typecheck)…"
npm run build:production

echo "→ Deploying app to Shopify…"
npm run deploy

echo "✓ Deploy complete."
