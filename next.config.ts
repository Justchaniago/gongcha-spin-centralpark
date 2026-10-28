import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "hanging-photograph-thinks-clips.trycloudflare.com",
    "brian-propecia-deputy-intelligence.trycloudflare.com",
    "ham-rep-sociology-year.trycloudflare.com",
    "*.trycloudflare.com",
  ],
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
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
