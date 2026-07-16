#!/usr/bin/env node
/**
 * Copies the shared WALLS favicon into each app under `app/icon.png`.
 *
 * Skips any app that already defines its own non-png icon in `app/`:
 *   favicon.ico | icon.ico | icon.jpg | icon.jpeg | icon.tsx | icon.jsx
 *   apple-icon.png | apple-icon.jpg | apple-icon.ico
 *
 * Always overwrites `app/icon.png` and removes a leftover `app/icon.svg`
 * from the previous SVG sync.
 *
 * Usage: pnpm sync:icons
 */

import { copyFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(packageRoot, "../..");
const appsDir = path.join(monorepoRoot, "apps");
const sourceIcon = path.join(packageRoot, "assets", "icon.png");

const OVERRIDE_PATTERNS = [
  /^favicon\.ico$/i,
  /^icon\.(ico|jpe?g|tsx|jsx)$/i,
  /^apple-icon\.(ico|png|jpe?g)$/i,
];

function hasAppIconOverride(appDir) {
  const appRouterDir = path.join(appDir, "app");
  if (!existsSync(appRouterDir)) return false;

  return readdirSync(appRouterDir).some((name) =>
    OVERRIDE_PATTERNS.some((pattern) => pattern.test(name)),
  );
}

function syncAppIcon(appName) {
  const appDir = path.join(appsDir, appName);
  const appRouterDir = path.join(appDir, "app");
  const target = path.join(appRouterDir, "icon.png");
  const legacySvg = path.join(appRouterDir, "icon.svg");

  if (!existsSync(appRouterDir)) {
    console.log(`skip ${appName}: no app/ directory`);
    return;
  }

  if (hasAppIconOverride(appDir)) {
    console.log(`skip ${appName}: custom icon in app/`);
    return;
  }

  copyFileSync(sourceIcon, target);
  if (existsSync(legacySvg)) {
    unlinkSync(legacySvg);
    console.log(`synced ${appName}/app/icon.png (removed icon.svg)`);
    return;
  }

  console.log(`synced ${appName}/app/icon.png`);
}

function main() {
  if (!existsSync(sourceIcon)) {
    console.error(`Missing shared icon at ${sourceIcon}`);
    process.exit(1);
  }

  const apps = readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const app of apps) {
    syncAppIcon(app);
  }
}

main();
