import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only send 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  debug: false,
});
