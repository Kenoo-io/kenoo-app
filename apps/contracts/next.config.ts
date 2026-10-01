import type { NextConfig } from "next";

import { getAppDirFromConfigMeta, loadMonorepoEnv } from "@walls/config/load-root-env";

const appDir = getAppDirFromConfigMeta(import.meta.url);
const monorepoRoot = loadMonorepoEnv(appDir);

const nextConfig: NextConfig = {
  transpilePackages: ["@walls/config", "@walls/ui", "@walls/utils"],
  turbopack: { root: monorepoRoot },
};

export default nextConfig;
