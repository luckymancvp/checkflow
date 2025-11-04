import type { NextRequest } from "next/server"
import { logServerError, logServerInfo } from "@/lib/server-sentry"
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "@/lib/env"
import { createServerClient } from "@/lib/supabase"

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const code = searchParams.get("code")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle OAuth errors from Google
    if (error) {
      const errorMsg = `Google OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`
      logServerError(new Error(errorMsg), { context: "Google Sheets OAuth callback", error, errorDescription })

      return new Response(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_ERROR',
                error: '${errorMsg}'
              }, '${request.nextUrl.origin}');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { "Content-Type": "text/html" },
        },
      )
    }

    if (!code) {
      const errorMsg = "No authorization code received from Google"
      logServerError(new Error(errorMsg), { context: "Google Sheets OAuth callback" })

      return new Response(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_ERROR',
                error: '${errorMsg}'
              }, '${request.nextUrl.origin}');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { "Content-Type": "text/html" },
        },
      )
    }

    // Exchange authorization code for tokens
    const redirectUri = `${request.nextUrl.origin}/api/auth/google-sheets-callback`

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
        context: "Google Sheets token exchange",
        status: tokenResponse.status,
        tokenData,
      })

      return new Response(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_ERROR',
                error: '${errorMsg}'
              }, '${request.nextUrl.origin}');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { "Content-Type": "text/html" },
        },
      )
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Store tokens in database
    const supabase = createServerClient()
    const { error: dbError } = await supabase.from("google_sheets_tokens").upsert(
      {
        id: "00000000-0000-0000-0000-000000000001", // Fixed UUID for single row
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || "", // Handle case where refresh_token might not be provided
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )

    if (dbError) {
      logServerError(dbError, { context: "Google Sheets token storage" })

      return new Response(
        `
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GOOGLE_OAUTH_ERROR',
                error: 'Failed to store tokens: ${dbError.message}'
              }, '${request.nextUrl.origin}');
              window.close();
            </script>
          </body>
        </html>
      `,
        {
          headers: { "Content-Type": "text/html" },
        },
      )
    }

    logServerInfo("Google Sheets OAuth completed successfully", {
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      hasRefreshToken: !!tokenData.refresh_token,
    })

    // Return success response that closes popup and notifies parent
    return new Response(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_OAUTH_SUCCESS',
              data: {
                expiresAt: '${expiresAt}',
                scope: '${tokenData.scope}'
              }
            }, '${request.nextUrl.origin}');
            window.close();
          </script>
        </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html" },
      },
    )
  } catch (error) {
    const errorMsg = `Unexpected OAuth error: ${(error as Error).message}`
    logServerError(error as Error, {
      context: "GET /api/auth/google-sheets-callback - unexpected error",
      stack: (error as Error).stack,
    })

    return new Response(
      `
      <html>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_OAUTH_ERROR',
              error: '${errorMsg}'
            }, '${request.nextUrl.origin}');
            window.close();
          </script>
        </body>
      </html>
    `,
      {
        headers: { "Content-Type": "text/html" },
      },
    )
  }
}
