// Client-safe Sentry configuration - NO Supabase usage
let sentryInitialized = false

export const initSentry = () => {
  // Only initialize once and only in browser
  if (sentryInitialized || typeof window === "undefined") {
    return
  }

  // Dynamic import to avoid SSR issues
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn:
          process.env.NEXT_PUBLIC_SENTRY_DSN ||
          "https://e424c8d9bb3c83abaae6295260a82d12@o4508647067353088.ingest.us.sentry.io/4509662307942400",
        environment: process.env.NODE_ENV,
        tracesSampleRate: 1.0,
        debug: process.env.NODE_ENV === "development",
      })
      sentryInitialized = true
    })
    .catch((error) => {
      console.error("Failed to initialize Sentry:", error)
    })
}

export const logError = (error: Error, context?: Record<string, any>) => {
  console.error("Error:", error.message)
  console.error("Stack:", error.stack)
  if (context) {
    console.error("Context:", context)
  }

  // Only use Sentry in browser
  if (typeof window !== "undefined") {
    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureException(error, {
          extra: context,
        })
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      })
  }
}

export const logInfo = (message: string, data?: Record<string, any>) => {
  console.log(message, data)

  // Only use Sentry in browser
  if (typeof window !== "undefined") {
    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.addBreadcrumb({
          message,
          data,
          level: "info",
        })
      })
      .catch(() => {
        // Silently fail if Sentry is not available
      })
  }
}
