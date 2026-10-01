import type { NextConfig } from "next";

import {
  getAppDirFromConfigMeta,
  loadMonorepoEnv,
} from "@walls/config/load-root-env";

const appDir = getAppDirFromConfigMeta(import.meta.url);
const monorepoRoot = loadMonorepoEnv(appDir);

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_WORKFLOWS_APP_SLUG: process.env.NEXT_PUBLIC_WORKFLOWS_APP_SLUG,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assest.kenoo.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.kenoo.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.wallsentertainment.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  transpilePackages: ["@walls/auth", "@walls/config", "@walls/supabase", "@walls/ui", "@walls/utils"],
  turbopack: { root: monorepoRoot },
};

export default nextConfig;
