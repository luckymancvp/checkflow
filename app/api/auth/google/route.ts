import { type NextRequest, NextResponse } from "next/server"
import * as jose from "jose"
import crypto from "crypto"
import { logServerInfo, logServerError } from "@/lib/server-sentry"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const JWT_SECRET = process.env.APP_JWT_SECRET || "9i3TV7kvul3gCa5eBM4V"

export async function GET(request: NextRequest) {
  try {
    // Check environment variables first
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      const errorMsg = "Google OAuth credentials not configured"
      logServerError(new Error(errorMsg), {
        context: "OAuth initiation",
        hasClientId: !!GOOGLE_CLIENT_ID,
        hasClientSecret: !!GOOGLE_CLIENT_SECRET,
      })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=server_config&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    const baseUrl = request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/callback`

    // Generate signed JWT state parameter (no database storage)
    const stateData = {
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
    }

    const secret = new TextEncoder().encode(JWT_SECRET)
    const state = await new jose.SignJWT(stateData)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(secret)

    // Construct Google OAuth URL
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID)
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri)
    googleAuthUrl.searchParams.set("response_type", "code")
    googleAuthUrl.searchParams.set(
      "scope",
      "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive",
    )
    googleAuthUrl.searchParams.set("state", state)
    googleAuthUrl.searchParams.set("access_type", "offline")
    googleAuthUrl.searchParams.set("prompt", "consent")

    logServerInfo("OAuth initiation successful", {
      redirectUri,
      ip: stateData.ip,
      nonce: stateData.nonce,
      googleAuthUrl: googleAuthUrl.toString(),
    })

    return NextResponse.redirect(googleAuthUrl.toString())
  } catch (error) {
    const errorMsg = `OAuth initiation failed: ${(error as Error).message}`
    logServerError(error as Error, {
      context: "GET /api/auth/google",
      stack: (error as Error).stack,
    })
    return NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=oauth_initiation_failed&message=${encodeURIComponent(errorMsg)}`,
    )
  }
}
