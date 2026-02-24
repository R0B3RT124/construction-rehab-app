import type { NextConfig } from "next";

const isMobileBuild = process.env.NEXT_OUTPUT === 'export';

const nextConfig: NextConfig = {
  // When building for Capacitor mobile, export as static HTML
  // When building for Vercel, leave as server-rendered
  output: isMobileBuild ? 'export' : undefined,
  images: {
    unoptimized: isMobileBuild,
  },
  trailingSlash: isMobileBuild,
};

export default nextConfig;
