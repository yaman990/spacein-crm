import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // receipt PDFs (<=1MB) are sent to a server action as FormData
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
