import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send 10% of transactions for performance monitoring (saves quota)
  tracesSampleRate: 0.1,

  // Session Replay records the page, including any EOB text on screen.
  // It stays off for this portfolio project.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  debug: false,
});

// Required by Sentry to instrument App Router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
