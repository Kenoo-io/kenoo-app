import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

/** @param {string} monorepoRoot */
export function isMonorepoDevelopmentMode() {
  return process.env.NODE_ENV !== "production";
}

/** @param {string} monorepoRoot */
export function getMonorepoEnvFilePath(monorepoRoot) {
  const fileName = isMonorepoDevelopmentMode() ? ".env.local" : ".env";
  return path.join(monorepoRoot, fileName);
}

/**
 * Load monorepo env for Node scripts (e.g. `pnpm db:schema`).
 * @param {string} monorepoRoot
 */
export function loadMonorepoEnvFiles(monorepoRoot) {
  const envFile = getMonorepoEnvFilePath(monorepoRoot);

  if (!existsSync(envFile)) {
    const hint = isMonorepoDevelopmentMode()
      ? "Copy .env.example to .env.local and set your values."
      : "Add a root .env file or set environment variables.";
    throw new Error(`[walls/config] ${envFile} not found. ${hint}`);
  }

  loadDotenv({ path: envFile });
}
