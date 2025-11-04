import { type NextRequest, NextResponse } from "next/server"
import { authenticateRequest, unauthorizedResponse } from "@/lib/auth"
import { createServerClient } from "@/lib/supabase"
import { logServerError, logServerInfo } from "@/lib/server-sentry"

export async function GET(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const { searchParams } = request.nextUrl

    let query = supabase
      .from("sheets")
      .select(
        `
        id,
        name,
        description,
        google_sheet_id,
        tab_name,
        configuration,
        last_access,
        created_at,
        updated_at,
        createdBy:users(id, name, email, avatar_url, role)
      `,
      )
      .order("created_at", { ascending: false })

    const createdByFilter = searchParams.get("createdBy")
    if (createdByFilter) {
      query = query.eq("created_by", createdByFilter)
    }

    const { data: sheets, error: dbError } = await query

    if (dbError) {
      logServerError(dbError, { context: "GET /api/sheets", userId: appUser.sub })
      return NextResponse.json({ success: false, error: "Database error", message: dbError.message }, { status: 500 })
    }

    logServerInfo("Sheets fetched successfully.", { count: sheets?.length, userId: appUser.sub })
    return NextResponse.json({
      success: true,
      data: sheets || [],
      meta: { total: sheets?.length || 0 },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "GET /api/sheets" })
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const appUser = await authenticateRequest(request)
    const supabase = createServerClient()
    const body = await request.json()

    const { name, description, googleSheetId, tabName, configuration } = body

    // Validation rules from docs/api-doc/Google-Sheets-Integration-APIs.md
    if (!name || name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Name is required and max 100 characters." },
        { status: 400 },
      )
    }
    if (!googleSheetId || !/^[a-zA-Z0-9_-]+$/.test(googleSheetId)) {
      // Basic regex for Google Sheet ID format
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Invalid Google Sheet ID format." },
        { status: 400 },
      )
    }
    if (!tabName || tabName.length > 50) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Tab name is required and max 50 characters." },
        { status: 400 },
      )
    }
    if (!configuration || typeof configuration !== "object") {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "Configuration is required and must be an object." },
        { status: 400 },
      )
    }
    // Further configuration validation (e.g., columnMapping, syncStrategy)
    if (
      !configuration.columnMapping ||
      !configuration.columnMapping.itemId ||
      !configuration.columnMapping.status ||
      !configuration.columnMapping.designer
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "Configuration must include columnMapping with itemId, status, and designer.",
        },
        { status: 400 },
      )
    }
    if (!configuration.syncStrategy || !["date-based", "row-based"].includes(configuration.syncStrategy)) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          message: "Sync strategy must be 'date-based' or 'row-based'.",
        },
        { status: 400 },
      )
    }

    // Check if sheet name already exists
    const { data: existingSheet, error: checkError } = await supabase
      .from("sheets")
      .select("id")
      .eq("name", name)
      .limit(1)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      logServerError(checkError, { context: "POST /api/sheets - check existing", userId: appUser.sub })
      return NextResponse.json(
        { success: false, error: "Database error", message: checkError.message },
        { status: 500 },
      )
    }
    if (existingSheet) {
      return NextResponse.json(
        { success: false, error: "Conflict", message: "Sheet name already exists." },
        { status: 409 },
      )
    }

    // Insert new sheet configuration
    const { data: newSheet, error: dbError } = await supabase
      .from("sheets")
      .insert({
        name,
        description,
        google_sheet_id: googleSheetId,
        tab_name: tabName,
        configuration,
        created_by: appUser.sub, // Set created_by to the authenticated user's ID
      })
      .select(
        `
        id,
        name,
        description,
        google_sheet_id,
        tab_name,
        configuration,
        last_access,
        created_at,
        updated_at,
        createdBy:users(id, name, email, avatar_url, role)
      `,
      )
      .single()

    if (dbError) {
      logServerError(dbError, { context: "POST /api/sheets", userId: appUser.sub })
      return NextResponse.json({ success: false, error: "Database error", message: dbError.message }, { status: 500 })
    }

    logServerInfo("Sheet configuration created successfully.", { sheetId: newSheet.id, userId: appUser.sub })
    return NextResponse.json({ success: true, data: newSheet }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("authorization header") || error.message.includes("token"))) {
      return unauthorizedResponse(error.message)
    }
    logServerError(error as Error, { context: "POST /api/sheets" })
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: (error as Error).message },
      { status: 500 },
    )
  }
}
