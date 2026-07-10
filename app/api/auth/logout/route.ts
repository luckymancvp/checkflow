import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerInfo, logServerError } from "@/lib/server-sentry"

export async function POST(request: NextRequest) {
  try {
    // Get user info before clearing the token (if it was sent in Authorization header)
    let userId: string | null = null
    try {
      const user = await authenticateRequest(request)
      userId = user.sub
    } catch (error) {
      // If token is invalid, we still proceed with logout (client-side clearing)
      logServerInfo("Logout attempted with invalid token or no token provided in header.")
    }

    // Log logout event if we have a valid user
    if (userId) {
      const supabase = createServerClient()
      await supabase.from("auth_logs").insert([
        {
          user_id: userId,
          event_type: "logout",
          ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
          user_agent: request.headers.get("user-agent"),
          success: true,
        },
      ])

      logServerInfo("User logged out", { userId })
    }

    // No need to clear cookie here, client will handle localStorage
    return NextResponse.json({ success: true })
  } catch (error) {
    logServerError(error as Error, { context: "POST /api/auth/logout" })
    return NextResponse.json({ error: "Internal Server Error", message: (error as Error).message }, { status: 500 })
  }
}
