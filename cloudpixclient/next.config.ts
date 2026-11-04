import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.CLOUDPIX_E2E === "1" ? ".next-e2e" : ".next",
  images: {
    remotePatterns: [new URL(`${(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "https://ik.imagekit.io").replace(/\/$/, "")}/**`)],
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
