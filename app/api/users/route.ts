import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth" // Import the new utility

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Authenticate the request using the new utility function
    const appUser = await authenticateRequest(request)

    // Fetch users from database
    const { data: users, error: dbError } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })

    if (dbError) {
      logServerError(dbError, { context: "GET /api/users", userId: appUser.sub })
      return NextResponse.json(
        {
          error: "Database Error",
          message: dbError.message,
          stack: new Error().stack,
        },
        { status: 500 },
      )
    }

    logServerInfo("Users fetched successfully", { count: users?.length, userId: appUser.sub })

    return NextResponse.json({
      users: users || [],
      total: users?.length || 0,
    })
  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/users" })
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Authenticate the request using the new utility function
    const appUser = await authenticateRequest(request)

    const body = await request.json()
    const { email, name, role = "user" } = body

    if (!email || !name) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Email and name are required",
          stack: new Error().stack,
        },
        { status: 400 },
      )
    }

    // Create user in database
    const { data: newUser, error: dbError } = await supabase
      .from("users")
      .insert([{ email, name, role }]) // Removed created_by
      .select()
      .single()

    if (dbError) {
      logServerError(dbError, { context: "POST /api/users", userId: appUser.sub })
      return NextResponse.json(
        {
          error: "Database Error",
          message: dbError.message,
          stack: new Error().stack,
        },
        { status: 500 },
      )
    }

    logServerInfo("User created successfully", { newUserId: newUser.id, createdBy: appUser.sub })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    // Handle authentication errors specifically
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "POST /api/users" })
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 },
    )
  }
}
