import { type NextRequest, NextResponse } from "next/server"
import * as jose from "jose"
import { logServerError } from "@/lib/server-sentry"
import { APP_JWT_SECRET } from "@/lib/env" // Import from new env file

interface AuthenticatedUserPayload extends jose.JWTPayload {
  sub: string // User ID
  email: string
  role: string
  name: string
}

/**
 * Authenticates an incoming NextRequest by verifying the JWT token from the Authorization header.
 * Throws an error if authentication fails.
 * @param request The NextRequest object.
 * @returns The authenticated user's payload.
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUserPayload> {
  // Only look for the token in the Authorization header
  const authHeader = request.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logServerError(new Error("Missing or invalid Authorization header"), { context: "authenticateRequest" })
    throw new Error("Missing or invalid Authorization header")
  }

  const appToken = authHeader.substring(7) // Extract token after "Bearer "

  try {
    const secret = new TextEncoder().encode(APP_JWT_SECRET)
    const { payload } = await jose.jwtVerify(appToken, secret)
    return payload as AuthenticatedUserPayload
  } catch (error) {
    logServerError(error as Error, { context: "authenticateRequest - token verification failed" })
    throw new Error("Invalid or expired authentication token")
  }
}

/**
 * Helper to create an unauthorized response.
 * @param message The error message.
 * @returns A NextResponse with 401 status.
 */
export function unauthorizedResponse(message: string): NextResponse {
  return NextResponse.json(
    {
      error: "Unauthorized",
      message: message,
      stack: new Error().stack,
    },
    { status: 401 },
  )
}
