import { type NextRequest, NextResponse } from "next/server"
import * as jose from "jose"
import { createServerClient } from "@/lib/supabase"
import { logServerInfo, logServerError } from "@/lib/server-sentry"

const JWT_SECRET = process.env.APP_JWT_SECRET || "9i3TV7kvul3gCa5eBM4V"

export async function POST(request: NextRequest) {
  // Removed the environment check to allow test login in all environments
  try {
    const supabase = createServerClient()

    const mockUserId = "00000000-0000-0000-0000-000000000001"
    const mockUserEmail = "testuser@example.com"
    const mockUserName = "Test User"
    const mockUserRole = "user"
    const mockUserAvatar = "/placeholder.svg?height=80&width=80"

    // Check if mock user exists in DB, create if not, update if so
    const { data: existingMockUsers, error: fetchMockError } = await supabase
      .from("users")
      .select("*")
      .eq("id", mockUserId)
      .limit(1)

    if (fetchMockError) {
      logServerError(fetchMockError, { context: "Test login - fetch mock user", userId: mockUserId })
      return NextResponse.json({ error: "Database Error", message: fetchMockError.message }, { status: 500 })
    }

    let appUser: any

    if (existingMockUsers && existingMockUsers.length > 0) {
      // Mock user exists: Update last_login and profile if changed
      const { data: updatedMockUser, error: updateMockError } = await supabase
        .from("users")
        .update({
          name: mockUserName,
          email: mockUserEmail,
          avatar_url: mockUserAvatar,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", mockUserId)
        .select()
        .single()

      if (updateMockError) {
        logServerError(updateMockError, { context: "Test login - update mock user", userId: mockUserId })
        return NextResponse.json({ error: "Database Error", message: updateMockError.message }, { status: 500 })
      }
      appUser = updatedMockUser
      logServerInfo("Mock user updated in DB", { userId: mockUserId })
    } else {
      // New mock user: Create user record
      const { data: newMockUser, error: insertMockError } = await supabase
        .from("users")
        .insert([
          {
            id: mockUserId,
            email: mockUserEmail,
            name: mockUserName,
            avatar_url: mockUserAvatar,
            role: mockUserRole,
            last_login: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (insertMockError) {
        logServerError(insertMockError, { context: "Test login - create mock user", userId: mockUserId })
        return NextResponse.json({ error: "Database Error", message: insertMockError.message }, { status: 500 })
      }
      appUser = newMockUser
      logServerInfo("New mock user created in DB", { userId: mockUserId })
    }

    // Generate JWT for mock user
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
    await supabase.from("auth_logs").insert([
      {
        user_id: appUser.id,
        event_type: "login",
        ip_address: request.ip,
        user_agent: request.headers.get("user-agent"),
        success: true,
      },
    ])

    logServerInfo("Test user login successful", { userId: appUser.id })

    // Return the token in the response body instead of setting a cookie
    return NextResponse.json({ success: true, token: appToken })
  } catch (error) {
    logServerError(error as Error, { context: "POST /api/auth/test-login" })
    return NextResponse.json({ error: "Internal Server Error", message: (error as Error).message }, { status: 500 })
  }
}
