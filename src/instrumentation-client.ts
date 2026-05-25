import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send 10% of transactions for performance monitoring (saves quota)
  tracesSampleRate: 0.1,

  // Capture 100% of sessions that have an error (this is what sends you alerts)
  replaysOnErrorSampleRate: 1.0,

  // Capture 10% of all sessions for general replay (optional, uses quota)
  replaysSessionSampleRate: 0.1,

  integrations: [Sentry.replayIntegration()],

  // Setting this option to true will print useful information to the console while setting up Sentry.
  debug: false,
});

// Required by Sentry to instrument App Router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
