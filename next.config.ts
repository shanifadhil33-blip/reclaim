import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
