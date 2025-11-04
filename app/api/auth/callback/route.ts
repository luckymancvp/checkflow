import { type NextRequest, NextResponse } from "next/server"
import * as jose from "jose"
import { createServerClient } from "@/lib/supabase"
import { logServerInfo, logServerError } from "@/lib/server-sentry"

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const JWT_SECRET = process.env.APP_JWT_SECRET || "9i3TV7kvul3gCa5eBM4V"

interface GoogleTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  error?: string
  error_description?: string
  refresh_token?: string
}

interface GoogleUserProfile {
  id: string
  email: string
  name: string
  picture?: string
  email_verified: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    logServerInfo("OAuth callback received", {
      hasCode: !!code,
      hasState: !!state,
      error,
      errorDescription,
      searchParams: Object.fromEntries(searchParams.entries()),
    })

    // Handle OAuth errors from Google
    if (error) {
      const errorMsg = `Google OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`
      logServerError(new Error(errorMsg), { context: "OAuth callback", error, errorDescription })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=google_oauth_error&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    if (!code || !state) {
      const errorMsg = `Missing OAuth parameters: code=${!!code}, state=${!!state}`
      logServerError(new Error(errorMsg), { context: "OAuth callback" })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=missing_oauth_params&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    // Verify signed JWT state parameter
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload: stateData } = await jose.jwtVerify(state, secret)

      const timeDiff = Date.now() - (stateData.timestamp as number)
      if (timeDiff > 10 * 60 * 1000) {
        throw new Error(`State expired: ${Math.round(timeDiff / 1000)}s old (max 600s)`)
      }

      logServerInfo("State verification successful", {
        stateAge: Math.round(timeDiff / 1000),
        nonce: stateData.nonce,
      })
    } catch (error) {
      const errorMsg = `State verification failed: ${(error as Error).message}`
      logServerError(error as Error, { context: "State verification", state })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=invalid_state&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    // Check environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      const errorMsg = "Google OAuth credentials not configured on server"
      logServerError(new Error(errorMsg), {
        context: "Environment check",
        hasClientId: !!GOOGLE_CLIENT_ID,
        hasClientSecret: !!GOOGLE_CLIENT_SECRET,
      })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=server_config&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    // Exchange authorization code for access token
    const baseUrl = request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/callback`

    logServerInfo("Exchanging code for token", { redirectUri, codeLength: code.length })

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    })

    const tokenData: GoogleTokenResponse = await tokenResponse.json()

    if (!tokenResponse.ok || tokenData.error) {
      const errorMsg = `Token exchange failed: ${tokenData.error || "Unknown error"} - ${tokenData.error_description || "No description"}`
      logServerError(new Error(errorMsg), {
        context: "Token exchange",
        status: tokenResponse.status,
        tokenData,
      })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=token_exchange_failed&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    logServerInfo("Token exchange successful", {
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      hasRefreshToken: !!tokenData.refresh_token,
    })

    // Fetch user profile from Google
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      const errorMsg = `Failed to fetch user profile: ${profileResponse.status} - ${errorText}`
      logServerError(new Error(errorMsg), {
        context: "Profile fetch",
        status: profileResponse.status,
        errorText,
      })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=profile_fetch_failed&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    const profile: GoogleUserProfile = await profileResponse.json()

    logServerInfo("Profile fetched successfully", {
      userId: profile.id,
      email: profile.email,
      emailVerified: profile.email_verified,
      hasName: !!profile.name,
      hasPicture: !!profile.picture,
    })

    // Process user in database
    let supabase: any
    try {
      supabase = createServerClient()
    } catch (error) {
      const errorMsg = `Database connection failed: ${(error as Error).message}`
      logServerError(error as Error, { context: "Database connection" })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=database_connection&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    // Check if user exists
    const { data: existingUsers, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", profile.email)
      .limit(1)

    if (fetchError) {
      const errorMsg = `Database query failed: ${fetchError.message}`
      logServerError(fetchError, {
        context: "Database user fetch",
        email: profile.email,
        code: fetchError.code,
        details: fetchError.details,
      })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=database_query&message=${encodeURIComponent(errorMsg)}`,
      )
    }

    let appUser: any

    if (existingUsers && existingUsers.length > 0) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          name: profile.name,
          avatar_url: profile.picture,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("email", profile.email)
        .select()
        .single()

      if (updateError) {
        const errorMsg = `Failed to update user: ${updateError.message}`
        logServerError(updateError, {
          context: "Database user update",
          email: profile.email,
          code: updateError.code,
          details: updateError.details,
        })
        return NextResponse.redirect(
          `${request.nextUrl.origin}/login?error=user_update_failed&message=${encodeURIComponent(errorMsg)}`,
        )
      }

      appUser = updatedUser
      logServerInfo("User updated successfully", { userId: appUser.id, email: profile.email })
    } else {
      // Create new user
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            email: profile.email,
            name: profile.name,
            avatar_url: profile.picture,
            role: "user",
            last_login: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (insertError) {
        const errorMsg = `Failed to create user: ${insertError.message}`
        logServerError(insertError, {
          context: "Database user creation",
          email: profile.email,
          code: insertError.code,
          details: insertError.details,
        })
        return NextResponse.redirect(
          `${request.nextUrl.origin}/login?error=user_creation_failed&message=${encodeURIComponent(errorMsg)}`,
        )
      }

      appUser = newUser
      logServerInfo("New user created successfully", { userId: appUser.id, email: profile.email })
    }

    if (tokenData.refresh_token && tokenData.scope?.includes("spreadsheets")) {
      try {
        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

        const { error: tokenError } = await supabase.from("google_sheets_tokens").upsert(
          {
            user_id: appUser.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )

        if (tokenError) {
          logServerError(tokenError, {
            context: "Google Sheets token storage",
            userId: appUser.id,
          })
        } else {
          logServerInfo("Google Sheets tokens stored successfully", {
            userId: appUser.id,
            expiresAt,
          })
        }
      } catch (error) {
        logServerError(error as Error, {
          context: "Google Sheets token storage error",
          userId: appUser.id,
        })
      }
    }

    // Generate JWT token for the client
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const appToken = await new jose.SignJWT({
        sub: appUser.id,
        email: appUser.email,
        role: appUser.role,
        name: appUser.name,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("30d")
        .sign(secret)

      // Log authentication event
      const { error: logError } = await supabase.from("auth_logs").insert([
        {
          user_id: appUser.id,
          event_type: "login",
          ip_address: request.ip,
          user_agent: request.headers.get("user-agent"),
          success: true,
        },
      ])

      if (logError) {
        // Don't fail the login for logging errors, just log it
        logServerError(logError, { context: "Auth log insertion", userId: appUser.id })
      }

      logServerInfo("Authentication completed successfully", {
        userId: appUser.id,
        email: profile.email,
        tokenGenerated: true,
      })

      // Redirect to a client-side page with the token in the URL
      // The client-side page will then store the token in localStorage and redirect to dashboard
      const redirectUrlWithToken = `${request.nextUrl.origin}/auth/success?token=${appToken}`
      return NextResponse.redirect(redirectUrlWithToken)
    } catch (error) {
      const errorMsg = `JWT token generation failed: ${(error as Error).message}`
      logServerError(error as Error, { context: "JWT generation", userId: appUser.id })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/login?error=token_generation_failed&message=${encodeURIComponent(errorMsg)}`,
      )
    }
  } catch (error) {
    const errorMsg = `Unexpected authentication error: ${(error as Error).message}`
    logServerError(error as Error, {
      context: "GET /api/auth/callback - unexpected error",
      stack: (error as Error).stack,
    })
    return NextResponse.redirect(
      `${request.nextUrl.origin}/login?error=unexpected_error&message=${encodeURIComponent(errorMsg)}`,
    )
  }
}
