// Server-side only Sentry utilities
import * as Sentry from "@sentry/nextjs"

// Initialize Sentry for server-side (this should only run on server)
export const initServerSentry = () => {
  if (typeof window !== "undefined") {
    throw new Error("initServerSentry() can only be used on the server-side")
  }

  Sentry.init({
    dsn:
      process.env.NEXT_PUBLIC_SENTRY_DSN ||
      "https://e424c8d9bb3c83abaae6295260a82d12@o4508647067353088.ingest.us.sentry.io/4509662307942400",
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    debug: process.env.NODE_ENV === "development",
  })
}

export const logServerError = (error: Error, context?: Record<string, any>) => {
  console.error("Server Error:", error.message)
  console.error("Stack:", error.stack)
  if (context) {
    console.error("Context:", context)
  }

  Sentry.captureException(error, {
    extra: context,
  })
}

export const logServerInfo = (message: string, data?: Record<string, any>) => {
  console.log("Server Info:", message, data)

  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
  })
}
