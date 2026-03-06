import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingIncludes: {
    "/": ["./ui_test/**/*"],
    "/ui/[name]": ["./ui_test/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dj",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
