import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "@/lib/env"

export async function GET(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      const errorMsg = "Google Sheets OAuth credentials not configured on server."
      logServerError(new Error(errorMsg), {
        context: "GET /api/auth/google-sheets-token",
        userId: appUser.sub,
        hasClientId: !!GOOGLE_CLIENT_ID,
        hasClientSecret: !!GOOGLE_CLIENT_SECRET,
      })
      return NextResponse.json(
        { success: false, error: "Server configuration error", message: errorMsg },
        { status: 500 },
      )
    }

    const { data, error: dbError } = await supabase
      .from("google_sheets_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", appUser.sub)
      .limit(1)
      .single()

    if (dbError && dbError.code !== "PGRST116") {
      // PGRST116 means "no rows found", which is handled below.
      // Any other database error will result in a 500.
      logServerError(dbError, { context: "GET /api/auth/google-sheets-token", userId: appUser.sub })
      return NextResponse.json({ success: false, error: "Database error", message: dbError.message }, { status: 500 })
    }

    // If no data is found (PGRST116 error or data is null), return success: true with null tokens.
    if (!data) {
      logServerInfo("No Google Sheets connection configured for user, returning null tokens.", { userId: appUser.sub })
      return NextResponse.json(
        {
          success: true,
          data: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            accessToken: null,
            refreshToken: null,
            expiresAt: null,
            message: "No Google Sheets connection configured yet. Please log in again to grant permissions.",
          },
        },
        { status: 200 },
      ) // Return 200 OK even if no tokens are found
    }

    logServerInfo("Google Sheets tokens fetched successfully for user.", { userId: appUser.sub })
    return NextResponse.json({
      success: true,
      data: {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/auth/google-sheets-token" })
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const body = await request.json()

    const { accessToken, refreshToken, expiresAt } = body

    // Basic validation
    if (!accessToken || !refreshToken || !expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "accessToken, refreshToken, and expiresAt are required.",
        },
        { status: 400 },
      )
    }

    const expiryDate = new Date(expiresAt)
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: "Invalid expiry time", message: "Token expiry time must be a valid future date." },
        { status: 400 },
      )
    }

    const { data, error: dbError } = await supabase
      .from("google_sheets_tokens")
      .upsert(
        {
          user_id: appUser.sub,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }, // Conflict on user_id instead of id
      )
      .select("expires_at, updated_at")
      .single()

    if (dbError) {
      logServerError(dbError, { context: "PUT /api/auth/google-sheets-token", userId: appUser.sub })
      return NextResponse.json({ success: false, error: "Database error", message: dbError.message }, { status: 500 })
    }

    logServerInfo("Google Sheets tokens updated successfully for user.", { userId: appUser.sub })
    return NextResponse.json({
      success: true,
      data: {
        message: "Google Sheets tokens updated successfully",
        expiresAt: data.expires_at,
        updatedAt: data.updated_at,
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "PUT /api/auth/google-sheets-token" })
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: (error as Error).message },
      { status: 500 },
    )
  }
}
