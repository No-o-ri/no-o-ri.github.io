import type { NextConfig } from "next";

// For a project repo (username.github.io/repo-name) set NEXT_PUBLIC_BASE_PATH=/repo-name at build time.
// For username.github.io or a custom domain, leave it unset.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
