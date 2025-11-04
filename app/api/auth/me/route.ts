import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError } from "@/lib/server-sentry"

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const appUser = await authenticateRequest(request)

    // Fetch fresh user data from database
    const supabase = createServerClient()
    const { data: user, error: dbError } = await supabase.from("users").select("*").eq("id", appUser.sub).single()

    if (dbError || !user) {
      return NextResponse.json({ error: "User not found", message: "User data not found in database" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }

    logServerError(error as Error, { context: "GET /api/auth/me" })
    return NextResponse.json({ error: "Internal Server Error", message: (error as Error).message }, { status: 500 })
  }
}
