import type { NextConfig } from "next";
import crypto from "crypto";
import path from "path";

// Generate a unique build ID on each build (timestamp-based hash)
const buildId = crypto
  .createHash("md5")
  .update(Date.now().toString())
  .digest("hex")
  .slice(0, 8);

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client"],
  generateBuildId: () => buildId,
  turbopack: {
    root: path.resolve(__dirname),
  },
  env: {
    // Exposed to both server & client — used by middleware to detect stale builds
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
