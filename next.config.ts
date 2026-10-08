import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/billing", destination: "/", permanent: false },
      { source: "/pricing", destination: "/", permanent: false },
      { source: "/subscribe", destination: "/", permanent: false },
      { source: "/dashboard/billing", destination: "/", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  serverExternalPackages: ["canvas"],
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during build
  silent: true,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
});
