import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    globalNotFound: true,
  },
};

export default nextConfig;