import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingIncludes: {
    "/ui/[name]": ["./ui_test/**/*"],
  },
};

export default nextConfig;
