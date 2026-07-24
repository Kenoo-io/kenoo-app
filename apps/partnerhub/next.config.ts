import type { NextConfig } from "next";
import path from "node:path";

import { getDirectoryPublicEnv } from "@walls/config/directory-public-env";
import {
  getAppDirFromConfigMeta,
  loadMonorepoEnv,
} from "@walls/config/load-root-env";

const appDir = getAppDirFromConfigMeta(import.meta.url);
const monorepoRoot = loadMonorepoEnv(appDir);
const authSrc = path.join(monorepoRoot, "packages/auth/src");

const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_PARTNERHUB_APP_SLUG: process.env.NEXT_PUBLIC_PARTNERHUB_APP_SLUG,
  ...getDirectoryPublicEnv(),
};

const supabaseHostname = (() => {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  env: publicEnv,
  async redirects() {
    return [
      {
        source: "/agents/partnerhub",
        destination: "/",
        permanent: true,
      },
      {
        source: "/agents/partnerhub/deal-board",
        destination: "/deal-board",
        permanent: true,
      },
      {
        source: "/agents/partnerhub/deal-board/:path*",
        destination: "/deal-board/:path*",
        permanent: true,
      },
      {
        source: "/agents/partnerhub/companies",
        destination: "/companies",
        permanent: true,
      },
      {
        source: "/agents/partnerhub/companies/:path*",
        destination: "/companies/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.wallsentertainment.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assest.kenoo.io",
        pathname: "/**",
      },
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "zenquotes-images.s3.us-east-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "zenprospect-production.s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.licdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.ggpht.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.tiktokcdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.tiktokcdn-us.com",
        pathname: "/**",
      },
    ],
  },
  transpilePackages: [
    "@walls/auth",
    "@walls/config",
    "@walls/supabase",
    "@walls/ui",
    "@walls/utils",
  ],
  // Webpack (used by `next dev --webpack`) sometimes fails to resolve
  // package.json "exports" subpaths for workspace packages. Alias them.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@walls/auth/active-account": path.join(authSrc, "active-account.ts"),
      "@walls/auth/middleware": path.join(
        authSrc,
        "protected-app-middleware.ts",
      ),
      "@walls/auth/portal-url": path.join(authSrc, "portal-url.ts"),
      "@walls/auth/post-login-redirect": path.join(
        authSrc,
        "post-login-redirect.ts",
      ),
      "@walls/auth/client": path.join(authSrc, "supabase-client.ts"),
      "@walls/auth/context": path.join(authSrc, "AuthContext.tsx"),
      "@walls/auth/provider": path.join(authSrc, "AuthProvider.tsx"),
      "@walls/auth/mfa": path.join(authSrc, "mfa-assurance.ts"),
      "@walls/auth": path.join(authSrc, "index.ts"),
    };
    return config;
  },
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      "@walls/auth/active-account": path.join(authSrc, "active-account.ts"),
      "@walls/auth/middleware": path.join(
        authSrc,
        "protected-app-middleware.ts",
      ),
      "@walls/auth": path.join(authSrc, "index.ts"),
    },
  },
};

export default nextConfig;
